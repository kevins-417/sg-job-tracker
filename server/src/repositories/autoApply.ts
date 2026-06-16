import { randomUUID, createHash } from "node:crypto";
import { query } from "../db/pool.js";
import {
  rowToAutoApplyRule, rowToAutoApplyAttempt, rowToSearchProfile,
} from "../db/mappers.js";
import type { AutoApplyRule, AutoApplyAttempt, SearchProfile } from "../types.js";
import type { AutoApplyRuleInput, SearchProfileInput } from "../validators.js";

// Stable identifier for a job across refreshes, so we can remember what the
// user already acted on regardless of when it reappears in the feed.
function jobKey(company: string, title: string, portal: string): string {
  return createHash("sha1").update(`${company}|${title}|${portal}`.toLowerCase()).digest("hex").slice(0, 16);
}

// ---------- Search profiles ----------
export async function listProfiles(): Promise<SearchProfile[]> {
  const { rows } = await query("SELECT * FROM search_profiles ORDER BY created_at ASC");
  return rows.map(rowToSearchProfile);
}

export async function upsertProfile(input: SearchProfileInput): Promise<SearchProfile> {
  const id = input.id || randomUUID();
  const { rows } = await query(
    `INSERT INTO search_profiles (id, name, description)
     VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description
     RETURNING *`,
    [id, input.name, input.description]
  );
  return rowToSearchProfile(rows[0]);
}

