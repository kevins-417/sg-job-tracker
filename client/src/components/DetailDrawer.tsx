import React from "react";
import { Pencil, X, Mail, Phone, ExternalLink, AlertCircle, Trash2 } from "lucide-react";
import type { Application, Palette, Resume } from "../lib/types";
import { fmtDate } from "../lib/constants";
import { Badge, Detail, SubHead } from "./ui";
import { TONE } from "../lib/constants";

interface Props {
  app: Application;
  resumes: Resume[];
  C: Palette;
  dark: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function DetailDrawer({ app, resumes, C, dark, onClose, onEdit, onDelete }: Props) {
  const resume = resumes.find((r) => r.id === app.resumeId);

  const reminders: { label: string; date: string }[] = [];
  const apDate = new Date(app.dateApplied);
  reminders.push({ label: "Follow up on application", date: new Date(apDate.getTime() + 7 * 86400000).toISOString().slice(0, 10) });
  (app.interviews || []).forEach((iv) => {
    reminders.push({ label: `Prep for ${iv.type}`, date: new Date(new Date(iv.date).getTime() - 3 * 86400000).toISOString().slice(0, 10) });
    reminders.push({ label: `Thank-you / follow-up after ${iv.type}`, date: new Date(new Date(iv.date).getTime() + 7 * 86400000).toISOString().slice(0, 10) });
  });

  const danger = dark ? TONE.rose.dk : TONE.rose.dot;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 40 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px,100%)", background: C.panel,
        zIndex: 50, boxShadow: "-12px 0 40px rgba(0,0,0,.18)", display: "flex", flexDirection: "column",
        animation: "sgjt-slide .22s ease", color: C.text,
      }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 750, letterSpacing: "-.01em" }}>{app.title}</div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>{app.company} · {app.location}</div>
            <div style={{ marginTop: 10 }}><Badge status={app.status} dark={dark} /></div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={onEdit} className="sgjt-icon" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.dim, padding: 7, borderRadius: 8 }}><Pencil size={17} /></button>
            <button onClick={onClose} className="sgjt-icon" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.dim, padding: 7, borderRadius: 8 }}><X size={18} /></button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Detail label="Portal" value={app.portal} C={C} />
            <Detail label="Applied" value={fmtDate(app.dateApplied)} C={C} />
            <Detail label="Salary (SGD/mo)" value={app.salaryMin && app.salaryMax ? `${Number(app.salaryMin).toLocaleString()}–${Number(app.salaryMax).toLocaleString()}` : "—"} C={C} />
            <Detail label="Employment" value={app.employmentType} C={C} />
            <Detail label="Industry" value={app.industry} C={C} />
            <Detail label="Resume" value={resume ? resume.name : "—"} C={C} />
          </div>

          {(app.recruiterName || app.recruiterEmail || app.recruiterPhone) && (
            <div>
              <SubHead C={C}>Recruiter</SubHead>
              <div style={{ background: C.track, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650 }}>{app.recruiterName || "—"}</div>
                {app.recruiterEmail && <a href={`mailto:${app.recruiterEmail}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: dark ? C.accentDk : C.accent, marginTop: 7, textDecoration: "none", fontWeight: 500 }}><Mail size={14} /> {app.recruiterEmail}</a>}
                {app.recruiterPhone && <a href={`tel:${app.recruiterPhone}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.dim, marginTop: 5, textDecoration: "none" }}><Phone size={14} /> {app.recruiterPhone}</a>}
              </div>
            </div>
          )}

          {app.jobDescription && (
            <div>
              <SubHead C={C}>Job description</SubHead>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{app.jobDescription}</div>
            </div>
          )}

          {app.interviews && app.interviews.length > 0 && (
            <div>
              <SubHead C={C}>Interviews</SubHead>
              {app.interviews.map((iv) => (
                <div key={iv.id} style={{ background: C.track, borderRadius: 10, padding: 13, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 650 }}>{iv.type}</span>
                    <span style={{ fontSize: 12, color: C.dim }}>{fmtDate(iv.date)} {iv.time}</span>
                  </div>
                  {iv.interviewer && <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>With {iv.interviewer}</div>}
                  {iv.notes && <div style={{ fontSize: 12, color: C.dim, marginTop: 4, lineHeight: 1.5 }}>{iv.notes}</div>}
                  {iv.link && <a href={iv.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: dark ? C.accentDk : C.accent, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, textDecoration: "none" }}>Join link <ExternalLink size={12} /></a>}
                </div>
              ))}
            </div>
          )}

          <div>
            <SubHead C={C}>Auto reminders</SubHead>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {reminders.map((rm, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                  <AlertCircle size={14} color={C.dim} />
                  <span style={{ flex: 1 }}>{rm.label}</span>
                  <span style={{ color: C.dim }}>{fmtDate(rm.date)}</span>
                </div>
              ))}
            </div>
          </div>

          {app.timeline && app.timeline.length > 0 && (
            <div>
              <SubHead C={C}>Timeline</SubHead>
              <div style={{ position: "relative", paddingLeft: 18 }}>
                <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 2, background: C.border }} />
                {[...app.timeline].reverse().map((t) => (
                  <div key={t.id} style={{ position: "relative", paddingBottom: 14 }}>
                    <div style={{ position: "absolute", left: -18, top: 3, width: 9, height: 9, borderRadius: 999, background: C.accent, border: `2px solid ${C.panel}` }} />
                    <div style={{ fontSize: 13, fontWeight: 550 }}>{t.label}</div>
                    <div style={{ fontSize: 11.5, color: C.dim }}>{fmtDate(t.date)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
          <button onClick={onDelete} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: danger, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Trash2 size={15} /> Delete
          </button>
          <button onClick={onEdit} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Edit application</button>
        </div>
      </div>
    </>
  );
}
