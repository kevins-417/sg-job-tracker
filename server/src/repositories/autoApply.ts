import { randomUUID } from "node:crypto";
import { query } from "../db/pool.js";
import { rowToAutoApplyRule, rowToAutoApplyAttempt } from "../db/mappers.js";
import type { AutoApplyRule, AutoApplyAttempt } from "../types.js";
import type { AutoApplyRuleInput } from "../validators.js";

// ---------- Rule CRUD ----------
export async function listRules(): Promise<AutoApplyRule[]> {
  const { rows } = await query("SELECT * FROM auto_apply_rules ORDER BY created_at DESC");
  return rows.map(rowToAutoApplyRule);
}

export async function upsertRule(input: AutoApplyRuleInput): Promise<AutoApplyRule> {
  const id = input.id || randomUUID();
  // "submit" mode is never honoured for unattended sending; force review on.
  const requireReview = input.mode === "submit" ? true : input.requireReview;
  const { rows } = await query(
    `INSERT INTO auto_apply_rules
      (id, label, enabled, keywords, industries, portals, min_salary, resume_id,
       mode, require_review, titles, skills, locations, arrangements,
       min_experience, cover_template)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,
             $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16)
     ON CONFLICT (id) DO UPDATE SET
       label=EXCLUDED.label, enabled=EXCLUDED.enabled, keywords=EXCLUDED.keywords,
       industries=EXCLUDED.industries, portals=EXCLUDED.portals,
       min_salary=EXCLUDED.min_salary, resume_id=EXCLUDED.resume_id,
       mode=EXCLUDED.mode, require_review=EXCLUDED.require_review,
       titles=EXCLUDED.titles, skills=EXCLUDED.skills, locations=EXCLUDED.locations,
       arrangements=EXCLUDED.arrangements, min_experience=EXCLUDED.min_experience,
       cover_template=EXCLUDED.cover_template
     RETURNING *`,
    [
      id, input.label, input.enabled, input.keywords,
      JSON.stringify(input.industries), JSON.stringify(input.portals),
      input.minSalary, input.resumeId, input.mode, requireReview,
      JSON.stringify(input.titles), JSON.stringify(input.skills),
      JSON.stringify(input.locations), JSON.stringify(input.arrangements),
      input.minExperience, input.coverTemplate,
    ]
  );
  return rowToAutoApplyRule(rows[0]);
}

