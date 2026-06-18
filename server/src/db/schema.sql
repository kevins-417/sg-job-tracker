-- Singapore Job Application Tracker — schema
-- Run via: npm run db:migrate

CREATE TABLE IF NOT EXISTS companies (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  industry    TEXT DEFAULT '',
  website     TEXT DEFAULT '',
  glassdoor   TEXT DEFAULT '',
  hq          TEXT DEFAULT '',
  sg_office   TEXT DEFAULT '',
  employees   TEXT DEFAULT '',
  notes       TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS resumes (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  version         TEXT DEFAULT '',
  target_industry TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS applications (
  id               TEXT PRIMARY KEY,
  date_applied     DATE NOT NULL,
  company          TEXT NOT NULL,
  title            TEXT NOT NULL,
  job_function     TEXT DEFAULT '',
  industry         TEXT DEFAULT '',
  portal           TEXT DEFAULT '',
  recruiter_name   TEXT DEFAULT '',
  recruiter_email  TEXT DEFAULT '',
  recruiter_phone  TEXT DEFAULT '',
  salary_min       INTEGER,
  salary_max       INTEGER,
  location         TEXT DEFAULT '',
  employment_type  TEXT DEFAULT '',
  status           TEXT DEFAULT 'Applied',
  job_description  TEXT DEFAULT '',
  resume_id        TEXT DEFAULT '',
  next_action_date DATE,
  -- timeline and interviews are denormalised as JSONB: they are always read
  -- and written together with the parent application, so separate tables would
  -- add joins without buying us query flexibility we need.
  timeline         JSONB NOT NULL DEFAULT '[]'::jsonb,
  interviews       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_portal ON applications (portal);
CREATE INDEX IF NOT EXISTS idx_applications_date ON applications (date_applied);

-- ---------------------------------------------------------------------------
-- Auto-apply (Phase 2 preview).
-- The product spec lists "automatic job scraping from Singapore portals" as a
-- Phase 2 enhancement and recruiter-email parsing as Phase 3. It does NOT ask
-- for unattended submission of applications to third-party portals. These
-- tables therefore model auto-apply as a RULE-DRIVEN QUEUE that a human
-- reviews: rules describe what the user is willing to auto-draft, and attempts
-- record what the (stubbed) matcher proposed. No external submission happens.
CREATE TABLE IF NOT EXISTS auto_apply_rules (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  keywords        TEXT DEFAULT '',          -- comma-separated match terms (title/company)
  industries      JSONB NOT NULL DEFAULT '[]'::jsonb,
  portals         JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_salary      INTEGER,                  -- monthly SGD floor
  resume_id       TEXT DEFAULT '',
  -- "draft" = create a Draft application for review (default, safe).
  -- "submit" = reserved for a future integration; the server refuses to act
  -- on this mode and logs why.
  mode            TEXT NOT NULL DEFAULT 'draft',
  require_review  BOOLEAN NOT NULL DEFAULT true,
  -- Richer matching profile (prepare-and-review queue):
  titles          JSONB NOT NULL DEFAULT '[]'::jsonb,  -- desired job titles / types
  skills          JSONB NOT NULL DEFAULT '[]'::jsonb,  -- responsibilities / must-have skills
  locations       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- preferred SG locations
  arrangements    JSONB NOT NULL DEFAULT '[]'::jsonb,  -- on-site | hybrid | remote
  min_experience  INTEGER,                             -- years
  cover_template  TEXT DEFAULT '',                     -- optional cover-letter style note
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auto_apply_attempts (
  id              TEXT PRIMARY KEY,
  rule_id         TEXT NOT NULL,
  company         TEXT DEFAULT '',
  title           TEXT DEFAULT '',
  portal          TEXT DEFAULT '',
  -- prepared | submitted | dismissed | skipped | blocked
  outcome         TEXT NOT NULL DEFAULT 'prepared',
  reason          TEXT DEFAULT '',
  application_id  TEXT,                      -- set when a Draft was created
  -- Prepared-application payload for the review queue:
  fit_score       INTEGER DEFAULT 0,         -- 0..100
  fit_reasons     JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_letter    TEXT DEFAULT '',
  job_url         TEXT DEFAULT '',           -- where the user goes to submit
  salary_min      INTEGER,
  salary_max      INTEGER,
  location        TEXT DEFAULT '',
  arrangement     TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_rule ON auto_apply_attempts (rule_id);
CREATE INDEX IF NOT EXISTS idx_attempts_outcome ON auto_apply_attempts (outcome);

-- ---------------------------------------------------------------------------
-- Safe upgrades for databases created by an earlier version. These are
-- idempotent: ADD COLUMN IF NOT EXISTS does nothing if the column is already
-- there, so re-running the migration upgrades an existing DB without data loss.
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS titles JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS locations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS arrangements JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS min_experience INTEGER;
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS cover_template TEXT DEFAULT '';

ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS fit_score INTEGER DEFAULT 0;
ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS fit_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS cover_letter TEXT DEFAULT '';
ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS job_url TEXT DEFAULT '';
ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS salary_min INTEGER;
ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS salary_max INTEGER;
ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS arrangement TEXT DEFAULT '';

-- ---------------------------------------------------------------------------
-- Search profiles: a named container so the user can keep separate searches
-- (e.g. "Senior PM — Fintech" vs "Product Lead — Govtech"), each with its own
-- rules. A rule belongs to at most one profile.
CREATE TABLE IF NOT EXISTS search_profiles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link rules to a profile, and track refresh scheduling.
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS profile_id TEXT DEFAULT '';
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS auto_refresh BOOLEAN NOT NULL DEFAULT true;

-- Remember which jobs the user has applied to (or dismissed), keyed by a stable
-- job identifier, so a refresh never re-prepares them. This is what makes
-- "don't show applied roles again unless removed" work across refreshes.
CREATE TABLE IF NOT EXISTS seen_jobs (
  job_key     TEXT PRIMARY KEY,          -- stable hash of company+title+portal
  status      TEXT NOT NULL DEFAULT 'applied',  -- applied | dismissed
  company     TEXT DEFAULT '',
  title       TEXT DEFAULT '',
  portal      TEXT DEFAULT '',
  application_id TEXT,                    -- the tracked application, if applied
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rules_profile ON auto_apply_rules (profile_id);
CREATE INDEX IF NOT EXISTS idx_seen_status ON seen_jobs (status);

-- ===========================================================================
-- Multi-user (mock-up) support.
--
-- Demonstration-grade only: users are picked from a list by name, with NO
-- password, NO email verification, NO session security. This is fine for a
-- demo where you want separate data per person on one deployment. It is NOT
-- safe for real users handling real job-search data — see README.
--
-- Every user-owned table gets a user_id. Rows with user_id = '' (empty) are
-- "legacy/shared" and remain visible so existing data isn't orphaned on upgrade.
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  headline    TEXT DEFAULT '',          -- e.g. "Senior PM" — shown in the switcher
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE applications      ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE companies         ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE resumes           ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE search_profiles   ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE auto_apply_rules  ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE auto_apply_attempts ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE seen_jobs         ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_apps_user ON applications (user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user ON companies (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON search_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user ON auto_apply_rules (user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON auto_apply_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_seen_user ON seen_jobs (user_id);

-- seen_jobs was keyed by job_key alone; for multi-user it must be unique per
-- (user, job). Recreate the key if needed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'seen_jobs' AND constraint_type = 'PRIMARY KEY'
      AND constraint_name = 'seen_jobs_pkey'
  ) THEN
    BEGIN
      ALTER TABLE seen_jobs DROP CONSTRAINT seen_jobs_pkey;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- Composite uniqueness so the same job can be tracked separately per user.
CREATE UNIQUE INDEX IF NOT EXISTS uq_seen_user_job ON seen_jobs (user_id, job_key);

-- New filter columns on rules (broader selection pool + sharper matching).
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS company_sizes JSONB NOT NULL DEFAULT '[]'::jsonb;  -- startup|mid|large
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS freshness TEXT DEFAULT 'any';                       -- 24h|week|month|any
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS seniority JSONB NOT NULL DEFAULT '[]'::jsonb;        -- junior|mid|senior|lead
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS include_keywords TEXT DEFAULT '';
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS exclude_keywords TEXT DEFAULT '';
ALTER TABLE auto_apply_rules ADD COLUMN IF NOT EXISTS must_have_skills JSONB NOT NULL DEFAULT '[]'::jsonb; -- hard requirement
