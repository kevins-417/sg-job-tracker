import { randomUUID } from "node:crypto";
import { query } from "../db/pool.js";
import { rowToAutoApplyRule, rowToAutoApplyAttempt } from "../db/mappers.js";
import type { AutoApplyRule, AutoApplyAttempt } from "../types.js";
import type { AutoApplyRuleInput } from "../validators.js";

export async function listRules(): Promise<AutoApplyRule[]> {
  const { rows } = await query("SELECT * FROM auto_apply_rules ORDER BY created_at DESC");
  return rows.map(rowToAutoApplyRule);
}

export async function upsertRule(input: AutoApplyRuleInput): Promise<AutoApplyRule> {
  const id = input.id || randomUUID();
  // Hard guardrail: the "submit" mode is reserved for a future, properly
  // authenticated portal integration. We persist the rule but force it back to
  // require_review so nothing can be configured to fire blindly.
  const requireReview = input.mode === "submit" ? true : input.requireReview;
  const { rows } = await query(
    `INSERT INTO auto_apply_rules
      (id, label, enabled, keywords, industries, portals, min_salary, resume_id, mode, require_review)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET
       label=EXCLUDED.label, enabled=EXCLUDED.enabled, keywords=EXCLUDED.keywords,
       industries=EXCLUDED.industries, portals=EXCLUDED.portals,
       min_salary=EXCLUDED.min_salary, resume_id=EXCLUDED.resume_id,
       mode=EXCLUDED.mode, require_review=EXCLUDED.require_review
     RETURNING *`,
    [
      id, input.label, input.enabled, input.keywords,
      JSON.stringify(input.industries), JSON.stringify(input.portals),
      input.minSalary, input.resumeId, input.mode, requireReview,
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
    ? await query("SELECT * FROM auto_apply_attempts WHERE rule_id = $1 ORDER BY created_at DESC LIMIT 100", [ruleId])
    : await query("SELECT * FROM auto_apply_attempts ORDER BY created_at DESC LIMIT 100");
  return rows.map(rowToAutoApplyAttempt);
}

// ---------------------------------------------------------------------------
// Mock job feed.
//
// A real Phase 2 build would fetch live postings from the SG portals (subject
// to each portal's terms of service and rate limits). That integration is out
// of scope and deliberately not implemented here. This fixed sample feed lets
// the rule engine be exercised end-to-end without touching any third party.
const MOCK_FEED = [
  { company: "Lazada", title: "Senior Product Manager, Logistics", portal: "LinkedIn Jobs", industry: "Technology", salaryMin: 8000, salaryMax: 11000, location: "One-North" },
  { company: "OCBC", title: "Product Manager, Digital Banking", portal: "MyCareersFuture", industry: "Finance & Banking", salaryMin: 7500, salaryMax: 10000, location: "Marina Bay" },
  { company: "Ninja Van", title: "Group Product Manager", portal: "Glints Singapore", industry: "Logistics & Supply Chain", salaryMin: 6500, salaryMax: 9000, location: "Tai Seng" },
  { company: "ST Engineering", title: "Lead Product Owner", portal: "JobStreet Singapore", industry: "Manufacturing", salaryMin: 7000, salaryMax: 9500, location: "Jurong" },
  { company: "MOH Holdings", title: "Product Manager, HealthTech", portal: "MyCareersFuture", industry: "Healthcare", salaryMin: 6000, salaryMax: 8500, location: "Outram" },
];

interface RunResult {
  ruleId: string;
  enabled: boolean;
  mode: string;
  considered: number;
  matched: number;
  drafted: number;
  blocked: number;
  attempts: AutoApplyAttempt[];
  notice: string;
}

function matches(rule: AutoApplyRule, job: typeof MOCK_FEED[number]): boolean {
  if (rule.industries.length && !rule.industries.includes(job.industry)) return false;
  if (rule.portals.length && !rule.portals.includes(job.portal)) return false;
  if (rule.minSalary != null && (job.salaryMax ?? 0) < rule.minSalary) return false;
  if (rule.keywords.trim()) {
    const terms = rule.keywords.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
    const hay = `${job.title} ${job.company}`.toLowerCase();
    if (terms.length && !terms.some((t) => hay.includes(t))) return false;
  }
  return true;
}

// Runs a rule against the mock feed. In "draft" mode it creates Draft
// applications (clearly flagged) for the user to review. In "submit" mode it
// records a "blocked" attempt and creates nothing, because unattended
// submission to external portals is intentionally not implemented.
export async function runRule(ruleId: string): Promise<RunResult> {
  const { rows } = await query("SELECT * FROM auto_apply_rules WHERE id = $1", [ruleId]);
  if (!rows[0]) throw new Error("Rule not found");
  const rule = rowToAutoApplyRule(rows[0]);

  const result: RunResult = {
    ruleId, enabled: rule.enabled, mode: rule.mode,
    considered: MOCK_FEED.length, matched: 0, drafted: 0, blocked: 0,
    attempts: [], notice: "",
  };

  if (!rule.enabled) {
    result.notice = "Rule is disabled. Enable it to let the matcher run.";
    return result;
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const job of MOCK_FEED) {
    if (!matches(rule, job)) continue;
    result.matched++;

    const attemptId = randomUUID();

    if (rule.mode === "submit") {
      // Refuse to auto-submit. Record why and move on.
      result.blocked++;
      const { rows: ar } = await query(
        `INSERT INTO auto_apply_attempts (id, rule_id, company, title, portal, outcome, reason, application_id)
         VALUES ($1,$2,$3,$4,$5,'blocked',$6,NULL) RETURNING *`,
        [attemptId, ruleId, job.company, job.title, job.portal,
         "Auto-submission to external portals is not implemented. Switch the rule to draft mode to queue a reviewable application instead."]
      );
      result.attempts.push(rowToAutoApplyAttempt(ar[0]));
      continue;
    }

    // draft mode: create a Draft application for review.
    const appId = randomUUID();
    await query(
      `INSERT INTO applications (
        id, date_applied, company, title, job_function, industry, portal,
        recruiter_name, recruiter_email, recruiter_phone, salary_min, salary_max,
        location, employment_type, status, job_description, resume_id,
        next_action_date, timeline, interviews
      ) VALUES (
        $1,$2,$3,$4,'',$5,$6,'','','',$7,$8,$9,'Full-time','Draft',$10,$11,
        NULL,$12::jsonb,'[]'::jsonb
      )`,
      [
        appId, today, job.company, job.title, job.industry, job.portal,
        job.salaryMin, job.salaryMax, job.location,
        `Auto-drafted by rule "${rule.label}". Review the details and the matched salary range, then move it out of Draft to apply for real.`,
        rule.resumeId,
        JSON.stringify([{ id: randomUUID(), date: today, label: `Auto-drafted by rule "${rule.label}"` }]),
      ]
    );

    result.drafted++;
    const { rows: ar } = await query(
      `INSERT INTO auto_apply_attempts (id, rule_id, company, title, portal, outcome, reason, application_id)
       VALUES ($1,$2,$3,$4,$5,'drafted','Created a Draft application for review.',$6) RETURNING *`,
      [attemptId, ruleId, job.company, job.title, job.portal, appId]
    );
    result.attempts.push(rowToAutoApplyAttempt(ar[0]));
  }

  result.notice = rule.mode === "submit"
    ? "Submit mode is blocked by design. Matches were logged but nothing was created or sent."
    : `Drafted ${result.drafted} application(s) for your review. They appear under Applications with status Draft.`;
  return result;
}
