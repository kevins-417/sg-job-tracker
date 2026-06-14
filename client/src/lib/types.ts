export interface TimelineEntry {
  id: string;
  date: string;
  label: string;
}

export interface Interview {
  id: string;
  date: string;
  time: string;
  type: string;
  interviewer: string;
  link: string;
  notes: string;
  outcome: string;
}

export interface Application {
  id: string;
  dateApplied: string;
  company: string;
  title: string;
  jobFunction: string;
  industry: string;
  portal: string;
  recruiterName: string;
  recruiterEmail: string;
  recruiterPhone: string;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string;
  employmentType: string;
  status: string;
  jobDescription: string;
  resumeId: string;
  nextActionDate: string;
  timeline: TimelineEntry[];
  interviews: Interview[];
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  glassdoor: string;
  hq: string;
  sgOffice: string;
  employees: string;
  notes: string;
  _new?: boolean;
}

export interface Resume {
  id: string;
  name: string;
  version: string;
  targetIndustry: string;
}

export interface AutoApplyRule {
  id: string;
  label: string;
  enabled: boolean;
  keywords: string;
  industries: string[];
  portals: string[];
  minSalary: number | null;
  resumeId: string;
  mode: "draft" | "submit";
  requireReview: boolean;
  _new?: boolean;
}

export interface AutoApplyAttempt {
  id: string;
  ruleId: string;
  company: string;
  title: string;
  portal: string;
  outcome: "queued" | "drafted" | "skipped" | "blocked";
  reason: string;
  applicationId: string | null;
  createdAt?: string;
}

export interface AutoApplyRunResult {
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

export interface Palette {
  bg: string;
  panel: string;
  border: string;
  track: string;
  text: string;
  dim: string;
  accent: string;
  accentDk: string;
  accentSoft: string;
}
