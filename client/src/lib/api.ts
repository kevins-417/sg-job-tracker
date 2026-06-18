import type {
  Application, Company, Resume, AutoApplyRule, AutoApplyAttempt, AutoApplyRunResult,
  SearchProfile, Page, User,
} from "./types";

// Empty in dev (Vite proxy forwards /api to :4000). In production set
// VITE_API_BASE to the deployed API origin, e.g. https://sgjt-api.onrender.com
const BASE = import.meta.env.VITE_API_BASE ?? "";

// The picked user's id is kept in localStorage and sent on every request so the
// server can scope data per user. Set via setCurrentUser() after pick-a-name.
export function getCurrentUserId(): string {
  try { return localStorage.getItem("sgjt:userId") || ""; } catch { return ""; }
}
export function setCurrentUserId(id: string) {
  try { id ? localStorage.setItem("sgjt:userId", id) : localStorage.removeItem("sgjt:userId"); } catch { /* ignore */ }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-user-id": getCurrentUserId(),
    },
    ...init,
    // ensure our header isn't overwritten by an init.headers without it
    ...(init?.headers ? { headers: { "Content-Type": "application/json", "x-user-id": getCurrentUserId(), ...init.headers } } : {}),
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
  // Users (pick-a-name login)
  listUsers: () => http<User[]>("/users"),
  createUser: (name: string, headline: string) =>
    http<User>("/users", { method: "POST", body: JSON.stringify({ name, headline }) }),
  deleteUser: (id: string) => http<void>(`/users/${id}`, { method: "DELETE" }),

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

  // Search profiles
  listProfiles: () => http<SearchProfile[]>("/profiles"),
  upsertProfile: (body: SearchProfile) =>
    http<SearchProfile>("/profiles", { method: "POST", body: JSON.stringify(body) }),
  deleteProfile: (id: string) => http<void>(`/profiles/${id}`, { method: "DELETE" }),

  // Auto-apply (prepare-and-review queue)
  listRules: (profileId?: string) =>
    http<AutoApplyRule[]>(`/auto-apply/rules${profileId ? `?profileId=${profileId}` : ""}`),
  upsertRule: (body: AutoApplyRule) =>
    http<AutoApplyRule>("/auto-apply/rules", { method: "POST", body: JSON.stringify(body) }),
  deleteRule: (id: string) =>
    http<void>(`/auto-apply/rules/${id}`, { method: "DELETE" }),
  runRule: (id: string) =>
    http<AutoApplyRunResult>(`/auto-apply/rules/${id}/run`, { method: "POST" }),
  refreshAll: () =>
    http<{ ran: number; prepared: number }>("/auto-apply/refresh", { method: "POST" }),
  listQueue: (page = 1, pageSize = 6, profileId?: string) =>
    http<Page<AutoApplyAttempt>>(`/auto-apply/queue?page=${page}&pageSize=${pageSize}${profileId ? `&profileId=${profileId}` : ""}`),
  listApplied: (page = 1, pageSize = 6) =>
    http<Page<AutoApplyAttempt>>(`/auto-apply/applied?page=${page}&pageSize=${pageSize}`),
  listAttempts: (ruleId?: string) =>
    http<AutoApplyAttempt[]>(`/auto-apply/attempts${ruleId ? `?ruleId=${ruleId}` : ""}`),
  updateCover: (id: string, coverLetter: string) =>
    http<AutoApplyAttempt>(`/auto-apply/attempts/${id}/cover`, { method: "PUT", body: JSON.stringify({ coverLetter }) }),
  submitAttempt: (id: string) =>
    http<{ applicationId: string }>(`/auto-apply/attempts/${id}/submit`, { method: "POST" }),
  dismissAttempt: (id: string) =>
    http<AutoApplyAttempt>(`/auto-apply/attempts/${id}/dismiss`, { method: "POST" }),
};
