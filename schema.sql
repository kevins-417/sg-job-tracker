import { z } from "zod";

const timelineEntry = z.object({
  id: z.string(),
  date: z.string(),
  label: z.string(),
});

const interview = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string().default(""),
  type: z.string().default(""),
  interviewer: z.string().default(""),
  link: z.string().default(""),
  notes: z.string().default(""),
  outcome: z.string().default(""),
});

export const applicationSchema = z.object({
  id: z.string().optional(),
  dateApplied: z.string(),
  company: z.string().min(1, "company is required"),
  title: z.string().min(1, "title is required"),
  jobFunction: z.string().default(""),
  industry: z.string().default(""),
  portal: z.string().default(""),
  recruiterName: z.string().default(""),
  recruiterEmail: z.string().default(""),
  recruiterPhone: z.string().default(""),
  salaryMin: z.union([z.number(), z.null()]).default(null),
  salaryMax: z.union([z.number(), z.null()]).default(null),
  location: z.string().default(""),
  employmentType: z.string().default(""),
  status: z.string().default("Applied"),
  jobDescription: z.string().default(""),
  resumeId: z.string().default(""),
  nextActionDate: z.string().default(""),
  timeline: z.array(timelineEntry).default([]),
  interviews: z.array(interview).default([]),
});

export const companySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "name is required"),
  industry: z.string().default(""),
  website: z.string().default(""),
  glassdoor: z.string().default(""),
  hq: z.string().default(""),
  sgOffice: z.string().default(""),
  employees: z.string().default(""),
  notes: z.string().default(""),
});

export const autoApplyRuleSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "label is required"),
  enabled: z.boolean().default(false),
  keywords: z.string().default(""),
  industries: z.array(z.string()).default([]),
  portals: z.array(z.string()).default([]),
  minSalary: z.union([z.number(), z.null()]).default(null),
  resumeId: z.string().default(""),
  mode: z.enum(["draft", "submit"]).default("draft"),
  requireReview: z.boolean().default(true),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type AutoApplyRuleInput = z.infer<typeof autoApplyRuleSchema>;