export async function deleteRule(id: string): Promise<boolean> {
  const { rowCount } = await query("DELETE FROM auto_apply_rules WHERE id = $1", [id]);
  await query("DELETE FROM auto_apply_attempts WHERE rule_id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

export async function listAttempts(ruleId?: string): Promise<AutoApplyAttempt[]> {
  const { rows } = ruleId
    ? await query("SELECT * FROM auto_apply_attempts WHERE rule_id = $1 ORDER BY fit_score DESC, created_at DESC LIMIT 200", [ruleId])
    : await query("SELECT * FROM auto_apply_attempts ORDER BY fit_score DESC, created_at DESC LIMIT 200");
  return rows.map(rowToAutoApplyAttempt);
}

// Only the items still awaiting the user's decision.
export async function listQueue(): Promise<AutoApplyAttempt[]> {
  const { rows } = await query(
    "SELECT * FROM auto_apply_attempts WHERE outcome = 'prepared' ORDER BY fit_score DESC, created_at DESC LIMIT 200"
  );
  return rows.map(rowToAutoApplyAttempt);
}

// ---------------------------------------------------------------------------
// Mock job feed.
//
// A real Phase 2 build fetches live postings from the SG portals, subject to
// each portal's terms of service. That integration is intentionally NOT here.
// This richer sample feed lets the matcher and cover-letter generator be
// exercised end-to-end. `url` points at the portal's search page so the user
// can find and submit the application themselves.
interface FeedJob {
  company: string; title: string; portal: string; industry: string;
  salaryMin: number; salaryMax: number; location: string;
  arrangement: "on-site" | "hybrid" | "remote";
  experience: number;
  responsibilities: string[];
  url: string;
}

const MOCK_FEED: FeedJob[] = [
  {
    company: "Lazada", title: "Senior Product Manager, Logistics", portal: "LinkedIn Jobs",
    industry: "Technology", salaryMin: 9000, salaryMax: 12000, location: "One-North",
    arrangement: "hybrid", experience: 6,
    responsibilities: ["roadmap", "stakeholder management", "agile", "data analysis", "logistics"],
    url: "https://www.linkedin.com/jobs/search/?keywords=senior%20product%20manager%20logistics%20singapore",
  },
  {
    company: "OCBC", title: "Product Manager, Digital Banking", portal: "MyCareersFuture",
    industry: "Finance & Banking", salaryMin: 8000, salaryMax: 11000, location: "Marina Bay",
    arrangement: "hybrid", experience: 5,
    responsibilities: ["product strategy", "stakeholder management", "fintech", "agile", "compliance"],
    url: "https://www.mycareersfuture.gov.sg/search?search=product%20manager%20digital%20banking",
  },
  {
    company: "Ninja Van", title: "Group Product Manager", portal: "Glints Singapore",
    industry: "Logistics & Supply Chain", salaryMin: 7000, salaryMax: 9500, location: "Tai Seng",
    arrangement: "on-site", experience: 7,
    responsibilities: ["team leadership", "roadmap", "data analysis", "logistics", "experimentation"],
    url: "https://glints.com/sg/opportunities/jobs/explore?keyword=group%20product%20manager",
  },
  {
    company: "ST Engineering", title: "Lead Product Owner", portal: "JobStreet Singapore",
    industry: "Manufacturing", salaryMin: 7500, salaryMax: 9800, location: "Jurong",
    arrangement: "on-site", experience: 6,
    responsibilities: ["agile", "backlog management", "stakeholder management", "requirements"],
    url: "https://www.jobstreet.com.sg/lead-product-owner-jobs",
  },
  {
    company: "MOH Holdings", title: "Product Manager, HealthTech", portal: "MyCareersFuture",
    industry: "Healthcare", salaryMin: 6500, salaryMax: 8500, location: "Outram",
    arrangement: "hybrid", experience: 4,
    responsibilities: ["product strategy", "user research", "stakeholder management", "healthtech"],
    url: "https://www.mycareersfuture.gov.sg/search?search=product%20manager%20healthtech",
  },
  {
    company: "GovTech", title: "Senior Product Manager, Citizen Services", portal: "MyCareersFuture",
    industry: "Government", salaryMin: 8500, salaryMax: 11500, location: "Pasir Panjang",
    arrangement: "hybrid", experience: 6,
    responsibilities: ["product strategy", "roadmap", "stakeholder management", "user research", "agile"],
    url: "https://www.mycareersfuture.gov.sg/search?search=senior%20product%20manager%20govtech",
  },
  {
    company: "Wise", title: "Product Manager (Remote)", portal: "LinkedIn Jobs",
    industry: "Finance & Banking", salaryMin: 9000, salaryMax: 13000, location: "Remote (SG)",
    arrangement: "remote", experience: 5,
    responsibilities: ["fintech", "product strategy", "experimentation", "data analysis"],
    url: "https://www.linkedin.com/jobs/search/?keywords=wise%20product%20manager%20singapore",
  },
  {
    company: "Razer", title: "Associate Product Manager", portal: "Indeed Singapore",
    industry: "Technology", salaryMin: 4500, salaryMax: 6000, location: "one-north",
    arrangement: "on-site", experience: 2,
    responsibilities: ["roadmap", "agile", "consumer hardware"],
    url: "https://sg.indeed.com/jobs?q=associate%20product%20manager%20razer",
  },
];

// ---------------------------------------------------------------------------
// Fit scoring. Each criterion contributes points and an explanation. Score is
// the share of *applicable* points earned. Salary floor is a hard gate.
interface Scored { score: number; reasons: string[]; }

function lc(s: string) { return s.toLowerCase(); }
function anyIncludes(haystack: string, needles: string[]) {
  const h = lc(haystack);
  return needles.some((n) => h.includes(lc(n)));
}

function scoreJob(rule: AutoApplyRule, job: FeedJob): Scored | null {
  let earned = 0;
  let possible = 0;
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
    if (hits.length) {
      earned += Math.round((hits.length / rule.skills.length) * 20);
      reasons.push(`Matches ${hits.length}/${rule.skills.length} of your skills: ${hits.join(", ")}`);
    } else reasons.push("None of your listed skills appear in the responsibilities");
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
    if (terms.length && anyIncludes(`${job.title} ${job.company}`, terms)) { earned += 20; reasons.push(`Keyword match in title/company`); }
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  return { score, reasons };
}

// ---------------------------------------------------------------------------
// Cover-letter generator. Deterministic, template-based, no external calls.
function generateCoverLetter(rule: AutoApplyRule, job: FeedJob, matchedSkills: string[]): string {
  const skillPhrase = matchedSkills.length
    ? matchedSkills.slice(0, 3).join(", ")
    : job.responsibilities.slice(0, 3).join(", ");
  const styleNote = rule.coverTemplate.trim()
    ? `\n\n[Style note for you: ${rule.coverTemplate.trim()} — adjust the draft below to match.]`
    : "";
  const arrText = job.arrangement === "remote"
    ? ", working effectively in a remote setup"
    : job.arrangement === "hybrid" ? " in your hybrid setup" : " on-site with your team";

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

interface RunResult {
  ruleId: string;
  enabled: boolean;
  considered: number;
  matched: number;
  prepared: number;
  belowThreshold: number;
  topScore: number;
  notice: string;
}

export async function runRule(ruleId: string): Promise<RunResult> {
  const { rows } = await query("SELECT * FROM auto_apply_rules WHERE id = $1", [ruleId]);
  if (!rows[0]) throw new Error("Rule not found");
  const rule = rowToAutoApplyRule(rows[0]);

  const result: RunResult = {
    ruleId, enabled: rule.enabled, considered: MOCK_FEED.length,
    matched: 0, prepared: 0, belowThreshold: 0, topScore: 0, notice: "",
  };

  if (!rule.enabled) {
    result.notice = "Rule is disabled. Enable it to prepare applications.";
    return result;
  }

  await query("DELETE FROM auto_apply_attempts WHERE rule_id = $1 AND outcome = 'prepared'", [ruleId]);

  for (const job of MOCK_FEED) {
    const scored = scoreJob(rule, job);
    if (scored === null) continue;
    result.matched++;
    result.topScore = Math.max(result.topScore, scored.score);
    if (scored.score < MATCH_THRESHOLD) { result.belowThreshold++; continue; }

    const matchedSkills = rule.skills.filter((s) =>
      job.responsibilities.some((r) => lc(r).includes(lc(s)) || lc(s).includes(lc(r)))
    );
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

  result.notice = result.prepared > 0
    ? `Prepared ${result.prepared} application(s) for your review. Open the queue to read each tailored cover letter and submit the ones you approve.`
    : result.matched > 0
      ? "Some jobs matched but scored below the fit threshold. Loosen your profile to see them."
      : "No jobs matched this profile. Try widening titles, industries, or the salary floor.";
  return result;
}

// ---------- Queue actions ----------
export async function updateCoverLetter(attemptId: string, coverLetter: string): Promise<AutoApplyAttempt | null> {
  const { rows } = await query(
    "UPDATE auto_apply_attempts SET cover_letter = $2 WHERE id = $1 AND outcome = 'prepared' RETURNING *",
    [attemptId, coverLetter]
  );
  return rows[0] ? rowToAutoApplyAttempt(rows[0]) : null;
}

// Records that the USER submitted on the portal, and creates a tracked
// application. Sends nothing to any portal.
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
      appId, today, a.company, a.title, a.portal,
      a.salaryMin, a.salaryMax, a.location,
      `Submitted via review queue (fit ${a.fitScore}%). Cover letter on file.`,
      rule?.resumeId ?? "",
      JSON.stringify([{ id: randomUUID(), date: today, label: `Submitted on ${a.portal} after review (fit ${a.fitScore}%)` }]),
    ]
  );

  const { rows: up } = await query(
    "UPDATE auto_apply_attempts SET outcome = 'submitted', application_id = $2 WHERE id = $1 RETURNING *",
    [attemptId, appId]
  );
  return { attempt: rowToAutoApplyAttempt(up[0]), applicationId: appId };
}

export async function dismissAttempt(attemptId: string): Promise<AutoApplyAttempt | null> {
  const { rows } = await query(
    "UPDATE auto_apply_attempts SET outcome = 'dismissed' WHERE id = $1 RETURNING *",
    [attemptId]
  );
  return rows[0] ? rowToAutoApplyAttempt(rows[0]) : null;
}
