import React, { useState, useMemo } from "react";
import {
  Plus, Pencil, MapPin, ExternalLink, Trash2, ChevronRight, ChevronDown, Briefcase, Building2,
} from "lucide-react";
import type { Application, Company, Palette } from "../lib/types";
import { INDUSTRIES, STATUS_TONE, TONE, uid, fmtDate } from "../lib/constants";
import { Card, SectionHead, Modal, Field, Input, SelectInput, Textarea, Badge, Empty } from "../components/ui";

interface Props {
  companies: Company[];
  apps: Application[];
  C: Palette;
  dark: boolean;
  onUpsert: (c: Company) => void;
  onDelete: (id: string) => void;
  onOpenApp: (id: string) => void;
}

// Stage grouping for the per-company summary. "Active" = still in play,
// "Offer" = any offer outcome, "Closed" = rejected/withdrawn.
const ACTIVE = ["Draft", "Applied", "Viewed", "Shortlisted", "Recruiter Contacted", "HR Interview", "Technical Interview", "Hiring Manager Interview", "Final Interview", "Assessment"];
const OFFER = ["Offer Received", "Offer Accepted", "Offer Declined"];
const CLOSED = ["Rejected", "Withdrawn"];

// Sort order so applications within a company list read best-stage-first.
const STAGE_ORDER: Record<string, number> = {
  "Offer Accepted": 0, "Offer Received": 1, "Final Interview": 2, "Hiring Manager Interview": 3,
  "Technical Interview": 4, "HR Interview": 5, Assessment: 6, "Recruiter Contacted": 7,
  Shortlisted: 8, Viewed: 9, Applied: 10, Draft: 11, "Offer Declined": 12, Withdrawn: 13, Rejected: 14,
};

interface CompanyGroup {
  key: string;            // lowercased name (the join key)
  name: string;           // display name
  record: Company | null; // the saved company profile, if any
  apps: Application[];
  active: number;
  offers: number;
  closed: number;
}

