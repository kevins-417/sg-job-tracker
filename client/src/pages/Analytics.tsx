import React from "react";
import type { Application, Palette, Resume } from "../lib/types";
import { PORTALS, INDUSTRIES, TONE } from "../lib/constants";
import { Card, CardTitle, SectionHead, Empty, BarRow } from "../components/ui";

export default function Analytics({ list, resumes, C, dark }: {
  list: Application[]; resumes: Resume[]; C: Palette; dark: boolean;
}) {
  const total = list.length;
  const advanced = (a: Application) => !["Draft", "Applied", "Viewed", "Rejected", "Withdrawn"].includes(a.status);
  const shortlisted = list.filter(advanced).length;
  const interviewed = list.filter((a) => (a.interviews && a.interviews.length) || a.status.includes("Interview")).length;
  const offered = list.filter((a) => a.status.startsWith("Offer")).length;

  const funnel = [
    { label: "Applications", value: total, tone: "blue" },
    { label: "Shortlisted", value: shortlisted, tone: "violet" },
    { label: "Interviewed", value: interviewed, tone: "amber" },
    { label: "Offers", value: offered, tone: "jade" },
  ];
  const maxF = Math.max(total, 1);

  const portalPerf = PORTALS
    .map((p) => {
      const rel = list.filter((a) => a.portal === p);
      const adv = rel.filter(advanced).length;
      return { key: p, applied: rel.length, rate: rel.length ? Math.round((adv / rel.length) * 100) : 0 };
    })
    .filter((x) => x.applied)
    .sort((a, b) => b.rate - a.rate);

  const byIndustry = INDUSTRIES
    .map((i) => ({ key: i, count: list.filter((a) => a.industry === i).length }))
    .filter((x) => x.count)
    .sort((a, b) => b.count - a.count);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHead title="Job search analytics" sub="Conversion and channel performance" C={C} />

      <Card C={C}>
        <CardTitle C={C}>Conversion funnel</CardTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {funnel.map((f, i) => {
            const t = TONE[f.tone];
            const pct = Math.round((f.value / maxF) * 100);
            const conv = i > 0 && funnel[i - 1].value ? Math.round((f.value / funnel[i - 1].value) * 100) : null;
            return (
              <div key={f.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600, color: C.text }}>{f.label}</span>
                  <span style={{ color: C.dim }}>{f.value}{conv !== null && <span style={{ marginLeft: 8, color: dark ? t.dk : t.fg, fontWeight: 600 }}>{conv}%↓</span>}</span>
                </div>
                <div style={{ height: 26, borderRadius: 8, background: C.track, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(pct, 3)}%`, height: "100%", background: dark ? t.dk : t.dot, borderRadius: 8, transition: "width .3s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="sgjt-2col">
        <Card C={C}>
          <CardTitle C={C}>Best performing portals</CardTitle>
          <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10, marginTop: -4 }}>By shortlist-or-better rate</div>
          {portalPerf.length === 0 ? <Empty C={C} text="No data" /> : portalPerf.map((p) => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
              <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: C.text }}>{p.key}</div>
              <div style={{ width: 90, height: 7, borderRadius: 999, background: C.track, overflow: "hidden" }}>
                <div style={{ width: `${p.rate}%`, height: "100%", background: C.accent, borderRadius: 999 }} />
              </div>
              <div style={{ width: 38, textAlign: "right", fontSize: 12, fontWeight: 700, color: C.text }}>{p.rate}%</div>
            </div>
          ))}
        </Card>

        <Card C={C}>
          <CardTitle C={C}>Resume performance</CardTitle>
          <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10, marginTop: -4 }}>Applications using each version</div>
          {resumes.map((r) => {
            const used = list.filter((a) => a.resumeId === r.id);
            const wins = used.filter(advanced).length;
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.dim }}>{r.targetIndustry}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{used.length} used</div>
                  <div style={{ fontSize: 11, color: wins ? (dark ? TONE.jade.dk : TONE.jade.fg) : C.dim }}>{wins} advanced</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <Card C={C}>
        <CardTitle C={C}>Applications by industry</CardTitle>
        <BarRow data={byIndustry} C={C} dark={dark} accent horizontal />
      </Card>
    </div>
  );
}
