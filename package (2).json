import React from "react";
import { ExternalLink } from "lucide-react";
import type { Application, Interview, Palette } from "../lib/types";
import { fmtDate, todayISO, daysBetween } from "../lib/constants";
import { Card, CardTitle, SectionHead, Empty } from "../components/ui";

type Row = Interview & { company: string; title: string; appId: string };

export default function Interviews({ list, C, dark, onOpen }: {
  list: Application[]; C: Palette; dark: boolean; onOpen: (id: string) => void;
}) {
  const items: Row[] = [];
  list.forEach((a) => (a.interviews || []).forEach((iv) => items.push({ ...iv, company: a.company, title: a.title, appId: a.id })));
  items.sort((a, b) => new Date(a.date + "T" + (a.time || "00:00")).getTime() - new Date(b.date + "T" + (b.time || "00:00")).getTime());

  const upcoming = items.filter((i) => daysBetween(todayISO(), i.date) >= 0);
  const past = items.filter((i) => daysBetween(todayISO(), i.date) < 0);

  const Block = ({ title, rows }: { title: string; rows: Row[] }) => (
    <Card C={C} pad={0}>
      <div style={{ padding: "14px 18px", borderBottom: rows.length ? `1px solid ${C.border}` : "none" }}>
        <CardTitle C={C} noMargin>{title}</CardTitle>
      </div>
      {rows.length === 0 ? <div style={{ padding: 18 }}><Empty C={C} text="Nothing here yet." /></div> : rows.map((iv, i) => (
        <button key={iv.id} onClick={() => onOpen(iv.appId)} className="sgjt-row"
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", width: "100%", border: "none", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 54, flexShrink: 0, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: C.text }}>{new Date(iv.date + "T00:00:00").getDate()}</div>
            <div style={{ fontSize: 11, color: C.dim, fontWeight: 600, textTransform: "uppercase" }}>{new Date(iv.date + "T00:00:00").toLocaleDateString("en-SG", { month: "short" })}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: C.text }}>{iv.type} · {iv.company}</div>
            <div style={{ fontSize: 12, color: C.dim }}>{iv.title}{iv.time ? ` · ${iv.time}` : ""}{iv.interviewer ? ` · ${iv.interviewer}` : ""}</div>
          </div>
          {iv.link && <a href={iv.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: dark ? C.accentDk : C.accent }}><ExternalLink size={16} /></a>}
        </button>
      ))}
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHead title="Interviews" sub="Scheduled rounds across all applications" C={C} />
      <Block title={`Upcoming (${upcoming.length})`} rows={upcoming} />
      <Block title={`Past (${past.length})`} rows={past} />
    </div>
  );
}
