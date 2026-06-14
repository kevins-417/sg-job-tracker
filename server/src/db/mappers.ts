import type {
  Application, Company, Resume, AutoApplyRule, AutoApplyAttempt,
} from "../types.js";

// Postgres returns DATE columns as JS Date objects (or strings depending on
// driver settings). Normalise to yyyy-mm-dd strings, which is what the client
// uses everywhere.
function toISODate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export function rowToApplication(r: any): Application {
  return {
    id: r.id,
    dateApplied: toISODate(r.date_applied),
    company: r.company,
    title: r.title,
    jobFunction: r.job_function ?? "",
    industry: r.industry ?? "",
    portal: r.portal ?? "",
    recruiterName: r.recruiter_name ?? "",
    recruiterEmail: r.recruiter_email ?? "",
    recruiterPhone: r.recruiter_phone ?? "",
    salaryMin: r.salary_min === null ? null : Number(r.salary_min),
    salaryMax: r.salary_max === null ? null : Number(r.salary_max),
    location: r.location ?? "",
    employmentType: r.employment_type ?? "",
    status: r.status ?? "Applied",
    jobDescription: r.job_description ?? "",
    resumeId: r.resume_id ?? "",
    nextActionDate: toISODate(r.next_action_date),
    timeline: r.timeline ?? [],
    interviews: r.interviews ?? [],
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
    updatedAt: r.updated_at?.toISOString?.() ?? r.updated_at,
  };
}

export function rowToCompany(r: any): Company {
  return {
    id: r.id,
    name: r.name,
    industry: r.industry ?? "",
    website: r.website ?? "",
    glassdoor: r.glassdoor ?? "",
    hq: r.hq ?? "",
    sgOffice: r.sg_office ?? "",
    employees: r.employees ?? "",
    notes: r.notes ?? "",
  };
}

export function rowToResume(r: any): Resume {
  return {
    id: r.id,
    name: r.name,
    version: r.version ?? "",
    targetIndustry: r.target_industry ?? "",
  };
}

export function rowToAutoApplyRule(r: any): AutoApplyRule {
  return {
    id: r.id,
    label: r.label,
    enabled: !!r.enabled,
    keywords: r.keywords ?? "",
    industries: r.industries ?? [],
    portals: r.portals ?? [],
    minSalary: r.min_salary === null ? null : Number(r.min_salary),
    resumeId: r.resume_id ?? "",
    mode: r.mode === "submit" ? "submit" : "draft",
    requireReview: !!r.require_review,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
  };
}

export function rowToAutoApplyAttempt(r: any): AutoApplyAttempt {
  return {
    id: r.id,
    ruleId: r.rule_id,
    company: r.company ?? "",
    title: r.title ?? "",
    portal: r.portal ?? "",
    outcome: r.outcome ?? "queued",
    reason: r.reason ?? "",
    applicationId: r.application_id ?? null,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
  };
}
