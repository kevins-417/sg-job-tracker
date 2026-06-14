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
  keywords        TEXT DEFAULT '',          -- comma-separated match terms
  industries      JSONB NOT NULL DEFAULT '[]'::jsonb,
  portals         JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_salary      INTEGER,                  -- monthly SGD floor
  resume_id       TEXT DEFAULT '',
  -- "draft" = create a Draft application for review (default, safe).
  -- "submit" = reserved for a future integration; the server refuses to act
  -- on this mode and logs why.
  mode            TEXT NOT NULL DEFAULT 'draft',
  require_review  BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auto_apply_attempts (
  id              TEXT PRIMARY KEY,
  rule_id         TEXT NOT NULL,
  company         TEXT DEFAULT '',
  title           TEXT DEFAULT '',
  portal          TEXT DEFAULT '',
  -- queued | drafted | skipped | blocked
  outcome         TEXT NOT NULL DEFAULT 'queued',
  reason          TEXT DEFAULT '',
  application_id  TEXT,                      -- set when a Draft was created
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_rule ON auto_apply_attempts (rule_id);
