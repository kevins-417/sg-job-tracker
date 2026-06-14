import type {
  Application, Company, Resume, AutoApplyRule, AutoApplyAttempt, AutoApplyRunResult,
} from "./types";

// Empty in dev (Vite proxy forwards /api to :4000). In production set
// VITE_API_BASE to the deployed API origin, e.g. https://sgjt-api.onrender.com
const BASE = import.meta.env.VITE_API_BASE ?? "";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* response had no JSON body */
    }
    throw new Error(`${res.status} ${res.statusText} ${detail}`.trim());
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Applications
  listApplications: () => http<Application[]>("/applications"),
  createApplication: (body: Application) =>
    http<Application>("/applications", { method: "POST", body: JSON.stringify(body) }),
  updateApplication: (id: string, body: Application) =>
    http<Application>(`/applications/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteApplication: (id: string) =>
    http<void>(`/applications/${id}`, { method: "DELETE" }),

  // Companies
  listCompanies: () => http<Company[]>("/companies"),
  upsertCompany: (body: Company) =>
    http<Company>("/companies", { method: "POST", body: JSON.stringify(body) }),
  deleteCompany: (id: string) =>
    http<void>(`/companies/${id}`, { method: "DELETE" }),

  // Resumes
  listResumes: () => http<Resume[]>("/resumes"),

  // Auto-apply (Phase 2 preview)
  listRules: () => http<AutoApplyRule[]>("/auto-apply/rules"),
  upsertRule: (body: AutoApplyRule) =>
    http<AutoApplyRule>("/auto-apply/rules", { method: "POST", body: JSON.stringify(body) }),
  deleteRule: (id: string) =>
    http<void>(`/auto-apply/rules/${id}`, { method: "DELETE" }),
  runRule: (id: string) =>
    http<AutoApplyRunResult>(`/auto-apply/rules/${id}/run`, { method: "POST" }),
  listAttempts: (ruleId?: string) =>
    http<AutoApplyAttempt[]>(`/auto-apply/attempts${ruleId ? `?ruleId=${ruleId}` : ""}`),
};
