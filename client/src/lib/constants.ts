import type { Application, Palette } from "./types";

export const STATUSES = [
  "Draft", "Applied", "Viewed", "Shortlisted", "Recruiter Contacted",
  "HR Interview", "Technical Interview", "Hiring Manager Interview",
  "Final Interview", "Assessment", "Offer Received", "Offer Accepted",
  "Offer Declined", "Rejected", "Withdrawn",
] as const;

export const KANBAN_COLUMNS = [
  { id: "Draft", label: "Draft", members: ["Draft"] },
  { id: "Applied", label: "Applied", members: ["Applied", "Viewed"] },
  { id: "Shortlisted", label: "Shortlisted", members: ["Shortlisted", "Recruiter Contacted"] },
  { id: "Interviewing", label: "Interviewing", members: ["HR Interview", "Technical Interview", "Hiring Manager Interview", "Final Interview", "Assessment"] },
  { id: "Offer", label: "Offer", members: ["Offer Received", "Offer Accepted", "Offer Declined"] },
  { id: "Closed", label: "Closed", members: ["Rejected", "Withdrawn"] },
] as const;

export const STATUS_TONE: Record<string, string> = {
  Draft: "slate", Applied: "blue", Viewed: "blue", Shortlisted: "violet",
  "Recruiter Contacted": "violet", "HR Interview": "amber", "Technical Interview": "amber",
  "Hiring Manager Interview": "amber", "Final Interview": "amber", Assessment: "amber",
  "Offer Received": "jade", "Offer Accepted": "jade", "Offer Declined": "rose",
  Rejected: "rose", Withdrawn: "slate",
};

export const PORTALS = [
  "MyCareersFuture", "LinkedIn Jobs", "JobStreet Singapore",
  "Indeed Singapore", "Foundit Singapore", "Glints Singapore", "Direct / Referral",
] as const;

export const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Logistics & Supply Chain",
  "Manufacturing", "Government", "Education", "Retail & FMCG", "Professional Services",
] as const;

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"] as const;

export const WORK_ARRANGEMENTS = ["on-site", "hybrid", "remote"] as const;

export const COMPANY_SIZES = ["startup", "mid", "large"] as const;
export const SENIORITY_BANDS = ["junior", "mid", "senior", "lead"] as const;
export const FRESHNESS_OPTIONS = ["any", "24h", "week", "month"] as const;
export const FRESHNESS_LABELS: Record<string, string> = {
  any: "Any time", "24h": "Last 24 hours", week: "Last week", month: "Last month",
};

// Singapore work-pass salary thresholds (monthly, SGD). Illustrative — these
// rise with age and change over time. Verify against MOM before relying on them.
export const EP_MIN_SALARY = 5600;
export const EP_MIN_FINANCIAL = 6200;
export const SPASS_MIN_SALARY = 3150;

export const INDUSTRY_BENCHMARK: Record<string, number> = {
  Technology: 7000, "Finance & Banking": 8000, Healthcare: 5500,
  "Logistics & Supply Chain": 5000, Manufacturing: 5200, Government: 6000,
  Education: 4800, "Retail & FMCG": 4500, "Professional Services": 6500,
};

export const TONE: Record<string, { dot: string; bg: string; fg: string; dk: string }> = {
  jade:   { dot: "#0d9488", bg: "rgba(13,148,136,.12)",  fg: "#0f766e", dk: "#2dd4bf" },
  blue:   { dot: "#2563eb", bg: "rgba(37,99,235,.12)",   fg: "#1d4ed8", dk: "#60a5fa" },
  violet: { dot: "#7c3aed", bg: "rgba(124,58,237,.12)",  fg: "#6d28d9", dk: "#a78bfa" },
  amber:  { dot: "#d97706", bg: "rgba(217,119,6,.12)",   fg: "#b45309", dk: "#fbbf24" },
  rose:   { dot: "#e11d48", bg: "rgba(225,29,72,.12)",   fg: "#be123c", dk: "#fb7185" },
  slate:  { dot: "#64748b", bg: "rgba(100,116,139,.12)", fg: "#475569", dk: "#94a3b8" },
};

export function palette(dark: boolean): Palette {
  return dark
    ? {
        bg: "#0e1414", panel: "#161e1d", border: "#243130", track: "#1d2726",
        text: "#e7edec", dim: "#8a9a98", accent: "#14b8a6", accentDk: "#2dd4bf",
        accentSoft: "rgba(20,184,166,.16)",
      }
    : {
        bg: "#f6f8f7", panel: "#ffffff", border: "#e6ebe9", track: "#eef2f1",
        text: "#16201f", dim: "#69767d", accent: "#0d9488", accentDk: "#2dd4bf",
        accentSoft: "rgba(13,148,136,.10)",
      };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (iso: string): string =>
  iso
    ? new Date(iso + "T00:00:00").toLocaleDateString("en-SG", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

export const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export function blankApp(): Application {
  return {
    id: uid(), dateApplied: todayISO(), company: "", title: "", jobFunction: "",
    industry: "Technology", portal: "LinkedIn Jobs", recruiterName: "", recruiterEmail: "",
    recruiterPhone: "", salaryMin: null, salaryMax: null, location: "Singapore",
    employmentType: "Full-time", status: "Applied", jobDescription: "",
    resumeId: "", nextActionDate: "", timeline: [], interviews: [],
  };
}
