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

export interface SearchProfile {
  id: string;
  name: string;
  description: string;
  _new?: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface User {
  id: string;
  name: string;
  headline: string;
  createdAt?: string;
  _new?: boolean;
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
  titles: string[];
  skills: string[];
  locations: string[];
  arrangements: string[];
  minExperience: number | null;
  coverTemplate: string;
  profileId: string;
  lastRunAt: string | null;
  autoRefresh: boolean;
  companySizes: string[];
  freshness: string;
  seniority: string[];
  includeKeywords: string;
  excludeKeywords: string;
  mustHaveSkills: string[];
  _new?: boolean;
}

export interface AutoApplyAttempt {
  id: string;
  ruleId: string;
  company: string;
  title: string;
  portal: string;
  outcome: "prepared" | "submitted" | "dismissed" | "skipped" | "blocked";
  reason: string;
  applicationId: string | null;
  fitScore: number;
  fitReasons: string[];
  coverLetter: string;
  jobUrl: string;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string;
  arrangement: string;
  createdAt?: string;
}

export interface AutoApplyRunResult {
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
