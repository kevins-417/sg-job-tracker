import React, { useState } from "react";
import { Plus, Pencil, MapPin, ExternalLink, Trash2 } from "lucide-react";
import type { Application, Company, Palette } from "../lib/types";
import { INDUSTRIES, TONE, uid } from "../lib/constants";
import { Card, SectionHead, Stat, Modal, Field, Input, SelectInput, Textarea } from "../components/ui";

interface Props {
  companies: Company[];
  apps: Application[];
  C: Palette;
  dark: boolean;
  onUpsert: (c: Company) => void;
  onDelete: (id: string) => void;
}

export default function Companies({ companies, apps, C, dark, onUpsert, onDelete }: Props) {
  const [editing, setEditing] = useState<Company | null>(null);

  const stat = (name: string) => {
    const rel = apps.filter((a) => a.company.toLowerCase() === name.toLowerCase());
    return {
      total: rel.length,
      open: rel.filter((a) => !["Rejected", "Withdrawn", "Offer Declined"].includes(a.status)).length,
      contacts: [...new Set(rel.map((a) => a.recruiterName).filter(Boolean))],
    };
  };

  const danger = dark ? TONE.rose.dk : TONE.rose.dot;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionHead title="Companies" sub={`${companies.length} tracked`} C={C} noMargin />
        <button onClick={() => setEditing({ id: uid(), name: "", industry: "Technology", website: "", glassdoor: "", hq: "Singapore", sgOffice: "", employees: "", notes: "", _new: true })}
          className="sgjt-primary"
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: "none", cursor: "pointer", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.6} /> Add company
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {companies.map((c) => {
          const s = stat(c.name);
          return (
            <Card key={c.id} C={C}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>{c.industry}</div>
                </div>
                <button onClick={() => setEditing(c)} className="sgjt-icon"
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: C.dim, padding: 4, borderRadius: 6 }}>
                  <Pencil size={14} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
                <Stat label="Applied" value={s.total} C={C} />
                <Stat label="Open" value={s.open} C={C} />
                <Stat label="Contacts" value={s.contacts.length} C={C} />
              </div>
              {c.sgOffice && <div style={{ fontSize: 11.5, color: C.dim, marginTop: 12, display: "flex", alignItems: "center", gap: 5 }}><MapPin size={12} /> {c.sgOffice} · {c.employees || "—"}</div>}
              {c.notes && <div style={{ fontSize: 12, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>{c.notes}</div>}
              {c.website && <a href={c.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: dark ? C.accentDk : C.accent, marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, textDecoration: "none" }}>Website <ExternalLink size={12} /></a>}
            </Card>
          );
        })}
      </div>

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
                  <Trash2 size={14} /> Delete
                </button>
              ) : <span />}
              <button onClick={() => {
                const { _new, ...clean } = editing;
                onUpsert(clean);
                setEditing(null);
              }} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