export async function deleteProfile(id: string): Promise<boolean> {
  // Detach rules from the profile (keep the rules), then delete the profile.
  await query("UPDATE auto_apply_rules SET profile_id = '' WHERE profile_id = $1", [id]);
  const { rowCount } = await query("DELETE FROM search_profiles WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// ---------- Rule CRUD ----------
export async function listRules(profileId?: string): Promise<AutoApplyRule[]> {
  const { rows } = profileId
    ? await query("SELECT * FROM auto_apply_rules WHERE profile_id = $1 ORDER BY created_at DESC", [profileId])
    : await query("SELECT * FROM auto_apply_rules ORDER BY created_at DESC");
  return rows.map(rowToAutoApplyRule);
}

export async function upsertRule(input: AutoApplyRuleInput): Promise<AutoApplyRule> {
  const id = input.id || randomUUID();
  const requireReview = input.mode === "submit" ? true : input.requireReview;
  const { rows } = await query(
    `INSERT INTO auto_apply_rules
      (id, label, enabled, keywords, industries, portals, min_salary, resume_id,
       mode, require_review, titles, skills, locations, arrangements,
       min_experience, cover_template, profile_id, auto_refresh)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,
             $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16,$17,$18)
     ON CONFLICT (id) DO UPDATE SET
       label=EXCLUDED.label, enabled=EXCLUDED.enabled, keywords=EXCLUDED.keywords,
       industries=EXCLUDED.industries, portals=EXCLUDED.portals,
       min_salary=EXCLUDED.min_salary, resume_id=EXCLUDED.resume_id,
       mode=EXCLUDED.mode, require_review=EXCLUDED.require_review,
       titles=EXCLUDED.titles, skills=EXCLUDED.skills, locations=EXCLUDED.locations,
       arrangements=EXCLUDED.arrangements, min_experience=EXCLUDED.min_experience,
       cover_template=EXCLUDED.cover_template, profile_id=EXCLUDED.profile_id,
       auto_refresh=EXCLUDED.auto_refresh
     RETURNING *`,
    [
      id, input.label, input.enabled, input.keywords,
      JSON.stringify(input.industries), JSON.stringify(input.portals),
      input.minSalary, input.resumeId, input.mode, requireReview,
      JSON.stringify(input.titles), JSON.stringify(input.skills),
      JSON.stringify(input.locations), JSON.stringify(input.arrangements),
      input.minExperience, input.coverTemplate, input.profileId, input.autoRefresh,
    ]
  );
  return rowToAutoApplyRule(rows[0]);
}

export async function deleteRule(id: string): Promise<boolean> {
  const { rowCount } = await query("DELETE FROM auto_apply_rules WHERE id = $1", [id]);
  await query("DELETE FROM auto_apply_attempts WHERE rule_id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// ---------- Queue / attempts (paginated) ----------
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number; pages: number; }

async function paginate(where: string, params: unknown[], page: number, pageSize: number): Promise<Page<AutoApplyAttempt>> {
  const offset = (page - 1) * pageSize;
  const countRes = await query(`SELECT COUNT(*)::int AS c FROM auto_apply_attempts ${where}`, params);
  const total = countRes.rows[0]?.c ?? 0;
  const { rows } = await query(
    `SELECT * FROM auto_apply_attempts ${where}
     ORDER BY fit_score DESC, created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  );
  return {
    items: rows.map(rowToAutoApplyAttempt),
    total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// The review queue: prepared items awaiting a decision (optionally by profile).
export async function listQueue(page = 1, pageSize = 6, profileId?: string): Promise<Page<AutoApplyAttempt>> {
  if (profileId) {
    return paginate(
      "WHERE outcome = 'prepared' AND rule_id IN (SELECT id FROM auto_apply_rules WHERE profile_id = $1)",
      [profileId], page, pageSize
    );
  }
  return paginate("WHERE outcome = 'prepared'", [], page, pageSize);
}

// The applied feed: jobs already submitted, kept visible (greyed) so the user
// sees what's been done. Never re-prepared.
export async function listApplied(page = 1, pageSize = 6): Promise<Page<AutoApplyAttempt>> {
  return paginate("WHERE outcome = 'submitted'", [], page, pageSize);
}

export async function listAttempts(ruleId?: string): Promise<AutoApplyAttempt[]> {
  const { rows } = ruleId
    ? await query("SELECT * FROM auto_apply_attempts WHERE rule_id = $1 ORDER BY fit_score DESC, created_at DESC LIMIT 200", [ruleId])
    : await query("SELECT * FROM auto_apply_attempts ORDER BY fit_score DESC, created_at DESC LIMIT 200");
  return rows.map(rowToAutoApplyAttempt);
}

// ---------------------------------------------------------------------------
// Mock job feed. Replace with a real ToS-compliant source for production.
interface FeedJob {
  company: string; title: string; portal: string; industry: string;
  salaryMin: number; salaryMax: number; location: string;
  arrangement: "on-site" | "hybrid" | "remote";
  experience: number;
  responsibilities: string[];
  url: string;
}

const MOCK_FEED: FeedJob[] = [
  { company: "Lazada", title: "Senior Product Manager, Logistics", portal: "LinkedIn Jobs", industry: "Technology", salaryMin: 9000, salaryMax: 12000, location: "One-North", arrangement: "hybrid", experience: 6, responsibilities: ["roadmap", "stakeholder management", "agile", "data analysis", "logistics"], url: "https://www.linkedin.com/jobs/search/?keywords=senior%20product%20manager%20logistics%20singapore" },
  { company: "OCBC", title: "Product Manager, Digital Banking", portal: "MyCareersFuture", industry: "Finance & Banking", salaryMin: 8000, salaryMax: 11000, location: "Marina Bay", arrangement: "hybrid", experience: 5, responsibilities: ["product strategy", "stakeholder management", "fintech", "agile", "compliance"], url: "https://www.mycareersfuture.gov.sg/search?search=product%20manager%20digital%20banking" },
  { company: "Ninja Van", title: "Group Product Manager", portal: "Glints Singapore", industry: "Logistics & Supply Chain", salaryMin: 7000, salaryMax: 9500, location: "Tai Seng", arrangement: "on-site", experience: 7, responsibilities: ["team leadership", "roadmap", "data analysis", "logistics", "experimentation"], url: "https://glints.com/sg/opportunities/jobs/explore?keyword=group%20product%20manager" },
  { company: "ST Engineering", title: "Lead Product Owner", portal: "JobStreet Singapore", industry: "Manufacturing", salaryMin: 7500, salaryMax: 9800, location: "Jurong", arrangement: "on-site", experience: 6, responsibilities: ["agile", "backlog management", "stakeholder management", "requirements"], url: "https://www.jobstreet.com.sg/lead-product-owner-jobs" },
  { company: "MOH Holdings", title: "Product Manager, HealthTech", portal: "MyCareersFuture", industry: "Healthcare", salaryMin: 6500, salaryMax: 8500, location: "Outram", arrangement: "hybrid", experience: 4, responsibilities: ["product strategy", "user research", "stakeholder management", "healthtech"], url: "https://www.mycareersfuture.gov.sg/search?search=product%20manager%20healthtech" },
  { company: "GovTech", title: "Senior Product Manager, Citizen Services", portal: "MyCareersFuture", industry: "Government", salaryMin: 8500, salaryMax: 11500, location: "Pasir Panjang", arrangement: "hybrid", experience: 6, responsibilities: ["product strategy", "roadmap", "stakeholder management", "user research", "agile"], url: "https://www.mycareersfuture.gov.sg/search?search=senior%20product%20manager%20govtech" },
  { company: "Wise", title: "Product Manager (Remote)", portal: "LinkedIn Jobs", industry: "Finance & Banking", salaryMin: 9000, salaryMax: 13000, location: "Remote (SG)", arrangement: "remote", experience: 5, responsibilities: ["fintech", "product strategy", "experimentation", "data analysis"], url: "https://www.linkedin.com/jobs/search/?keywords=wise%20product%20manager%20singapore" },
  { company: "Razer", title: "Associate Product Manager", portal: "Indeed Singapore", industry: "Technology", salaryMin: 4500, salaryMax: 6000, location: "one-north", arrangement: "on-site", experience: 2, responsibilities: ["roadmap", "agile", "consumer hardware"], url: "https://sg.indeed.com/jobs?q=associate%20product%20manager%20razer" },
  // A few extra so a refresh can surface "new" postings and pagination is visible.
  { company: "Grab", title: "Principal Product Manager, Payments", portal: "LinkedIn Jobs", industry: "Finance & Banking", salaryMin: 12000, salaryMax: 16000, location: "One-North", arrangement: "hybrid", experience: 8, responsibilities: ["product strategy", "fintech", "roadmap", "stakeholder management", "experimentation"], url: "https://www.linkedin.com/jobs/search/?keywords=grab%20principal%20product%20manager%20payments" },
  { company: "Sea Group", title: "Senior Product Manager, Gaming", portal: "Glints Singapore", industry: "Technology", salaryMin: 9500, salaryMax: 13000, location: "Harbourfront", arrangement: "on-site", experience: 6, responsibilities: ["roadmap", "data analysis", "experimentation", "user research"], url: "https://glints.com/sg/opportunities/jobs/explore?keyword=senior%20product%20manager%20gaming" },
  { company: "DBS", title: "VP, Product Management (Wealth)", portal: "MyCareersFuture", industry: "Finance & Banking", salaryMin: 11000, salaryMax: 15000, location: "Marina Bay", arrangement: "hybrid", experience: 8, responsibilities: ["product strategy", "stakeholder management", "fintech", "compliance", "roadmap"], url: "https://www.mycareersfuture.gov.sg/search?search=vp%20product%20management%20wealth" },
  { company: "Shopee", title: "Product Manager, Logistics Tech", portal: "LinkedIn Jobs", industry: "Logistics & Supply Chain", salaryMin: 8000, salaryMax: 10500, location: "Science Park", arrangement: "hybrid", experience: 5, responsibilities: ["roadmap", "logistics", "data analysis", "stakeholder management"], url: "https://www.linkedin.com/jobs/search/?keywords=shopee%20product%20manager%20logistics" },
];

// In a real build the feed would change between fetches. To simulate a daily
// refresh surfacing different postings, rotate the slice of the feed we look at
// based on the day of the year. Applied/dismissed jobs are always excluded.
function feedForToday(): FeedJob[] {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const day = Math.floor((Date.now() - start.getTime()) / 86400000);
  const rotate = day % MOCK_FEED.length;
  return [...MOCK_FEED.slice(rotate), ...MOCK_FEED.slice(0, rotate)];
}

// ---------------------------------------------------------------------------
// Fit scoring (unchanged logic).
interface Scored { score: number; reasons: string[]; }
function lc(s: string) { return s.toLowerCase(); }
function anyIncludes(haystack: string, needles: string[]) {
  const h = lc(haystack);
  return needles.some((n) => h.includes(lc(n)));
}

function scoreJob(rule: AutoApplyRule, job: FeedJob): Scored | null {
  let earned = 0, possible = 0;
  const reasons: string[] = [];

  if (rule.minSalary != null) {
    if (job.salaryMax < rule.minSalary) return null;
    possible += 25; earned += 25;
    reasons.push(`Pays up to S$${job.salaryMax.toLocaleString()} — meets your S$${rule.minSalary.toLocaleString()} floor`);
  }
  if (rule.titles.length) {
    possible += 25;
    const hit = rule.titles.find((t) => lc(job.title).includes(lc(t)));
    if (hit) { earned += 25; reasons.push(`Title matches "${hit}"`); }
    else reasons.push(`Title "${job.title}" is outside your target titles`);
  }
  if (rule.industries.length) {
    possible += 15;
    if (rule.industries.includes(job.industry)) { earned += 15; reasons.push(`Industry: ${job.industry}`); }
    else reasons.push(`Industry ${job.industry} not in your list`);
  }
  if (rule.skills.length) {
    possible += 20;
    const hits = rule.skills.filter((s) => job.responsibilities.some((r) => lc(r).includes(lc(s)) || lc(s).includes(lc(r))));
    if (hits.length) { earned += Math.round((hits.length / rule.skills.length) * 20); reasons.push(`Matches ${hits.length}/${rule.skills.length} of your skills: ${hits.join(", ")}`); }
    else reasons.push("None of your listed skills appear in the responsibilities");
  }
  if (rule.locations.length) {
    possible += 8;
    if (anyIncludes(job.location, rule.locations)) { earned += 8; reasons.push(`Location: ${job.location}`); }
    else reasons.push(`Location ${job.location} not in your preferred areas`);
  }
  if (rule.arrangements.length) {
    possible += 7;
    if (rule.arrangements.includes(job.arrangement)) { earned += 7; reasons.push(`${job.arrangement} — matches your preference`); }
    else reasons.push(`${job.arrangement} doesn't match your arrangement preference`);
  }
  if (rule.minExperience != null) {
    possible += 5;
    if (job.experience >= rule.minExperience) { earned += 5; reasons.push(`Seniority (~${job.experience}y) fits your ${rule.minExperience}y+ target`); }
    else reasons.push(`Role looks junior (~${job.experience}y) vs your ${rule.minExperience}y target`);
  }
  if (rule.keywords.trim() && !rule.titles.length) {
    const terms = rule.keywords.split(",").map((t) => t.trim()).filter(Boolean);
    possible += 20;
    if (terms.length && anyIncludes(`${job.title} ${job.company}`, terms)) { earned += 20; reasons.push("Keyword match in title/company"); }
  }
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  return { score, reasons };
}

function generateCoverLetter(rule: AutoApplyRule, job: FeedJob, matchedSkills: string[]): string {
  const skillPhrase = matchedSkills.length ? matchedSkills.slice(0, 3).join(", ") : job.responsibilities.slice(0, 3).join(", ");
  const styleNote = rule.coverTemplate.trim() ? `\n\n[Style note for you: ${rule.coverTemplate.trim()} — adjust the draft below to match.]` : "";
  const arrText = job.arrangement === "remote" ? ", working effectively in a remote setup" : job.arrangement === "hybrid" ? " in your hybrid setup" : " on-site with your team";
  return `Dear ${job.company} Hiring Team,

I'm writing to express my strong interest in the ${job.title} role. The position's focus on ${skillPhrase} maps closely to where I've spent my career, and ${job.company}'s work in ${job.industry.toLowerCase()} is exactly the kind of environment where I do my best work.

In my current role I've owned product direction end to end — shaping roadmaps, aligning stakeholders, and using data to decide what to build next. I'm drawn to this role because it combines ${skillPhrase} with real ownership, and I'd welcome the chance to bring that experience to your team${arrText}.

I'd be glad to discuss how my background fits what you're building. Thank you for your consideration.

Sincerely,
[Your name]${styleNote}

— — —
Draft prepared automatically from your matching profile. Review and personalise before submitting on ${job.portal}.`;
}

// ---------------------------------------------------------------------------
const MATCH_THRESHOLD = 50;

export interface RunResult {
  ruleId: string;
  enabled: boolean;
  considered: number;
  matched: number;
  prepared: number;
  belowThreshold: number;
  skippedApplied: number;
  topScore: number;
  notice: string;
}

// Set of job keys the user already acted on (applied or dismissed) so we never
// re-prepare them on a refresh.
async function seenKeys(): Promise<Set<string>> {
  const { rows } = await query("SELECT job_key FROM seen_jobs");
  return new Set(rows.map((r: any) => r.job_key));
}

export async function runRule(ruleId: string): Promise<RunResult> {
  const { rows } = await query("SELECT * FROM auto_apply_rules WHERE id = $1", [ruleId]);
  if (!rows[0]) throw new Error("Rule not found");
  const rule = rowToAutoApplyRule(rows[0]);

  const result: RunResult = {
    ruleId, enabled: rule.enabled, considered: 0, matched: 0,
    prepared: 0, belowThreshold: 0, skippedApplied: 0, topScore: 0, notice: "",
  };

  if (!rule.enabled) {
    result.notice = "Rule is disabled. Enable it to prepare applications.";
    return result;
  }

  // Refresh: clear previous prepared (undecided) items for this rule.
  await query("DELETE FROM auto_apply_attempts WHERE rule_id = $1 AND outcome = 'prepared'", [ruleId]);

  const feed = feedForToday();
  const seen = await seenKeys();
  result.considered = feed.length;

  for (const job of feed) {
    // Skip jobs the user has already applied to or dismissed — they don't come
    // back unless removed from the application list.
    if (seen.has(jobKey(job.company, job.title, job.portal))) { result.skippedApplied++; continue; }

    const scored = scoreJob(rule, job);
    if (scored === null) continue;
    result.matched++;
    result.topScore = Math.max(result.topScore, scored.score);
    if (scored.score < MATCH_THRESHOLD) { result.belowThreshold++; continue; }

    const matchedSkills = rule.skills.filter((s) => job.responsibilities.some((r) => lc(r).includes(lc(s)) || lc(s).includes(lc(r))));
    const cover = generateCoverLetter(rule, job, matchedSkills);

    await query(
      `INSERT INTO auto_apply_attempts
        (id, rule_id, company, title, portal, outcome, reason, application_id,
         fit_score, fit_reasons, cover_letter, job_url, salary_min, salary_max,
         location, arrangement)
       VALUES ($1,$2,$3,$4,$5,'prepared',$6,NULL,$7,$8::jsonb,$9,$10,$11,$12,$13,$14)`,
      [
        randomUUID(), ruleId, job.company, job.title, job.portal,
        "Prepared for your review.", scored.score, JSON.stringify(scored.reasons),
        cover, job.url, job.salaryMin, job.salaryMax, job.location, job.arrangement,
      ]
    );
    result.prepared++;
  }

  await query("UPDATE auto_apply_rules SET last_run_at = now() WHERE id = $1", [ruleId]);

  result.notice = result.prepared > 0
    ? `Prepared ${result.prepared} application(s) for your review.${result.skippedApplied ? ` Skipped ${result.skippedApplied} you've already handled.` : ""}`
    : result.matched > 0
      ? "Some jobs matched but scored below the fit threshold. Loosen your profile to see them."
      : result.skippedApplied > 0
        ? "All matching jobs have already been applied to or dismissed."
        : "No jobs matched this profile. Try widening titles, industries, or the salary floor.";
  return result;
}

// Run every enabled rule whose auto-refresh is on and which hasn't run in ~24h.
// Called on server start and by a daily timer.
export async function runDueRules(): Promise<{ ran: number; prepared: number }> {
  const { rows } = await query(
    `SELECT * FROM auto_apply_rules
     WHERE enabled = true AND auto_refresh = true
       AND (last_run_at IS NULL OR last_run_at < now() - interval '24 hours')`
  );
  let prepared = 0;
  for (const r of rows) {
    try {
      const res = await runRule(r.id);
      prepared += res.prepared;
    } catch (e) {
      console.error("[auto-refresh] rule failed", r.id, e);
    }
  }
  if (rows.length) console.log(`[auto-refresh] ran ${rows.length} rule(s), prepared ${prepared} item(s)`);
  return { ran: rows.length, prepared };
}

// ---------- Queue actions ----------
export async function updateCoverLetter(attemptId: string, coverLetter: string): Promise<AutoApplyAttempt | null> {
  const { rows } = await query(
    "UPDATE auto_apply_attempts SET cover_letter = $2 WHERE id = $1 AND outcome = 'prepared' RETURNING *",
    [attemptId, coverLetter]
  );
  return rows[0] ? rowToAutoApplyAttempt(rows[0]) : null;
}

// Mark submitted-by-user, create a tracked application, AND record the job as
// seen so refreshes never surface it again (until the application is deleted).
export async function markSubmitted(attemptId: string): Promise<{ attempt: AutoApplyAttempt; applicationId: string } | null> {
  const { rows } = await query("SELECT * FROM auto_apply_attempts WHERE id = $1", [attemptId]);
  if (!rows[0]) return null;
  const a = rowToAutoApplyAttempt(rows[0]);

  const { rows: rr } = await query("SELECT * FROM auto_apply_rules WHERE id = $1", [a.ruleId]);
  const rule = rr[0] ? rowToAutoApplyRule(rr[0]) : null;

  const today = new Date().toISOString().slice(0, 10);
  const appId = randomUUID();
  await query(
    `INSERT INTO applications (
      id, date_applied, company, title, job_function, industry, portal,
      recruiter_name, recruiter_email, recruiter_phone, salary_min, salary_max,
      location, employment_type, status, job_description, resume_id,
      next_action_date, timeline, interviews
    ) VALUES (
      $1,$2,$3,$4,'','',$5,'','','',$6,$7,$8,'Full-time','Applied',$9,$10,
      NULL,$11::jsonb,'[]'::jsonb
    )`,
    [
      appId, today, a.company, a.title, a.portal, a.salaryMin, a.salaryMax, a.location,
      `Submitted via review queue (fit ${a.fitScore}%). Cover letter on file.`,
      rule?.resumeId ?? "",
      JSON.stringify([{ id: randomUUID(), date: today, label: `Submitted on ${a.portal} after review (fit ${a.fitScore}%)` }]),
    ]
  );

  // Remember this job so it isn't re-prepared on future refreshes.
  const key = jobKey(a.company, a.title, a.portal);
  await query(
    `INSERT INTO seen_jobs (job_key, status, company, title, portal, application_id)
     VALUES ($1,'applied',$2,$3,$4,$5)
     ON CONFLICT (job_key) DO UPDATE SET status='applied', application_id=EXCLUDED.application_id`,
    [key, a.company, a.title, a.portal, appId]
  );

  const { rows: up } = await query(
    "UPDATE auto_apply_attempts SET outcome = 'submitted', application_id = $2 WHERE id = $1 RETURNING *",
    [attemptId, appId]
  );
  return { attempt: rowToAutoApplyAttempt(up[0]), applicationId: appId };
}

export async function dismissAttempt(attemptId: string): Promise<AutoApplyAttempt | null> {
  const { rows } = await query("SELECT * FROM auto_apply_attempts WHERE id = $1", [attemptId]);
  if (!rows[0]) return null;
  const a = rowToAutoApplyAttempt(rows[0]);
  // Remember dismissals too, so they don't reappear on refresh.
  const key = jobKey(a.company, a.title, a.portal);
  await query(
    `INSERT INTO seen_jobs (job_key, status, company, title, portal)
     VALUES ($1,'dismissed',$2,$3,$4)
     ON CONFLICT (job_key) DO UPDATE SET status='dismissed'`,
    [key, a.company, a.title, a.portal]
  );
  const { rows: up } = await query(
    "UPDATE auto_apply_attempts SET outcome = 'dismissed' WHERE id = $1 RETURNING *",
    [attemptId]
  );
  return rowToAutoApplyAttempt(up[0]);
}

// When a tracked application is deleted elsewhere, free its job so it can be
// surfaced again. Called from the applications repository.
export async function forgetSeenByApplication(applicationId: string): Promise<void> {
  await query("DELETE FROM seen_jobs WHERE application_id = $1", [applicationId]);
}
