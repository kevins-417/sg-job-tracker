import React from "react";
import type { Application, Palette } from "../lib/types";
import {
  PORTALS, INDUSTRIES, TONE, EP_MIN_SALARY, EP_MIN_FINANCIAL,
  SPASS_MIN_SALARY, INDUSTRY_BENCHMARK,
} from "../lib/constants";
import { Card, CardTitle, Empty } from "../components/ui";

export default function Insights({ list, C, dark }: { list: Application[]; C: Palette; dark: boolean }) {
  const withSalary = list.filter((a) => a.salaryMax);
  const epEligible = withSalary.filter((a) => Number(a.salaryMax) >= EP_MIN_SALARY);
  const epFinancial = withSalary.filter((a) => a.industry === "Finance & Banking" && Number(a.salaryMax) >= EP_MIN_FINANCIAL);
  const belowSpass = withSalary.filter((a) => Number(a.salaryMax) < SPASS_MIN_SALARY);

  const benchRows = INDUSTRIES.map((ind) => {
    const rel = withSalary.filter((a) => a.industry === ind);
    if (!rel.length) return null;
    const avg = Math.round(rel.reduce((s, a) => s + (Number(a.salaryMin || a.salaryMax) + Number(a.salaryMax)) / 2, 0) / rel.length);
    const bench = INDUSTRY_BENCHMARK[ind];
    return { ind, avg, bench, count: rel.length, delta: Math.round(((avg - bench) / bench) * 100) };
  }).filter(Boolean) as { ind: string; avg: number; bench: number; count: number; delta: number }[];

  const portalResp = PORTALS
    .map((p) => {
      const rel = list.filter((a) => a.portal === p);
      const responded = rel.filter((a) => !["Draft", "Applied", "Viewed"].includes(a.status)).length;
      return { key: p, applied: rel.length, responded, rate: rel.length ? Math.round((responded / rel.length) * 100) : 0 };
    })
    .filter((x) => x.applied)
    .sort((a, b) => b.rate - a.rate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{
        borderRadius: 16, padding: "22px 24px", position: "relative", overflow: "hidden",
        background: dark ? "linear-gradient(135deg,#0f2e2a,#14201f)" : "linear-gradient(135deg,#0d9488,#0f766e)",
        color: "#fff",
      }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: .85 }}>Singapore market</div>
          <div style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-.02em", marginTop: 4 }}>Work-pass & salary intelligence</div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 6, maxWidth: 560, lineHeight: 1.5 }}>
            How your applications stack up against Employment Pass thresholds and local salary benchmarks — the context a generic tracker misses.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <Card C={C}>
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 550 }}>EP-eligible roles</div>
          <div style={{ fontSize: 28, fontWeight: 750, marginTop: 6, color: C.text }}>{epEligible.length}<span style={{ fontSize: 14, color: C.dim, fontWeight: 600 }}>/{withSalary.length}</span></div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Max salary ≥ S${EP_MIN_SALARY.toLocaleString()}/mo</div>
        </Card>
        <Card C={C}>
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 550 }}>Finance EP bar met</div>
          <div style={{ fontSize: 28, fontWeight: 750, marginTop: 6, color: dark ? TONE.jade.dk : TONE.jade.fg }}>{epFinancial.length}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>≥ S${EP_MIN_FINANCIAL.toLocaleString()}/mo in finance roles</div>
        </Card>
        <Card C={C}>
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 550 }}>Below S Pass floor</div>
          <div style={{ fontSize: 28, fontWeight: 750, marginTop: 6, color: belowSpass.length ? (dark ? TONE.rose.dk : TONE.rose.fg) : C.text }}>{belowSpass.length}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Under S${SPASS_MIN_SALARY.toLocaleString()}/mo — pass risk</div>
        </Card>
      </div>

      <Card C={C}>
        <CardTitle C={C}>Salary vs local benchmark</CardTitle>
        <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 14, marginTop: -4 }}>Your applied salary midpoint against typical monthly medians (SGD) by industry</div>
        {benchRows.length === 0 ? <Empty C={C} text="Add salary ranges to applications to see benchmarks." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {benchRows.map((r) => {
              const max = Math.max(r.avg, r.bench) * 1.15;
              const up = r.delta >= 0;
              const t = up ? TONE.jade : TONE.amber;
              return (
                <div key={r.ind}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
                    <span style={{ fontWeight: 600, color: C.text }}>{r.ind} <span style={{ color: C.dim, fontWeight: 500 }}>· {r.count}</span></span>
                    <span style={{ color: dark ? t.dk : t.fg, fontWeight: 700 }}>{up ? "+" : ""}{r.delta}% vs market</span>
                  </div>
                  <div style={{ position: "relative", height: 22 }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: 7, background: C.track }} />
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(r.avg / max) * 100}%`, borderRadius: 7, background: dark ? t.dk : t.dot, transition: "width .3s" }} />
                    <div style={{ position: "absolute", left: `${(r.bench / max) * 100}%`, top: -3, bottom: -3, width: 2, background: C.text, opacity: .55 }} title="Market median" />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.dim, marginTop: 3 }}>
                    <span>Yours: S${r.avg.toLocaleString()}</span>
                    <span>Market: S${r.bench.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card C={C}>
        <CardTitle C={C}>Portal response rates</CardTitle>
        <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 12, marginTop: -4 }}>Share of applications that moved past the initial "applied/viewed" stage</div>
        {portalResp.length === 0 ? <Empty C={C} text="No applications yet." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {portalResp.map((p) => (
              <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 150, fontSize: 12.5, fontWeight: 500, color: C.text }}>{p.key}</div>
                <div style={{ flex: 1, height: 9, borderRadius: 999, background: C.track, overflow: "hidden" }}>
                  <div style={{ width: `${p.rate}%`, height: "100%", background: C.accent, borderRadius: 999, transition: "width .3s" }} />
                </div>
                <div style={{ width: 70, textAlign: "right", fontSize: 12, color: C.dim }}>
                  <span style={{ fontWeight: 700, color: C.text }}>{p.rate}%</span> <span style={{ fontSize: 10.5 }}>({p.responded}/{p.applied})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.55, padding: "0 4px" }}>
        Reference thresholds are illustrative (general EP ~S${EP_MIN_SALARY.toLocaleString()}, financial-sector EP ~S${EP_MIN_FINANCIAL.toLocaleString()}, S Pass ~S${SPASS_MIN_SALARY.toLocaleString()} per month) and rise with age. Always check MOM for the figures that apply to your profile.
      </div>
    </div>
  );
}
