import React, { useEffect, useState } from "react";
import { Plus, Play, Trash2, Pencil, Zap, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react";
import type { AutoApplyRule, AutoApplyAttempt, AutoApplyRunResult, Palette, Resume } from "../lib/types";
import { INDUSTRIES, PORTALS, TONE, uid, fmtDate } from "../lib/constants";
import { api } from "../lib/api";
import {
  Card, CardTitle, SectionHead, Empty, Modal, Field, Input, SelectInput, Chips,
} from "../components/ui";

interface Props {
  resumes: Resume[];
  C: Palette;
  dark: boolean;
  onDataChanged: () => void; // ask App to refresh applications after a run
}

const emptyRule = (): AutoApplyRule => ({
  id: uid(), label: "", enabled: false, keywords: "", industries: [], portals: [],
  minSalary: null, resumeId: "", mode: "draft", requireReview: true, _new: true,
});

export default function AutoApply({ resumes, C, dark, onDataChanged }: Props) {
  const [rules, setRules] = useState<AutoApplyRule[]>([]);
  const [attempts, setAttempts] = useState<AutoApplyAttempt[]>([]);
  const [editing, setEditing] = useState<AutoApplyRule | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<AutoApplyRunResult | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [r, a] = await Promise.all([api.listRules(), api.listAttempts()]);
    setRules(r);
    setAttempts(a);
  };

  useEffect(() => { (async () => { try { await refresh(); } finally { setLoading(false); } })(); }, []);

  const save = async () => {
    if (!editing || !editing.label.trim()) return;
    const { _new, ...clean } = editing;
    await api.upsertRule(clean);
    setEditing(null);
    await refresh();
  };

  const remove = async (id: string) => {
    await api.deleteRule(id);
    await refresh();
  };

  const run = async (id: string) => {
    setRunning(id);
    setLastRun(null);
    try {
      const result = await api.runRule(id);
      setLastRun(result);
      await refresh();
      if (result.drafted > 0) onDataChanged();
    } finally {
      setRunning(null);
    }
  };

  const toggleIn = (key: "industries" | "portals", v: string) => {
    if (!editing) return;
    const set = new Set(editing[key]);
    set.has(v) ? set.delete(v) : set.add(v);
    setEditing({ ...editing, [key]: [...set] });
  };

  const danger = dark ? TONE.rose.dk : TONE.rose.dot;
  const jade = dark ? TONE.jade.dk : TONE.jade.fg;
  const amber = dark ? TONE.amber.dk : TONE.amber.fg;

  const outcomeColor = (o: AutoApplyAttempt["outcome"]) =>
    o === "drafted" ? jade : o === "blocked" ? danger : C.dim;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SectionHead title="Auto-apply" sub="Rule-driven drafting — you review before anything is sent" C={C} noMargin />
        <button onClick={() => setEditing(emptyRule())} className="sgjt-primary"
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: "none", cursor: "pointer", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.6} /> New rule
        </button>
      </div>

      {/* How it works / scope note */}
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start", background: dark ? "rgba(217,119,6,.12)" : "rgba(217,119,6,.08)", border: `1px solid ${dark ? "rgba(217,119,6,.3)" : "rgba(217,119,6,.25)"}`, borderRadius: 12, padding: "13px 15px" }}>
        <ShieldAlert size={18} color={amber} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55 }}>
          <strong>Preview feature.</strong> A rule scans a sample job feed and, in <em>draft mode</em>, creates Draft applications matching your criteria for you to review and submit yourself. <em>Submit mode</em> is intentionally blocked — unattended submission to MyCareersFuture, LinkedIn, JobStreet and other portals isn't implemented, since each has its own terms of service. Wiring a real feed is Phase 2 work.
        </div>
      </div>

      {lastRun && (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 15px", display: "flex", gap: 11, alignItems: "flex-start" }}>
          {lastRun.mode === "submit"
            ? <ShieldAlert size={18} color={danger} style={{ flexShrink: 0, marginTop: 1 }} />
            : <CheckCircle2 size={18} color={jade} style={{ flexShrink: 0, marginTop: 1 }} />}
          <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              Considered {lastRun.considered} · matched {lastRun.matched} · drafted {lastRun.drafted}{lastRun.blocked ? ` · blocked ${lastRun.blocked}` : ""}
            </div>
            {lastRun.notice}
          </div>
        </div>
      )}

      {loading ? (
        <Card C={C}><div style={{ padding: 20, color: C.dim, fontSize: 13, textAlign: "center" }}>Loading…</div></Card>
      ) : rules.length === 0 ? (
        <Card C={C}><Empty C={C} text="No auto-apply rules yet. Create one to describe the roles you'd like drafted automatically." /></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
          {rules.map((r) => (
            <Card key={r.id} C={C}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={16} color={r.enabled ? jade : C.dim} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.label}</div>
                    <div style={{ fontSize: 11.5, color: r.enabled ? jade : C.dim, fontWeight: 600 }}>
                      {r.enabled ? "Enabled" : "Disabled"} · {r.mode === "submit" ? "Submit (blocked)" : "Draft mode"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => setEditing(r)} className="sgjt-icon" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.dim, padding: 6, borderRadius: 7 }}><Pencil size={14} /></button>
                  <button onClick={() => remove(r.id)} className="sgjt-icon" style={{ border: "none", background: "transparent", cursor: "pointer", color: danger, padding: 6, borderRadius: 7 }}><Trash2 size={14} /></button>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: C.dim }}>
                {r.keywords && <div><span style={{ color: C.text, fontWeight: 600 }}>Keywords:</span> {r.keywords}</div>}
                {r.industries.length > 0 && <div><span style={{ color: C.text, fontWeight: 600 }}>Industries:</span> {r.industries.join(", ")}</div>}
                {r.portals.length > 0 && <div><span style={{ color: C.text, fontWeight: 600 }}>Portals:</span> {r.portals.join(", ")}</div>}
                {r.minSalary != null && <div><span style={{ color: C.text, fontWeight: 600 }}>Min salary:</span> S${r.minSalary.toLocaleString()}/mo</div>}
              </div>

              <button onClick={() => run(r.id)} disabled={running === r.id}
                style={{
                  marginTop: 14, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "9px 14px", borderRadius: 9, border: `1px solid ${C.border}`, cursor: running === r.id ? "wait" : "pointer",
                  background: C.track, color: C.text, fontSize: 13, fontWeight: 600,
                }}>
                <Play size={14} /> {running === r.id ? "Running…" : "Run now"}
              </button>
            </Card>
          ))}
        </div>
      )}

      <Card C={C} pad={0}>
        <div style={{ padding: "14px 18px", borderBottom: attempts.length ? `1px solid ${C.border}` : "none" }}>
          <CardTitle C={C} noMargin>Recent activity</CardTitle>
        </div>
        {attempts.length === 0 ? <div style={{ padding: 18 }}><Empty C={C} text="No runs yet. Enable a rule and hit Run now." /></div> : attempts.slice(0, 20).map((a, i) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < Math.min(attempts.length, 20) - 1 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: outcomeColor(a.outcome), flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.title} · {a.company}</div>
              <div style={{ fontSize: 11.5, color: C.dim }}>{a.portal} · {a.reason}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: outcomeColor(a.outcome), textTransform: "capitalize" }}>{a.outcome}</span>
          </div>
        ))}
      </Card>

      {editing && (
        <Modal title={editing._new ? "New auto-apply rule" : "Edit rule"} C={C} onClose={() => setEditing(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Rule name" C={C}><Input value={editing.label} onChange={(v) => setEditing({ ...editing, label: v })} C={C} /></Field>

            <Field label="Keywords (comma-separated, matches title or company)" C={C}>
              <Input value={editing.keywords} onChange={(v) => setEditing({ ...editing, keywords: v })} C={C} />
            </Field>

            <Field label="Industries" C={C}>
              <Chips options={INDUSTRIES} selected={editing.industries} onToggle={(v) => toggleIn("industries", v)} C={C} dark={dark} />
            </Field>

            <Field label="Portals" C={C}>
              <Chips options={PORTALS} selected={editing.portals} onToggle={(v) => toggleIn("portals", v)} C={C} dark={dark} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Min salary (SGD/mo)" C={C}>
                <Input type="number" value={editing.minSalary ?? ""} onChange={(v) => setEditing({ ...editing, minSalary: v === "" ? null : Number(v) })} C={C} />
              </Field>
              <Field label="Resume to attach" C={C}>
                <SelectInput value={editing.resumeId} onChange={(v) => setEditing({ ...editing, resumeId: v })} options={["", ...resumes.map((x) => x.id)]} labels={{ "": "— none —", ...Object.fromEntries(resumes.map((x) => [x.id, x.name])) }} C={C} />
              </Field>
              <Field label="Mode" C={C}>
                <SelectInput value={editing.mode} onChange={(v) => setEditing({ ...editing, mode: v as AutoApplyRule["mode"] })} options={["draft", "submit"]} labels={{ draft: "Draft for review", submit: "Submit (blocked)" }} C={C} />
              </Field>
            </div>

            {editing.mode === "submit" && (
              <div style={{ fontSize: 12, color: danger, background: dark ? "rgba(225,29,72,.1)" : "rgba(225,29,72,.07)", borderRadius: 9, padding: "10px 12px", lineHeight: 1.5 }}>
                Submit mode won't send anything — the server blocks it and logs each match instead. Use draft mode to queue applications you can review and submit yourself.
              </div>
            )}

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
    </div>
  );
}
