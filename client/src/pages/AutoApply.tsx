import React, { useEffect, useState } from "react";
import {
  Plus, Play, Trash2, Pencil, Zap, ShieldCheck, ExternalLink, CheckCircle2, X, FileText,
} from "lucide-react";
import type { AutoApplyRule, AutoApplyAttempt, AutoApplyRunResult, Palette, Resume } from "../lib/types";
import { INDUSTRIES, PORTALS, WORK_ARRANGEMENTS, TONE, uid } from "../lib/constants";
import { api } from "../lib/api";
import {
  Card, CardTitle, SectionHead, Empty, Modal, Field, Input, SelectInput, Chips, Textarea,
} from "../components/ui";

interface Props {
  resumes: Resume[];
  C: Palette;
  dark: boolean;
  onDataChanged: () => void;
}

const emptyRule = (): AutoApplyRule => ({
  id: uid(), label: "", enabled: false, keywords: "", industries: [], portals: [],
  minSalary: null, resumeId: "", mode: "draft", requireReview: true,
  titles: [], skills: [], locations: [], arrangements: [], minExperience: null,
  coverTemplate: "", _new: true,
});

// comma-separated string <-> string[] helpers for free-text list fields
const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const fromList = (a: string[]) => a.join(", ");

export default function AutoApply({ resumes, C, dark, onDataChanged }: Props) {
  const [rules, setRules] = useState<AutoApplyRule[]>([]);
  const [queue, setQueue] = useState<AutoApplyAttempt[]>([]);
  const [editing, setEditing] = useState<AutoApplyRule | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<AutoApplyRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingCover, setEditingCover] = useState<AutoApplyAttempt | null>(null);

  const refresh = async () => {
    const [r, q] = await Promise.all([api.listRules(), api.listQueue()]);
    setRules(r);
    setQueue(q);
  };

  useEffect(() => { (async () => { try { await refresh(); } finally { setLoading(false); } })(); }, []);

  const save = async () => {
    if (!editing || !editing.label.trim()) return;
    const { _new, ...clean } = editing;
    await api.upsertRule(clean);
    setEditing(null);
    await refresh();
  };

  const remove = async (id: string) => { await api.deleteRule(id); await refresh(); };

  const run = async (id: string) => {
    setRunning(id); setLastRun(null);
    try {
      const result = await api.runRule(id);
      setLastRun(result);
      await refresh();
    } finally { setRunning(null); }
  };

  const submit = async (a: AutoApplyAttempt) => {
    setBusy(a.id);
    try {
      // Open the portal so the user can actually submit there.
      if (a.jobUrl) window.open(a.jobUrl, "_blank", "noopener");
      await api.submitAttempt(a.id);
      await refresh();
      onDataChanged(); // a tracked application was created
    } finally { setBusy(null); }
  };

  const dismiss = async (a: AutoApplyAttempt) => {
    setBusy(a.id);
    try { await api.dismissAttempt(a.id); await refresh(); }
    finally { setBusy(null); }
  };

  const saveCover = async () => {
    if (!editingCover) return;
    setBusy(editingCover.id);
    try {
      await api.updateCover(editingCover.id, editingCover.coverLetter);
      setEditingCover(null);
      await refresh();
    } finally { setBusy(null); }
  };

  const toggleIn = (key: "industries" | "portals" | "arrangements", v: string) => {
    if (!editing) return;
    const set = new Set(editing[key]);
    set.has(v) ? set.delete(v) : set.add(v);
    setEditing({ ...editing, [key]: [...set] });
  };

  const danger = dark ? TONE.rose.dk : TONE.rose.dot;
  const jade = dark ? TONE.jade.dk : TONE.jade.fg;

  const scoreColor = (s: number) => (s >= 75 ? jade : s >= 60 ? (dark ? TONE.amber.dk : TONE.amber.fg) : C.dim);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SectionHead title="Auto-apply" sub="Prepares tailored applications from your profile — you review and submit" C={C} noMargin />
        <button onClick={() => setEditing(emptyRule())} className="sgjt-primary"
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: "none", cursor: "pointer", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.6} /> New rule
        </button>
      </div>

      {/* Scope note */}
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start", background: dark ? "rgba(20,184,166,.1)" : "rgba(13,148,136,.07)", border: `1px solid ${dark ? "rgba(20,184,166,.28)" : "rgba(13,148,136,.22)"}`, borderRadius: 12, padding: "13px 15px" }}>
        <ShieldCheck size={18} color={jade} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55 }}>
          <strong>How this works.</strong> A rule scans available jobs and, for each strong match, prepares a ready-to-go application — a fit score, the reasons it matched, and a tailored cover letter you can edit. You review each one and click <em>Submit</em>, which opens the job posting so you submit it yourself and records it in your tracker. It never logs into job sites or sends anything on its own — that keeps your accounts safe and every application is one you've seen.
        </div>
      </div>

      {lastRun && (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 15px", display: "flex", gap: 11, alignItems: "flex-start" }}>
          <CheckCircle2 size={18} color={jade} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              Scanned {lastRun.considered} jobs · matched {lastRun.matched} · prepared {lastRun.prepared}{lastRun.belowThreshold ? ` · ${lastRun.belowThreshold} below fit bar` : ""}
            </div>
            {lastRun.notice}
          </div>
        </div>
      )}

      {/* Review queue */}
      <div>
        <CardTitle C={C}>Review queue {queue.length > 0 && <span style={{ color: C.dim, fontWeight: 600 }}>· {queue.length} ready</span>}</CardTitle>
        {loading ? (
          <Card C={C}><div style={{ padding: 20, color: C.dim, fontSize: 13, textAlign: "center" }}>Loading…</div></Card>
        ) : queue.length === 0 ? (
          <Card C={C}><Empty C={C} text="Nothing prepared yet. Set up a rule below, enable it, and click Run to fill your queue." /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {queue.map((a) => (
              <Card key={a.id} C={C}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{a.title}</div>
                    <div style={{ fontSize: 12.5, color: C.dim, marginTop: 1 }}>
                      {a.company} · {a.portal} · {a.location} · {a.arrangement}
                      {a.salaryMax ? ` · up to S$${a.salaryMax.toLocaleString()}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 750, color: scoreColor(a.fitScore), lineHeight: 1 }}>{a.fitScore}%</div>
                    <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>fit</div>
                  </div>
                </div>

                {a.fitReasons.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {a.fitReasons.map((r, i) => (
                      <span key={i} style={{ fontSize: 11.5, color: C.text, background: C.track, borderRadius: 7, padding: "4px 9px", lineHeight: 1.3 }}>{r}</span>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12, background: C.track, borderRadius: 10, padding: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: ".05em", display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={13} /> Tailored cover letter
                    </span>
                    <button onClick={() => setEditingCover(a)} className="sgjt-icon"
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: dark ? C.accentDk : C.accent, padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <Pencil size={12} /> Edit
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.55, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "hidden", position: "relative", maskImage: "linear-gradient(to bottom, black 70%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)" }}>
                    {a.coverLetter}
                  </div>
                </div>

                <div style={{ marginTop: 13, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => submit(a)} disabled={busy === a.id}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "none", cursor: busy === a.id ? "wait" : "pointer", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600 }}>
                    <ExternalLink size={15} /> Submit on {a.portal}
                  </button>
                  <button onClick={() => dismiss(a)} disabled={busy === a.id}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 9, border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", color: C.dim, fontSize: 13, fontWeight: 600 }}>
                    <X size={15} /> Dismiss
                  </button>
                </div>
                <div style={{ fontSize: 10.5, color: C.dim, marginTop: 8 }}>
                  "Submit" opens the posting in a new tab for you to apply, and logs it under Applications. It does not auto-send.
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rules */}
      <div>
        <CardTitle C={C}>Matching rules</CardTitle>
        {rules.length === 0 ? (
          <Card C={C}><Empty C={C} text="No rules yet. Create one to describe the jobs you want prepared." /></Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
            {rules.map((r) => (
              <Card key={r.id} C={C}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Zap size={16} color={r.enabled ? jade : C.dim} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.label}</div>
                      <div style={{ fontSize: 11.5, color: r.enabled ? jade : C.dim, fontWeight: 600 }}>{r.enabled ? "Enabled" : "Disabled"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button onClick={() => setEditing(r)} className="sgjt-icon" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.dim, padding: 6, borderRadius: 7 }}><Pencil size={14} /></button>
                    <button onClick={() => remove(r.id)} className="sgjt-icon" style={{ border: "none", background: "transparent", cursor: "pointer", color: danger, padding: 6, borderRadius: 7 }}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: C.dim }}>
                  {r.titles.length > 0 && <div><span style={{ color: C.text, fontWeight: 600 }}>Titles:</span> {r.titles.join(", ")}</div>}
                  {r.skills.length > 0 && <div><span style={{ color: C.text, fontWeight: 600 }}>Skills:</span> {r.skills.join(", ")}</div>}
                  {r.industries.length > 0 && <div><span style={{ color: C.text, fontWeight: 600 }}>Industries:</span> {r.industries.join(", ")}</div>}
                  {r.minSalary != null && <div><span style={{ color: C.text, fontWeight: 600 }}>Min salary:</span> S${r.minSalary.toLocaleString()}/mo</div>}
                  {r.arrangements.length > 0 && <div><span style={{ color: C.text, fontWeight: 600 }}>Arrangement:</span> {r.arrangements.join(", ")}</div>}
                  {r.locations.length > 0 && <div><span style={{ color: C.text, fontWeight: 600 }}>Locations:</span> {r.locations.join(", ")}</div>}
                </div>

                <button onClick={() => run(r.id)} disabled={running === r.id}
                  style={{ marginTop: 14, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 14px", borderRadius: 9, border: `1px solid ${C.border}`, cursor: running === r.id ? "wait" : "pointer", background: C.track, color: C.text, fontSize: 13, fontWeight: 600 }}>
                  <Play size={14} /> {running === r.id ? "Scanning…" : "Run now"}
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rule editor */}
      {editing && (
        <Modal title={editing._new ? "New matching rule" : "Edit rule"} C={C} onClose={() => setEditing(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Rule name" C={C}><Input value={editing.label} onChange={(v) => setEditing({ ...editing, label: v })} C={C} /></Field>

            <Field label="Job titles / types you want (comma-separated)" C={C}>
              <Input value={fromList(editing.titles)} onChange={(v) => setEditing({ ...editing, titles: toList(v) })} C={C} />
            </Field>

            <Field label="Key responsibilities / skills (comma-separated)" C={C}>
              <Input value={fromList(editing.skills)} onChange={(v) => setEditing({ ...editing, skills: toList(v) })} C={C} />
            </Field>

            <Field label="Industries" C={C}>
              <Chips options={INDUSTRIES} selected={editing.industries} onToggle={(v) => toggleIn("industries", v)} C={C} dark={dark} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Minimum salary (SGD/mo)" C={C}>
                <Input type="number" value={editing.minSalary ?? ""} onChange={(v) => setEditing({ ...editing, minSalary: v === "" ? null : Number(v) })} C={C} />
              </Field>
              <Field label="Minimum experience (years)" C={C}>
                <Input type="number" value={editing.minExperience ?? ""} onChange={(v) => setEditing({ ...editing, minExperience: v === "" ? null : Number(v) })} C={C} />
              </Field>
            </div>

            <Field label="Work arrangement" C={C}>
              <Chips options={WORK_ARRANGEMENTS} selected={editing.arrangements} onToggle={(v) => toggleIn("arrangements", v)} C={C} dark={dark} />
            </Field>

            <Field label="Preferred locations (comma-separated, optional)" C={C}>
              <Input value={fromList(editing.locations)} onChange={(v) => setEditing({ ...editing, locations: toList(v) })} C={C} />
            </Field>

            <Field label="Portals" C={C}>
              <Chips options={PORTALS} selected={editing.portals} onToggle={(v) => toggleIn("portals", v)} C={C} dark={dark} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Resume to attach" C={C}>
                <SelectInput value={editing.resumeId} onChange={(v) => setEditing({ ...editing, resumeId: v })} options={["", ...resumes.map((x) => x.id)]} labels={{ "": "— none —", ...Object.fromEntries(resumes.map((x) => [x.id, x.name])) }} C={C} />
              </Field>
              <div />
            </div>

            <Field label="Cover-letter style note (optional)" C={C}>
              <Textarea value={editing.coverTemplate} onChange={(v) => setEditing({ ...editing, coverTemplate: v })} C={C} />
            </Field>

            <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: C.text, cursor: "pointer" }}>
              <input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} style={{ width: 16, height: 16, accentColor: C.accent }} />
              Enable this rule
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button onClick={() => setEditing(null)} style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={save} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save rule</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cover-letter editor */}
      {editingCover && (
        <Modal title={`Edit cover letter — ${editingCover.company}`} C={C} onClose={() => setEditingCover(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <textarea
              value={editingCover.coverLetter}
              onChange={(e) => setEditingCover({ ...editingCover, coverLetter: e.target.value })}
              rows={18}
              style={{ width: "100%", padding: "12px 13px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, lineHeight: 1.55, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
              className="sgjt-input"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setEditingCover(null)} style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={saveCover} disabled={busy === editingCover.id} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save letter</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
