import { Router } from "express";
import { applicationSchema, companySchema, autoApplyRuleSchema } from "./validators.js";
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

// ---------- Auto-apply (Phase 2 preview) ----------
// Rule-driven, review-first job auto-drafting. Does NOT submit to external
// portals — see repositories/autoApply.ts for the guardrails.
api.get("/auto-apply/rules", wrap(async (_req, res) => {
  res.json(await autoRepo.listRules());
}));

api.post("/auto-apply/rules", wrap(async (req, res) => {
  const parsed = autoApplyRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }
  res.status(201).json(await autoRepo.upsertRule(parsed.data));
}));

api.delete("/auto-apply/rules/:id", wrap(async (req, res) => {
  const ok = await autoRepo.deleteRule(req.params.id);
  if (!ok) return res.status(404).json({ error: "Rule not found" });
  res.status(204).end();
}));

api.get("/auto-apply/attempts", wrap(async (req, res) => {
  const ruleId = typeof req.query.ruleId === "string" ? req.query.ruleId : undefined;
  res.json(await autoRepo.listAttempts(ruleId));
}));

// Runs the matcher for one rule against the mock feed. In draft mode this
// creates Draft applications; in submit mode it refuses and logs why.
api.post("/auto-apply/rules/:id/run", wrap(async (req, res) => {
  try {
    res.json(await autoRepo.runRule(req.params.id));
  } catch (e) {
    res.status(404).json({ error: (e as Error).message });
  }
}));
