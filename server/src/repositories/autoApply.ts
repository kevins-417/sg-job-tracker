import { randomUUID, createHash } from "node:crypto";
import { query } from "../db/pool.js";
import {
  rowToAutoApplyRule, rowToAutoApplyAttempt, rowToSearchProfile,
} from "../db/mappers.js";
import type { AutoApplyRule, AutoApplyAttempt, SearchProfile } from "../types.js";
import type { AutoApplyRuleInput, SearchProfileInput } from "../validators.js";

function jobKey(company: string, title: string, portal: string): string {
  return createHash("sha1").update(`${company}|${title}|${portal}`.toLowerCase()).digest("hex").slice(0, 16);
}

// ---------- Search profiles (per-user) ----------
export async function listProfiles(userId: string): Promise<SearchProfile[]> {
  const { rows } = await query("SELECT * FROM search_profiles WHERE (user_id = $1 OR user_id = '') ORDER BY created_at ASC", [userId]);
  return rows.map(rowToSearchProfile);
}

export async function upsertProfile(input: SearchProfileInput, userId: string): Promise<SearchProfile> {
  const id = input.id || randomUUID();
  const { rows } = await query(
    `INSERT INTO search_profiles (id, name, description, user_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description
     RETURNING *`,
    [id, input.name, input.description, userId]
  );
  return rowToSearchProfile(rows[0]);
}

export async function deleteProfile(id: string, userId: string): Promise<boolean> {
  await query("UPDATE auto_apply_rules SET profile_id = '' WHERE profile_id = $1 AND (user_id = $2 OR user_id = '')", [id, userId]);
  const { rowCount } = await query("DELETE FROM search_profiles WHERE id = $1 AND (user_id = $2 OR user_id = '')", [id, userId]);
  return (rowCount ?? 0) > 0;
}

// ---------- Rule CRUD (per-user) ----------
export async function listRules(userId: string, profileId?: string): Promise<AutoApplyRule[]> {
  const { rows } = profileId
    ? await query("SELECT * FROM auto_apply_rules WHERE profile_id = $1 AND (user_id = $2 OR user_id = '') ORDER BY created_at DESC", [profileId, userId])
    : await query("SELECT * FROM auto_apply_rules WHERE (user_id = $1 OR user_id = '') ORDER BY created_at DESC", [userId]);
  return rows.map(rowToAutoApplyRule);
}

export async function upsertRule(input: AutoApplyRuleInput, userId: string): Promise<AutoApplyRule> {
  const id = input.id || randomUUID();
  const requireReview = input.mode === "submit" ? true : input.requireReview;
  const { rows } = await query(
    `INSERT INTO auto_apply_rules
      (id, label, enabled, keywords, industries, portals, min_salary, resume_id,
       mode, require_review, titles, skills, locations, arrangements,
       min_experience, cover_template, profile_id, auto_refresh,
       company_sizes, freshness, seniority, include_keywords, exclude_keywords,
       must_have_skills, user_id)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,
             $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16,$17,$18,
             $19::jsonb,$20,$21::jsonb,$22,$23,$24::jsonb,$25)
     ON CONFLICT (id) DO UPDATE SET
       label=EXCLUDED.label, enabled=EXCLUDED.enabled, keywords=EXCLUDED.keywords,
       industries=EXCLUDED.industries, portals=EXCLUDED.portals,
       min_salary=EXCLUDED.min_salary, resume_id=EXCLUDED.resume_id,
       mode=EXCLUDED.mode, require_review=EXCLUDED.require_review,
       titles=EXCLUDED.titles, skills=EXCLUDED.skills, locations=EXCLUDED.locations,
       arrangements=EXCLUDED.arrangements, min_experience=EXCLUDED.min_experience,
       cover_template=EXCLUDED.cover_template, profile_id=EXCLUDED.profile_id,
       auto_refresh=EXCLUDED.auto_refresh, company_sizes=EXCLUDED.company_sizes,
       freshness=EXCLUDED.freshness, seniority=EXCLUDED.seniority,
       include_keywords=EXCLUDED.include_keywords, exclude_keywords=EXCLUDED.exclude_keywords,
       must_have_skills=EXCLUDED.must_have_skills
     RETURNING *`,
    [
      id, input.label, input.enabled, input.keywords,
      JSON.stringify(input.industries), JSON.stringify(input.portals),
      input.minSalary, input.resumeId, input.mode, requireReview,
      JSON.stringify(input.titles), JSON.stringify(input.skills),
      JSON.stringify(input.locations), JSON.stringify(input.arrangements),
      input.minExperience, input.coverTemplate, input.profileId, input.autoRefresh,
      JSON.stringify(input.companySizes), input.freshness, JSON.stringify(input.seniority),
      input.includeKeywords, input.excludeKeywords, JSON.stringify(input.mustHaveSkills),
      userId,
    ]
  );
  return rowToAutoApplyRule(rows[0]);
}

