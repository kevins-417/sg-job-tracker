import React, { useState } from "react";
import type { Application, Company, Palette, Resume } from "../lib/types";
import {
  STATUSES, PORTALS, INDUSTRIES, EMPLOYMENT_TYPES, uid, todayISO,
} from "../lib/constants";
import { Modal, Field, Input, SelectInput, Textarea } from "./ui";

interface Props {
  record: Application;
  resumes: Resume[];
  companies: Company[];
  C: Palette;
  dark: boolean;
  onClose: () => void;
  onSave: (r: Application) => void;
}

export default function ApplicationForm({ record, resumes, companies, C, onClose, onSave }: Props) {
  const [r, setR] = useState<Application>(record);
  const set = <K extends keyof Application>(k: K, v: Application[K]) =>
    setR((p) => ({ ...p, [k]: v }));

  const isNew = !record.company && !(record.timeline && record.timeline.length);

  const submit = () => {
    if (!r.company.trim() || !r.title.trim()) return;
    const out: Application = {
      ...r,
      salaryMin: r.salaryMin === null || (r.salaryMin as unknown as string) === "" ? null : Number(r.salaryMin),
      salaryMax: r.salaryMax === null || (r.salaryMax as unknown as string) === "" ? null : Number(r.salaryMax),
    };
    if (!out.timeline || !out.timeline.length) {
      out.timeline = [{ id: uid(), date: out.dateApplied, label: `Applied via ${out.portal}` }];
    }
    onSave(out);
  };

  const resumeLabels: Record<string, string> = {
    "": "— none —",
    ...Object.fromEntries(resumes.map((x) => [x.id, x.name])),
  };

  return (
    <Modal title={isNew ? "New application" : "Edit application"} C={C} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Company *" C={C}><Input value={r.company} onChange={(v) => set("company", v)} C={C} list={companies.map((c) => c.name)} /></Field>
          <Field label="Job title *" C={C}><Input value={r.title} onChange={(v) => set("title", v)} C={C} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Job function" C={C}><Input value={r.jobFunction} onChange={(v) => set("jobFunction", v)} C={C} /></Field>
          <Field label="Industry" C={C}><SelectInput value={r.industry} onChange={(v) => set("industry", v)} options={INDUSTRIES} C={C} /></Field>
          <Field label="Employment type" C={C}><SelectInput value={r.employmentType} onChange={(v) => set("employmentType", v)} options={EMPLOYMENT_TYPES} C={C} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Portal source" C={C}><SelectInput value={r.portal} onChange={(v) => set("portal", v)} options={PORTALS} C={C} /></Field>
          <Field label="Date applied" C={C}><Input type="date" value={r.dateApplied} onChange={(v) => set("dateApplied", v)} C={C} /></Field>
          <Field label="Status" C={C}><SelectInput value={r.status} onChange={(v) => set("status", v)} options={STATUSES} C={C} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Salary min (SGD/mo)" C={C}><Input type="number" value={r.salaryMin ?? ""} onChange={(v) => set("salaryMin", (v === "" ? null : Number(v)) as Application["salaryMin"])} C={C} /></Field>
          <Field label="Salary max (SGD/mo)" C={C}><Input type="number" value={r.salaryMax ?? ""} onChange={(v) => set("salaryMax", (v === "" ? null : Number(v)) as Application["salaryMax"])} C={C} /></Field>
          <Field label="Location" C={C}><Input value={r.location} onChange={(v) => set("location", v)} C={C} /></Field>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 13 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>Recruiter</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Name" C={C}><Input value={r.recruiterName} onChange={(v) => set("recruiterName", v)} C={C} /></Field>
            <Field label="Email" C={C}><Input value={r.recruiterEmail} onChange={(v) => set("recruiterEmail", v)} C={C} /></Field>
            <Field label="Phone" C={C}><Input value={r.recruiterPhone} onChange={(v) => set("recruiterPhone", v)} C={C} /></Field>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Resume used" C={C}><SelectInput value={r.resumeId} onChange={(v) => set("resumeId", v)} options={["", ...resumes.map((x) => x.id)]} labels={resumeLabels} C={C} /></Field>
          <Field label="Next action date" C={C}><Input type="date" value={r.nextActionDate} onChange={(v) => set("nextActionDate", v)} C={C} /></Field>
        </div>
        <Field label="Job description / notes" C={C}><Textarea value={r.jobDescription} onChange={(v) => set("jobDescription", v)} C={C} /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={submit} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save application</button>
        </div>
      </div>
    </Modal>
  );
}