export default function Companies({ companies, apps, C, dark, onUpsert, onDelete, onOpenApp }: Props) {
  const [editing, setEditing] = useState<Company | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<"applications" | "name" | "active">("applications");

  const danger = dark ? TONE.rose.dk : TONE.rose.dot;
  const jade = dark ? TONE.jade.dk : TONE.jade.fg;

  // Build the company list from BOTH saved company records and the companies
  // that appear in applications — so a company you applied to but never added
  // still shows up, with its roles grouped underneath.
  const groups = useMemo<CompanyGroup[]>(() => {
    const byKey = new Map<string, CompanyGroup>();

    const ensure = (name: string): CompanyGroup => {
      const key = name.trim().toLowerCase();
      let g = byKey.get(key);
      if (!g) {
        g = { key, name: name.trim(), record: null, apps: [], active: 0, offers: 0, closed: 0 };
        byKey.set(key, g);
      }
      return g;
    };

    // Seed from saved company profiles (so empty ones still appear).
    for (const c of companies) {
      const g = ensure(c.name);
      g.record = c;
    }
    // Attach applications.
    for (const a of apps) {
      if (!a.company.trim()) continue;
      const g = ensure(a.company);
      g.apps.push(a);
      if (OFFER.includes(a.status)) g.offers++;
      else if (CLOSED.includes(a.status)) g.closed++;
      else g.active++;
    }
    // Sort each company's apps best-stage-first.
    for (const g of byKey.values()) {
      g.apps.sort((x, y) => (STAGE_ORDER[x.status] ?? 99) - (STAGE_ORDER[y.status] ?? 99));
    }

    const list = [...byKey.values()];
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "active") return b.active - a.active || b.apps.length - a.apps.length;
      return b.apps.length - a.apps.length || a.name.localeCompare(b.name); // applications
    });
    return list;
  }, [companies, apps, sortBy]);

  const toggle = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  // Mini stacked bar showing the active/offer/closed split for a company.
  const StageBar = ({ g }: { g: CompanyGroup }) => {
    const total = g.apps.length || 1;
    const seg = (n: number, color: string) => n > 0 ? <div style={{ width: `${(n / total) * 100}%`, height: "100%", background: color }} /> : null;
    return (
      <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: C.track, width: 120, flexShrink: 0 }}>
        {seg(g.active, dark ? TONE.blue.dk : TONE.blue.dot)}
        {seg(g.offers, jade)}
        {seg(g.closed, dark ? TONE.slate.dk : TONE.slate.dot)}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SectionHead title="Companies" sub={`${groups.length} companies · ${apps.length} applications`} C={C} noMargin />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", background: C.track, borderRadius: 9, padding: 3 }}>
            {([["applications", "Most applied"], ["active", "Most active"], ["name", "A–Z"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setSortBy(v)}
                style={{ padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: sortBy === v ? C.panel : "transparent", color: sortBy === v ? C.text : C.dim, boxShadow: sortBy === v ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setEditing({ id: uid(), name: "", industry: "Technology", website: "", glassdoor: "", hq: "Singapore", sgOffice: "", employees: "", notes: "", _new: true })}
            className="sgjt-primary"
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: "none", cursor: "pointer", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} strokeWidth={2.6} /> Add company
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: C.dim, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 999, background: dark ? TONE.blue.dk : TONE.blue.dot }} /> Active</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 999, background: jade }} /> Offer</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 999, background: dark ? TONE.slate.dk : TONE.slate.dot }} /> Closed</span>
      </div>

      {groups.length === 0 ? (
        <Card C={C}><Empty C={C} text="No companies yet. Apply to a job or add a company to see it here." /></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((g) => {
            const open = !!expanded[g.key];
            const recruiters = [...new Set(g.apps.map((a) => a.recruiterName).filter(Boolean))];
            return (
              <Card key={g.key} C={C} pad={0}>
                {/* Header row — click to expand */}
                <button onClick={() => toggle(g.key)} className="sgjt-row"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ color: C.dim, flexShrink: 0 }}>{open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</div>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: C.track, display: "grid", placeItems: "center", color: C.dim, flexShrink: 0 }}>
                    <Building2 size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: C.dim }}>
                      {g.record?.industry || (g.apps[0]?.industry ?? "—")}
                      {g.apps.length > 0 && ` · ${g.apps.length} application${g.apps.length > 1 ? "s" : ""}`}
                      {recruiters.length > 0 && ` · ${recruiters.length} recruiter${recruiters.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  {g.offers > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: jade, background: TONE.jade.bg, padding: "3px 9px", borderRadius: 999, flexShrink: 0 }}>{g.offers} offer{g.offers > 1 ? "s" : ""}</span>}
                  <StageBar g={g} />
                  <div style={{ width: 34, textAlign: "right", fontSize: 15, fontWeight: 750, color: C.text, flexShrink: 0 }}>{g.apps.length}</div>
                </button>

                {/* Expanded body — the applications at this company */}
                {open && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: "6px 16px 12px" }}>
                    {g.apps.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: C.dim, padding: "12px 4px" }}>
                        No applications logged here yet. {g.record && "This is a saved company profile."}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {g.apps.map((a) => (
                          <button key={a.id} onClick={() => onOpenApp(a.id)} className="sgjt-row"
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", borderRadius: 8 }}>
                            <Briefcase size={14} color={C.dim} style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.title}</div>
                              <div style={{ fontSize: 11.5, color: C.dim }}>
                                {a.portal || "—"}{a.salaryMax ? ` · up to S$${Number(a.salaryMax).toLocaleString()}` : ""} · applied {fmtDate(a.dateApplied)}
                              </div>
                            </div>
                            <Badge status={a.status} dark={dark} />
                            <ChevronRight size={14} color={C.dim} style={{ flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Company profile details + edit/delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.border}`, flexWrap: "wrap" }}>
                      {g.record?.sgOffice && <span style={{ fontSize: 11.5, color: C.dim, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={12} /> {g.record.sgOffice}</span>}
                      {g.record?.employees && <span style={{ fontSize: 11.5, color: C.dim }}>{g.record.employees} staff</span>}
                      {g.record?.website && <a href={g.record.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11.5, color: dark ? C.accentDk : C.accent, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, textDecoration: "none" }}>Website <ExternalLink size={11} /></a>}
                      {g.record?.notes && <span style={{ fontSize: 11.5, color: C.dim, flexBasis: "100%" }}>{g.record.notes}</span>}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        {g.record ? (
                          <button onClick={() => setEditing(g.record!)} style={{ display: "flex", alignItems: "center", gap: 5, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: C.dim, padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 600 }}>
                            <Pencil size={12} /> Edit profile
                          </button>
                        ) : (
                          <button onClick={() => setEditing({ id: uid(), name: g.name, industry: g.apps[0]?.industry || "Technology", website: "", glassdoor: "", hq: "Singapore", sgOffice: "", employees: "", notes: "", _new: true })}
                            style={{ display: "flex", alignItems: "center", gap: 5, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: dark ? C.accentDk : C.accent, padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 600 }}>
                            <Plus size={12} /> Add company profile
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing._new ? "Add company" : "Edit company"} C={C} onClose={() => setEditing(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Company name" C={C}><Input value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} C={C} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Industry" C={C}><SelectInput value={editing.industry} onChange={(v) => setEditing({ ...editing, industry: v })} options={INDUSTRIES} C={C} /></Field>
              <Field label="Employees" C={C}><Input value={editing.employees} onChange={(v) => setEditing({ ...editing, employees: v })} C={C} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="SG office" C={C}><Input value={editing.sgOffice} onChange={(v) => setEditing({ ...editing, sgOffice: v })} C={C} /></Field>
              <Field label="Website" C={C}><Input value={editing.website} onChange={(v) => setEditing({ ...editing, website: v })} C={C} /></Field>
            </div>
            <Field label="Notes" C={C}><Textarea value={editing.notes} onChange={(v) => setEditing({ ...editing, notes: v })} C={C} /></Field>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
              {!editing._new ? (
                <button onClick={() => { onDelete(editing.id); setEditing(null); }}
                  style={{ padding: "9px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: danger, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <Trash2 size={14} /> Delete profile
                </button>
              ) : <span />}
              <button onClick={() => { const { _new, ...clean } = editing; onUpsert(clean); setEditing(null); }}
                style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