export async function deleteRule(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await query("DELETE FROM auto_apply_rules WHERE id = $1 AND (user_id = $2 OR user_id = '')", [id, userId]);
  await query("DELETE FROM auto_apply_attempts WHERE rule_id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// ---------- Queue / attempts (paginated, per-user) ----------
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
  return { items: rows.map(rowToAutoApplyAttempt), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listQueue(userId: string, page = 1, pageSize = 6, profileId?: string): Promise<Page<AutoApplyAttempt>> {
  if (profileId) {
    return paginate(
      "WHERE outcome = 'prepared' AND (user_id = $1 OR user_id = '') AND rule_id IN (SELECT id FROM auto_apply_rules WHERE profile_id = $2)",
      [userId, profileId], page, pageSize
    );
  }
  return paginate("WHERE outcome = 'prepared' AND (user_id = $1 OR user_id = '')", [userId], page, pageSize);
}

export async function listApplied(userId: string, page = 1, pageSize = 6): Promise<Page<AutoApplyAttempt>> {
  return paginate("WHERE outcome = 'submitted' AND (user_id = $1 OR user_id = '')", [userId], page, pageSize);
}

export async function listAttempts(userId: string, ruleId?: string): Promise<AutoApplyAttempt[]> {
  const { rows } = ruleId
    ? await query("SELECT * FROM auto_apply_attempts WHERE rule_id = $1 AND (user_id = $2 OR user_id = '') ORDER BY fit_score DESC, created_at DESC LIMIT 200", [ruleId, userId])
    : await query("SELECT * FROM auto_apply_attempts WHERE (user_id = $1 OR user_id = '') ORDER BY fit_score DESC, created_at DESC LIMIT 200", [userId]);
  return rows.map(rowToAutoApplyAttempt);
}

// ---------------------------------------------------------------------------
// Mock job feed — broadened pool with company size, seniority, and a posting age
// so the new filters have something to act on. Replace with a real ToS-compliant
// source for production.
type Size = "startup" | "mid" | "large";
type Seniority = "junior" | "mid" | "senior" | "lead";
interface FeedJob {
  company: string; title: string; portal: string; industry: string;
  salaryMin: number; salaryMax: number; location: string;
  arrangement: "on-site" | "hybrid" | "remote";
  experience: number; responsibilities: string[]; url: string;
  companySize: Size; seniority: Seniority; postedDaysAgo: number;
}

const MOCK_FEED: FeedJob[] = [
  { company: "Lazada", title: "Senior Product Manager, Logistics", portal: "LinkedIn Jobs", industry: "Technology", salaryMin: 9000, salaryMax: 12000, location: "One-North", arrangement: "hybrid", experience: 6, responsibilities: ["roadmap", "stakeholder management", "agile", "data analysis", "logistics"], url: "https://www.linkedin.com/jobs/search/?keywords=senior%20product%20manager%20logistics%20singapore", companySize: "large", seniority: "senior", postedDaysAgo: 2 },
  { company: "OCBC", title: "Product Manager, Digital Banking", portal: "MyCareersFuture", industry: "Finance & Banking", salaryMin: 8000, salaryMax: 11000, location: "Marina Bay", arrangement: "hybrid", experience: 5, responsibilities: ["product strategy", "stakeholder management", "fintech", "agile", "compliance"], url: "https://www.mycareersfuture.gov.sg/search?search=product%20manager%20digital%20banking", companySize: "large", seniority: "mid", postedDaysAgo: 5 },
  { company: "Ninja Van", title: "Group Product Manager", portal: "Glints Singapore", industry: "Logistics & Supply Chain", salaryMin: 7000, salaryMax: 9500, location: "Tai Seng", arrangement: "on-site", experience: 7, responsibilities: ["team leadership", "roadmap", "data analysis", "logistics", "experimentation"], url: "https://glints.com/sg/opportunities/jobs/explore?keyword=group%20product%20manager", companySize: "mid", seniority: "lead", postedDaysAgo: 12 },
  { company: "ST Engineering", title: "Lead Product Owner", portal: "JobStreet Singapore", industry: "Manufacturing", salaryMin: 7500, salaryMax: 9800, location: "Jurong", arrangement: "on-site", experience: 6, responsibilities: ["agile", "backlog management", "stakeholder management", "requirements"], url: "https://www.jobstreet.com.sg/lead-product-owner-jobs", companySize: "large", seniority: "lead", postedDaysAgo: 20 },
  { company: "MOH Holdings", title: "Product Manager, HealthTech", portal: "MyCareersFuture", industry: "Healthcare", salaryMin: 6500, salaryMax: 8500, location: "Outram", arrangement: "hybrid", experience: 4, responsibilities: ["product strategy", "user research", "stakeholder management", "healthtech"], url: "https://www.mycareersfuture.gov.sg/search?search=product%20manager%20healthtech", companySize: "large", seniority: "mid", postedDaysAgo: 3 },
  { company: "GovTech", title: "Senior Product Manager, Citizen Services", portal: "MyCareersFuture", industry: "Government", salaryMin: 8500, salaryMax: 11500, location: "Pasir Panjang", arrangement: "hybrid", experience: 6, responsibilities: ["product strategy", "roadmap", "stakeholder management", "user research", "agile"], url: "https://www.mycareersfuture.gov.sg/search?search=senior%20product%20manager%20govtech", companySize: "large", seniority: "senior", postedDaysAgo: 1 },
  { company: "Wise", title: "Product Manager (Remote)", portal: "LinkedIn Jobs", industry: "Finance & Banking", salaryMin: 9000, salaryMax: 13000, location: "Remote (SG)", arrangement: "remote", experience: 5, responsibilities: ["fintech", "product strategy", "experimentation", "data analysis"], url: "https://www.linkedin.com/jobs/search/?keywords=wise%20product%20manager%20singapore", companySize: "mid", seniority: "mid", postedDaysAgo: 6 },
  { company: "Razer", title: "Associate Product Manager", portal: "Indeed Singapore", industry: "Technology", salaryMin: 4500, salaryMax: 6000, location: "one-north", arrangement: "on-site", experience: 2, responsibilities: ["roadmap", "agile", "consumer hardware"], url: "https://sg.indeed.com/jobs?q=associate%20product%20manager%20razer", companySize: "large", seniority: "junior", postedDaysAgo: 8 },
  { company: "Grab", title: "Principal Product Manager, Payments", portal: "LinkedIn Jobs", industry: "Finance & Banking", salaryMin: 12000, salaryMax: 16000, location: "One-North", arrangement: "hybrid", experience: 8, responsibilities: ["product strategy", "fintech", "roadmap", "stakeholder management", "experimentation"], url: "https://www.linkedin.com/jobs/search/?keywords=grab%20principal%20product%20manager%20payments", companySize: "large", seniority: "lead", postedDaysAgo: 4 },
  { company: "Sea Group", title: "Senior Product Manager, Gaming", portal: "Glints Singapore", industry: "Technology", salaryMin: 9500, salaryMax: 13000, location: "Harbourfront", arrangement: "on-site", experience: 6, responsibilities: ["roadmap", "data analysis", "experimentation", "user research"], url: "https://glints.com/sg/opportunities/jobs/explore?keyword=senior%20product%20manager%20gaming", companySize: "large", seniority: "senior", postedDaysAgo: 14 },
  { company: "DBS", title: "VP, Product Management (Wealth)", portal: "MyCareersFuture", industry: "Finance & Banking", salaryMin: 11000, salaryMax: 15000, location: "Marina Bay", arrangement: "hybrid", experience: 8, responsibilities: ["product strategy", "stakeholder management", "fintech", "compliance", "roadmap"], url: "https://www.mycareersfuture.gov.sg/search?search=vp%20product%20management%20wealth", companySize: "large", seniority: "lead", postedDaysAgo: 9 },
  { company: "Shopee", title: "Product Manager, Logistics Tech", portal: "LinkedIn Jobs", industry: "Logistics & Supply Chain", salaryMin: 8000, salaryMax: 10500, location: "Science Park", arrangement: "hybrid", experience: 5, responsibilities: ["roadmap", "logistics", "data analysis", "stakeholder management"], url: "https://www.linkedin.com/jobs/search/?keywords=shopee%20product%20manager%20logistics", companySize: "large", seniority: "mid", postedDaysAgo: 2 },
  // Startups + smaller orgs to widen the pool.
  { company: "Nium", title: "Product Manager, Payments", portal: "LinkedIn Jobs", industry: "Finance & Banking", salaryMin: 8500, salaryMax: 11500, location: "CBD", arrangement: "hybrid", experience: 5, responsibilities: ["fintech", "product strategy", "roadmap", "experimentation"], url: "https://www.linkedin.com/jobs/search/?keywords=nium%20product%20manager", companySize: "mid", seniority: "mid", postedDaysAgo: 1 },
  { company: "Carousell", title: "Senior Product Manager, Marketplace", portal: "Glints Singapore", industry: "Technology", salaryMin: 9000, salaryMax: 12000, location: "Paya Lebar", arrangement: "hybrid", experience: 6, responsibilities: ["roadmap", "experimentation", "data analysis", "user research", "stakeholder management"], url: "https://glints.com/sg/opportunities/jobs/explore?keyword=carousell%20senior%20product%20manager", companySize: "mid", seniority: "senior", postedDaysAgo: 7 },
  { company: "Endowus", title: "Product Lead, WealthTech", portal: "LinkedIn Jobs", industry: "Finance & Banking", salaryMin: 11000, salaryMax: 14500, location: "CBD", arrangement: "hybrid", experience: 7, responsibilities: ["product strategy", "fintech", "team leadership", "roadmap"], url: "https://www.linkedin.com/jobs/search/?keywords=endowus%20product%20lead", companySize: "startup", seniority: "lead", postedDaysAgo: 3 },
  { company: "Aspire", title: "Product Manager, SME Banking", portal: "Glints Singapore", industry: "Finance & Banking", salaryMin: 7500, salaryMax: 10000, location: "CBD", arrangement: "hybrid", experience: 4, responsibilities: ["fintech", "product strategy", "agile", "user research"], url: "https://glints.com/sg/opportunities/jobs/explore?keyword=aspire%20product%20manager", companySize: "startup", seniority: "mid", postedDaysAgo: 5 },
  { company: "Doctor Anywhere", title: "Product Manager, Telehealth", portal: "MyCareersFuture", industry: "Healthcare", salaryMin: 7000, salaryMax: 9500, location: "Tanjong Pagar", arrangement: "hybrid", experience: 4, responsibilities: ["product strategy", "healthtech", "user research", "roadmap"], url: "https://www.mycareersfuture.gov.sg/search?search=doctor%20anywhere%20product%20manager", companySize: "startup", seniority: "mid", postedDaysAgo: 10 },
];

function feedForToday(): FeedJob[] {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const day = Math.floor((Date.now() - start.getTime()) / 86400000);
  const rotate = day % MOCK_FEED.length;
  return [...MOCK_FEED.slice(rotate), ...MOCK_FEED.slice(0, rotate)];
}

function freshnessMaxDays(f: string): number {
  if (f === "24h") return 1;
  if (f === "week") return 7;
  if (f === "month") return 31;
  return 99999;
}

// ---------------------------------------------------------------------------
// Fit scoring — sharper and with the new signals.
interface Scored { score: number; reasons: string[]; }
function lc(s: string) { return s.toLowerCase(); }
function anyIncludes(haystack: string, needles: string[]) {
  const h = lc(haystack);
  return needles.some((n) => h.includes(lc(n)));
}
function skillHit(job: FeedJob, s: string): boolean {
  return job.responsibilities.some((r) => lc(r).includes(lc(s)) || lc(s).includes(lc(r)));
}

function scoreJob(rule: AutoApplyRule, job: FeedJob): Scored | null {
  const reasons: string[] = [];

  // ---- Hard gates: disqualify entirely ----
  if (rule.minSalary != null && job.salaryMax < rule.minSalary) return null;

  // Freshness gate.
  if (rule.freshness && rule.freshness !== "any" && job.postedDaysAgo > freshnessMaxDays(rule.freshness)) return null;

  // Exclude keywords gate.
  if (rule.excludeKeywords.trim()) {
    const ex = rule.excludeKeywords.split(",").map((t) => t.trim()).filter(Boolean);
    if (ex.length && anyIncludes(`${job.title} ${job.company} ${job.responsibilities.join(" ")}`, ex)) return null;
  }

  // Must-have skills gate — every one must be present.
  if (rule.mustHaveSkills.length) {
    const missing = rule.mustHaveSkills.filter((s) => !skillHit(job, s));
    if (missing.length) return null;
  }

  // ---- Weighted scoring of applicable criteria ----
  let earned = 0, possible = 0;

  if (rule.minSalary != null) {
    possible += 22; earned += 22;
    reasons.push(`Pays up to S$${job.salaryMax.toLocaleString()} — meets your S$${rule.minSalary.toLocaleString()} floor`);
  }
  if (rule.mustHaveSkills.length) {
    possible += 10; earned += 10;
    reasons.push(`Has all must-have skills: ${rule.mustHaveSkills.join(", ")}`);
  }
  if (rule.titles.length) {
    possible += 20;
    const hit = rule.titles.find((t) => lc(job.title).includes(lc(t)));
    if (hit) { earned += 20; reasons.push(`Title matches "${hit}"`); }
    else reasons.push(`Title "${job.title}" is outside your target titles`);
  }
  if (rule.seniority.length) {
    possible += 8;
    if (rule.seniority.includes(job.seniority)) { earned += 8; reasons.push(`Seniority: ${job.seniority}`); }
    else reasons.push(`Seniority ${job.seniority} not in your bands`);
  }
  if (rule.industries.length) {
    possible += 12;
    if (rule.industries.includes(job.industry)) { earned += 12; reasons.push(`Industry: ${job.industry}`); }
    else reasons.push(`Industry ${job.industry} not in your list`);
  }
  if (rule.skills.length) {
    possible += 14;
    const hits = rule.skills.filter((s) => skillHit(job, s));
    if (hits.length) { earned += Math.round((hits.length / rule.skills.length) * 14); reasons.push(`Matches ${hits.length}/${rule.skills.length} nice-to-have skills: ${hits.join(", ")}`); }
    else reasons.push("No nice-to-have skills matched");
  }
  if (rule.companySizes.length) {
    possible += 6;
    if (rule.companySizes.includes(job.companySize)) { earned += 6; reasons.push(`Company size: ${job.companySize}`); }
    else reasons.push(`Company size ${job.companySize} not preferred`);
  }
  if (rule.locations.length) {
    possible += 5;
    if (anyIncludes(job.location, rule.locations)) { earned += 5; reasons.push(`Location: ${job.location}`); }
    else reasons.push(`Location ${job.location} not preferred`);
  }
  if (rule.arrangements.length) {
    possible += 6;
    if (rule.arrangements.includes(job.arrangement)) { earned += 6; reasons.push(`${job.arrangement} — matches preference`); }
    else reasons.push(`${job.arrangement} not preferred`);
  }
  if (rule.minExperience != null) {
    possible += 4;
    if (job.experience >= rule.minExperience) { earned += 4; reasons.push(`~${job.experience}y experience fits ${rule.minExperience}y+`); }
    else reasons.push(`~${job.experience}y vs your ${rule.minExperience}y target`);
  }
  // Include keywords: bonus signal.
  if (rule.includeKeywords.trim()) {
    const inc = rule.includeKeywords.split(",").map((t) => t.trim()).filter(Boolean);
    possible += 6;
    const matched = inc.filter((k) => anyIncludes(`${job.title} ${job.responsibilities.join(" ")}`, [k]));
    if (matched.length) { earned += Math.round((matched.length / inc.length) * 6); reasons.push(`Matches keywords: ${matched.join(", ")}`); }
  }
  // Freshness bonus for very recent posts.
  if (rule.freshness && rule.freshness !== "any") {
    possible += 3;
    earned += 3;
    reasons.push(`Posted ${job.postedDaysAgo === 0 ? "today" : job.postedDaysAgo + "d ago"} — within your window`);
  }

  // Legacy keyword fallback if no titles given.
  if (rule.keywords.trim() && !rule.titles.length) {
    const terms = rule.keywords.split(",").map((t) => t.trim()).filter(Boolean);
    possible += 15;
    if (terms.length && anyIncludes(`${job.title} ${job.company}`, terms)) { earned += 15; reasons.push("Keyword match in title/company"); }
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
  ruleId: string; enabled: boolean; considered: number; matched: number;
  prepared: number; belowThreshold: number; skippedApplied: number;
  gatedOut: number; topScore: number; notice: string;
}

async function seenKeys(userId: string): Promise<Set<string>> {
  const { rows } = await query("SELECT job_key FROM seen_jobs WHERE user_id = $1 OR user_id = ''", [userId]);
  return new Set(rows.map((r: any) => r.job_key));
}

export async function runRule(ruleId: string, userId: string): Promise<RunResult> {
  const { rows } = await query("SELECT * FROM auto_apply_rules WHERE id = $1 AND (user_id = $2 OR user_id = '')", [ruleId, userId]);
  if (!rows[0]) throw new Error("Rule not found");
  const rule = rowToAutoApplyRule(rows[0]);

  const result: RunResult = {
    ruleId, enabled: rule.enabled, considered: 0, matched: 0, prepared: 0,
    belowThreshold: 0, skippedApplied: 0, gatedOut: 0, topScore: 0, notice: "",
  };
  if (!rule.enabled) { result.notice = "Rule is disabled. Enable it to prepare applications."; return result; }

  await query("DELETE FROM auto_apply_attempts WHERE rule_id = $1 AND outcome = 'prepared'", [ruleId]);

  const feed = feedForToday();
  const seen = await seenKeys(userId);
  result.considered = feed.length;

  for (const job of feed) {
    if (seen.has(jobKey(job.company, job.title, job.portal))) { result.skippedApplied++; continue; }
    const scored = scoreJob(rule, job);
    if (scored === null) { result.gatedOut++; continue; }
    result.matched++;
    result.topScore = Math.max(result.topScore, scored.score);
    if (scored.score < MATCH_THRESHOLD) { result.belowThreshold++; continue; }

    const matchedSkills = [...rule.mustHaveSkills, ...rule.skills].filter((s) => skillHit(job, s));
    const cover = generateCoverLetter(rule, job, matchedSkills);

    await query(
      `INSERT INTO auto_apply_attempts
        (id, rule_id, company, title, portal, outcome, reason, application_id,
         fit_score, fit_reasons, cover_letter, job_url, salary_min, salary_max,
         location, arrangement, user_id)
       VALUES ($1,$2,$3,$4,$5,'prepared',$6,NULL,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15)`,
      [
        randomUUID(), ruleId, job.company, job.title, job.portal,
        "Prepared for your review.", scored.score, JSON.stringify(scored.reasons),
        cover, job.url, job.salaryMin, job.salaryMax, job.location, job.arrangement, userId,
      ]
    );
    result.prepared++;
  }

  await query("UPDATE auto_apply_rules SET last_run_at = now() WHERE id = $1", [ruleId]);

  result.notice = result.prepared > 0
    ? `Prepared ${result.prepared} application(s) for your review.${result.skippedApplied ? ` Skipped ${result.skippedApplied} already handled.` : ""}${result.gatedOut ? ` ${result.gatedOut} filtered out by your gates.` : ""}`
    : result.matched > 0
      ? "Some jobs matched but scored below the fit threshold. Loosen your profile to see them."
      : result.skippedApplied > 0
        ? "All matching jobs have already been applied to or dismissed."
        : "No jobs matched this profile. Try widening titles, industries, salary, or relaxing the must-have/exclude filters.";
  return result;
}

// Run every enabled rule across ALL users whose auto-refresh is due (daily).
export async function runDueRules(): Promise<{ ran: number; prepared: number }> {
  const { rows } = await query(
    `SELECT id, user_id FROM auto_apply_rules
     WHERE enabled = true AND auto_refresh = true
       AND (last_run_at IS NULL OR last_run_at < now() - interval '24 hours')`
  );
  let prepared = 0;
  for (const r of rows) {
    try { const res = await runRule(r.id, r.user_id ?? ""); prepared += res.prepared; }
    catch (e) { console.error("[auto-refresh] rule failed", r.id, e); }
  }
  if (rows.length) console.log(`[auto-refresh] ran ${rows.length} rule(s), prepared ${prepared} item(s)`);
  return { ran: rows.length, prepared };
}

// ---------- Queue actions (per-user) ----------
export async function updateCoverLetter(attemptId: string, coverLetter: string, userId: string): Promise<AutoApplyAttempt | null> {
  const { rows } = await query(
    "UPDATE auto_apply_attempts SET cover_letter = $2 WHERE id = $1 AND outcome = 'prepared' AND (user_id = $3 OR user_id = '') RETURNING *",
    [attemptId, coverLetter, userId]
  );
  return rows[0] ? rowToAutoApplyAttempt(rows[0]) : null;
}

export async function markSubmitted(attemptId: string, userId: string): Promise<{ attempt: AutoApplyAttempt; applicationId: string } | null> {
  const { rows } = await query("SELECT * FROM auto_apply_attempts WHERE id = $1 AND (user_id = $2 OR user_id = '')", [attemptId, userId]);
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
      next_action_date, timeline, interviews, user_id
    ) VALUES (
      $1,$2,$3,$4,'','',$5,'','','',$6,$7,$8,'Full-time','Applied',$9,$10,
      NULL,$11::jsonb,'[]'::jsonb,$12
    )`,
    [
      appId, today, a.company, a.title, a.portal, a.salaryMin, a.salaryMax, a.location,
      `Submitted via review queue (fit ${a.fitScore}%). Cover letter on file.`,
      rule?.resumeId ?? "",
      JSON.stringify([{ id: randomUUID(), date: today, label: `Submitted on ${a.portal} after review (fit ${a.fitScore}%)` }]),
      userId,
    ]
  );

  const key = jobKey(a.company, a.title, a.portal);
  await query(
    `INSERT INTO seen_jobs (job_key, status, company, title, portal, application_id, user_id)
     VALUES ($1,'applied',$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, job_key) DO UPDATE SET status='applied', application_id=EXCLUDED.application_id`,
    [key, a.company, a.title, a.portal, appId, userId]
  );

  const { rows: up } = await query(
    "UPDATE auto_apply_attempts SET outcome = 'submitted', application_id = $2 WHERE id = $1 RETURNING *",
    [attemptId, appId]
  );
  return { attempt: rowToAutoApplyAttempt(up[0]), applicationId: appId };
}

export async function dismissAttempt(attemptId: string, userId: string): Promise<AutoApplyAttempt | null> {
  const { rows } = await query("SELECT * FROM auto_apply_attempts WHERE id = $1 AND (user_id = $2 OR user_id = '')", [attemptId, userId]);
  if (!rows[0]) return null;
  const a = rowToAutoApplyAttempt(rows[0]);
  const key = jobKey(a.company, a.title, a.portal);
  await query(
    `INSERT INTO seen_jobs (job_key, status, company, title, portal, user_id)
     VALUES ($1,'dismissed',$2,$3,$4,$5)
     ON CONFLICT (user_id, job_key) DO UPDATE SET status='dismissed'`,
    [key, a.company, a.title, a.portal, userId]
  );
  const { rows: up } = await query("UPDATE auto_apply_attempts SET outcome = 'dismissed' WHERE id = $1 RETURNING *", [attemptId]);
  return rowToAutoApplyAttempt(up[0]);
}

export async function forgetSeenByApplication(applicationId: string, userId: string): Promise<void> {
  await query("DELETE FROM seen_jobs WHERE application_id = $1 AND (user_id = $2 OR user_id = '')", [applicationId, userId]);
}
