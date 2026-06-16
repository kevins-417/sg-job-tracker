import { Router } from "express";
import { applicationSchema, companySchema, autoApplyRuleSchema, searchProfileSchema } from "./validators.js";
import * as appsRepo from "./repositories/applications.js";
import * as coRepo from "./repositories/companies.js";
import * as autoRepo from "./repositories/autoApply.js";

export const api = Router();

// ---- helper to wrap async handlers and forward errors ----
const wrap =
  (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) =>
    fn(req, res).catch(next);

// ---------- Applications ----------
api.get("/applications", wrap(async (_req, res) => {
  res.json(await appsRepo.listApplications());
}));

api.get("/applications/:id", wrap(async (req, res) => {
  const found = await appsRepo.getApplication(req.params.id);
  if (!found) return res.status(404).json({ error: "Application not found" });
  res.json(found);
}));

api.post("/applications", wrap(async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }
  res.status(201).json(await appsRepo.createApplication(parsed.data));
}));

api.put("/applications/:id", wrap(async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }
  const updated = await appsRepo.updateApplication(req.params.id, parsed.data);
  if (!updated) return res.status(404).json({ error: "Application not found" });
  res.json(updated);
}));

api.delete("/applications/:id", wrap(async (req, res) => {
  const ok = await appsRepo.deleteApplication(req.params.id);
  if (!ok) return res.status(404).json({ error: "Application not found" });
  res.status(204).end();
}));

// ---------- Companies ----------
api.get("/companies", wrap(async (_req, res) => {
  res.json(await coRepo.listCompanies());
}));

api.post("/companies", wrap(async (req, res) => {
  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }
  res.status(201).json(await coRepo.upsertCompany(parsed.data));
}));

api.delete("/companies/:id", wrap(async (req, res) => {
  const ok = await coRepo.deleteCompany(req.params.id);
  if (!ok) return res.status(404).json({ error: "Company not found" });
  res.status(204).end();
}));

// ---------- Resumes (read-only stub; extend with POST/PUT as needed) ----------
api.get("/resumes", wrap(async (_req, res) => {
  res.json(await coRepo.listResumes());
}));

// ---------- Search profiles ----------
api.get("/profiles", wrap(async (_req, res) => {
  res.json(await autoRepo.listProfiles());
}));

api.post("/profiles", wrap(async (req, res) => {
  const parsed = searchProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  res.status(201).json(await autoRepo.upsertProfile(parsed.data));
}));

api.delete("/profiles/:id", wrap(async (req, res) => {
  const ok = await autoRepo.deleteProfile(req.params.id);
  if (!ok) return res.status(404).json({ error: "Profile not found" });
  res.status(204).end();
}));

// ---------- Auto-apply (prepare-and-review queue) ----------
// Rules can be scoped to a profile via ?profileId=.
api.get("/auto-apply/rules", wrap(async (req, res) => {
  const profileId = typeof req.query.profileId === "string" ? req.query.profileId : undefined;
  res.json(await autoRepo.listRules(profileId));
}));

api.post("/auto-apply/rules", wrap(async (req, res) => {
  const parsed = autoApplyRuleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  res.status(201).json(await autoRepo.upsertRule(parsed.data));
}));

api.delete("/auto-apply/rules/:id", wrap(async (req, res) => {
  const ok = await autoRepo.deleteRule(req.params.id);
  if (!ok) return res.status(404).json({ error: "Rule not found" });
  res.status(204).end();
}));

// Manually refresh a single rule.
api.post("/auto-apply/rules/:id/run", wrap(async (req, res) => {
  try { res.json(await autoRepo.runRule(req.params.id)); }
  catch (e) { res.status(404).json({ error: (e as Error).message }); }
}));

// Manually refresh ALL eligible rules (the "Refresh now" button).
api.post("/auto-apply/refresh", wrap(async (_req, res) => {
  // Force-run every enabled rule regardless of last_run timing.
  const rules = await autoRepo.listRules();
  let prepared = 0, ran = 0;
  for (const r of rules) {
    if (!r.enabled) continue;
    const result = await autoRepo.runRule(r.id);
    prepared += result.prepared; ran++;
  }
  res.json({ ran, prepared });
}));

// Paginated review queue. ?page=&pageSize=&profileId=
api.get("/auto-apply/queue", wrap(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? "6"), 10) || 6));
  const profileId = typeof req.query.profileId === "string" && req.query.profileId ? req.query.profileId : undefined;
  res.json(await autoRepo.listQueue(page, pageSize, profileId));
}));

// Paginated applied feed (greyed-out, already submitted). ?page=&pageSize=
api.get("/auto-apply/applied", wrap(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? "6"), 10) || 6));
  res.json(await autoRepo.listApplied(page, pageSize));
}));

api.get("/auto-apply/attempts", wrap(async (req, res) => {
  const ruleId = typeof req.query.ruleId === "string" ? req.query.ruleId : undefined;
  res.json(await autoRepo.listAttempts(ruleId));
}));

api.put("/auto-apply/attempts/:id/cover", wrap(async (req, res) => {
  const cover = typeof req.body?.coverLetter === "string" ? req.body.coverLetter : "";
  const updated = await autoRepo.updateCoverLetter(req.params.id, cover);
  if (!updated) return res.status(404).json({ error: "Prepared item not found" });
  res.json(updated);
}));

api.post("/auto-apply/attempts/:id/submit", wrap(async (req, res) => {
  const result = await autoRepo.markSubmitted(req.params.id);
  if (!result) return res.status(404).json({ error: "Item not found" });
  res.json(result);
}));

api.post("/auto-apply/attempts/:id/dismiss", wrap(async (req, res) => {
  const updated = await autoRepo.dismissAttempt(req.params.id);
  if (!updated) return res.status(404).json({ error: "Item not found" });
  res.json(updated);
}));
