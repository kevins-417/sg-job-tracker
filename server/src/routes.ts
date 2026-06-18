import { Router } from "express";
import { applicationSchema, companySchema, autoApplyRuleSchema, searchProfileSchema, userSchema } from "./validators.js";
import * as appsRepo from "./repositories/applications.js";
import * as coRepo from "./repositories/companies.js";
import * as autoRepo from "./repositories/autoApply.js";
import * as userRepo from "./repositories/users.js";

export const api = Router();

const wrap =
  (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) =>
    fn(req, res).catch(next);

// ---- Current-user middleware ----
// The client sends the picked user's id in the x-user-id header. We read it into
// req.userId. Empty string means "no user selected" — such requests only see
// legacy/shared data and can't be attributed to anyone. (Mock-up: no password,
// no real session — see README.)
api.use((req: any, _res: any, next: any) => {
  const h = req.headers["x-user-id"];
  req.userId = typeof h === "string" ? h : "";
  next();
});

// ---------- Users (pick-a-name login) ----------
api.get("/users", wrap(async (_req, res) => {
  res.json(await userRepo.listUsers());
}));

api.post("/users", wrap(async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  res.status(201).json(await userRepo.createUser(parsed.data.name, parsed.data.headline));
}));

api.delete("/users/:id", wrap(async (req, res) => {
  const ok = await userRepo.deleteUser(req.params.id);
  if (!ok) return res.status(404).json({ error: "User not found" });
  res.status(204).end();
}));

// ---------- Applications ----------
api.get("/applications", wrap(async (req, res) => {
  res.json(await appsRepo.listApplications(req.userId));
}));

api.get("/applications/:id", wrap(async (req, res) => {
  const found = await appsRepo.getApplication(req.params.id, req.userId);
  if (!found) return res.status(404).json({ error: "Application not found" });
  res.json(found);
}));

api.post("/applications", wrap(async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  res.status(201).json(await appsRepo.createApplication(parsed.data, req.userId));
}));

api.put("/applications/:id", wrap(async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  const updated = await appsRepo.updateApplication(req.params.id, parsed.data, req.userId);
  if (!updated) return res.status(404).json({ error: "Application not found" });
  res.json(updated);
}));

api.delete("/applications/:id", wrap(async (req, res) => {
  const ok = await appsRepo.deleteApplication(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: "Application not found" });
  res.status(204).end();
}));

// ---------- Companies ----------
api.get("/companies", wrap(async (req, res) => {
  res.json(await coRepo.listCompanies(req.userId));
}));

api.post("/companies", wrap(async (req, res) => {
  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  res.status(201).json(await coRepo.upsertCompany(parsed.data, req.userId));
}));

api.delete("/companies/:id", wrap(async (req, res) => {
  const ok = await coRepo.deleteCompany(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: "Company not found" });
  res.status(204).end();
}));

// ---------- Resumes ----------
api.get("/resumes", wrap(async (req, res) => {
  res.json(await coRepo.listResumes(req.userId));
}));

// ---------- Search profiles ----------
api.get("/profiles", wrap(async (req, res) => {
  res.json(await autoRepo.listProfiles(req.userId));
}));

api.post("/profiles", wrap(async (req, res) => {
  const parsed = searchProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  res.status(201).json(await autoRepo.upsertProfile(parsed.data, req.userId));
}));

api.delete("/profiles/:id", wrap(async (req, res) => {
  const ok = await autoRepo.deleteProfile(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: "Profile not found" });
  res.status(204).end();
}));

// ---------- Auto-apply ----------
api.get("/auto-apply/rules", wrap(async (req, res) => {
  const profileId = typeof req.query.profileId === "string" ? req.query.profileId : undefined;
  res.json(await autoRepo.listRules(req.userId, profileId));
}));

api.post("/auto-apply/rules", wrap(async (req, res) => {
  const parsed = autoApplyRuleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  res.status(201).json(await autoRepo.upsertRule(parsed.data, req.userId));
}));

api.delete("/auto-apply/rules/:id", wrap(async (req, res) => {
  const ok = await autoRepo.deleteRule(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: "Rule not found" });
  res.status(204).end();
}));

api.post("/auto-apply/rules/:id/run", wrap(async (req, res) => {
  try { res.json(await autoRepo.runRule(req.params.id, req.userId)); }
  catch (e) { res.status(404).json({ error: (e as Error).message }); }
}));

api.post("/auto-apply/refresh", wrap(async (req, res) => {
  const rules = await autoRepo.listRules(req.userId);
  let prepared = 0, ran = 0;
  for (const r of rules) {
    if (!r.enabled) continue;
    const result = await autoRepo.runRule(r.id, req.userId);
    prepared += result.prepared; ran++;
  }
  res.json({ ran, prepared });
}));

api.get("/auto-apply/queue", wrap(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? "6"), 10) || 6));
  const profileId = typeof req.query.profileId === "string" && req.query.profileId ? req.query.profileId : undefined;
  res.json(await autoRepo.listQueue(req.userId, page, pageSize, profileId));
}));

api.get("/auto-apply/applied", wrap(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? "6"), 10) || 6));
  res.json(await autoRepo.listApplied(req.userId, page, pageSize));
}));

api.get("/auto-apply/attempts", wrap(async (req, res) => {
  const ruleId = typeof req.query.ruleId === "string" ? req.query.ruleId : undefined;
  res.json(await autoRepo.listAttempts(req.userId, ruleId));
}));

api.put("/auto-apply/attempts/:id/cover", wrap(async (req, res) => {
  const cover = typeof req.body?.coverLetter === "string" ? req.body.coverLetter : "";
  const updated = await autoRepo.updateCoverLetter(req.params.id, cover, req.userId);
  if (!updated) return res.status(404).json({ error: "Prepared item not found" });
  res.json(updated);
}));

api.post("/auto-apply/attempts/:id/submit", wrap(async (req, res) => {
  const result = await autoRepo.markSubmitted(req.params.id, req.userId);
  if (!result) return res.status(404).json({ error: "Item not found" });
  res.json(result);
}));

api.post("/auto-apply/attempts/:id/dismiss", wrap(async (req, res) => {
  const updated = await autoRepo.dismissAttempt(req.params.id, req.userId);
  if (!updated) return res.status(404).json({ error: "Item not found" });
  res.json(updated);
}));
