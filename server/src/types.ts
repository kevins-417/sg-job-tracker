// Domain types shared across the server. The client keeps its own copy in
// client/src/lib/types.ts — keep the two in sync, or extract to a shared
// workspace package later.

export interface TimelineEntry {
  id: string;
  date: string; // ISO date (yyyy-mm-dd)
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
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
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
  createdAt?: string;
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
