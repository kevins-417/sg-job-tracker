import React, { useMemo } from "react";
import {
  Briefcase, TrendingUp, CalendarDays, Award, Clock, Target, ChevronRight,
} from "lucide-react";
import type { Application, Palette } from "../lib/types";
import { TONE, PORTALS, fmtDate, todayISO, daysBetween } from "../lib/constants";
import { Card, CardTitle, SectionHead, Badge, BarRow, Empty } from "../components/ui";

export default function Dashboard({ list, C, dark, onOpen }: {
  list: Application[]; C: Palette; dark: boolean; onOpen: (id: string) => void;
}) {
  const now = new Date();

  const stats = useMemo(() => {
    const thisMonth = list.filter((a) => {
      const d = new Date(a.dateApplied);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const interviews = list.filter((a) => ["HR Interview", "Technical Interview", "Hiring Manager Interview", "Final Interview", "Assessment"].includes(a.status)).length;
    const offers = list.filter((a) => a.status.startsWith("Offer")).length;
    const pending = list.filter((a) => ["Applied", "Viewed", "Shortlisted", "Recruiter Contacted"].includes(a.status)).length;
    const reached = list.filter((a) => !["Draft", "Applied", "Viewed", "Rejected", "Withdrawn"].includes(a.status)).length;
    const successRate = list.length ? Math.round((reached / list.length) * 100) : 0;
    return { thisMonth, interviews, offers, pending, successRate };
  }, [list]);

  const kpis = [
    { label: "Total applications", value: list.length, icon: Briefcase, tone: "blue" },
    { label: "This month", value: stats.thisMonth, icon: TrendingUp, tone: "jade" },
    { label: "Interviews", value: stats.interviews, icon: CalendarDays, tone: "amber" },
    { label: "Offers", value: stats.offers, icon: Award, tone: "jade" },
    { label: "Pending replies", value: stats.pending, icon: Clock, tone: "violet" },
    { label: "Success rate", value: `${stats.successRate}%`, icon: Target, tone: "jade" },
  ];

  const months = useMemo(() => {
    const out: { key: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-SG", { month: "short" });
      const count = list.filter((a) => {
        const ad = new Date(a.dateApplied);
        return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
      }).length;
      out.push({ key, count });
    }
    return out;
  }, [list]);

  const byPortal = PORTALS
    .map((p) => ({ key: p, count: list.filter((a) => a.portal === p).length }))
    .filter((x) => x.count)
    .sort((a, b) => b.count - a.count);

  const upcoming = list
    .filter((a) => a.nextActionDate)
    .map((a) => ({ ...a, days: daysBetween(todayISO(), a.nextActionDate) }))
    .filter((a) => a.days >= -1)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <SectionHead title="Overview" sub="Where your search stands today" C={C} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))", gap: 12 }}>
        {kpis.map((k) => {
          const t = TONE[k.tone];
          return (
            <Card key={k.label} C={C}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 12, color: C.dim, fontWeight: 550 }}>{k.label}</div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, display: "grid", placeItems: "center" }}>
                  <k.icon size={15} color={dark ? t.dk : t.dot} strokeWidth={2.3} />
                </div>
              </div>
              <div style={{ fontSize: 29, fontWeight: 700, letterSpacing: "-.02em", marginTop: 8, color: C.text }}>{k.value}</div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="sgjt-2col">
        <Card C={C}>
          <CardTitle C={C}>Applications by month</CardTitle>
          <BarRow data={months} C={C} dark={dark} accent />
        </Card>
        <Card C={C}>
          <CardTitle C={C}>By source portal</CardTitle>
          {byPortal.length === 0 ? <Empty C={C} text="No applications yet" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
              {byPortal.map((p) => {
                const pct = Math.round((p.count / list.length) * 100);
                return (
                  <div key={p.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: C.text, fontWeight: 500 }}>{p.key}</span>
                      <span style={{ color: C.dim }}>{p.count}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: C.track, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card C={C}>
        <CardTitle C={C}>Upcoming actions</CardTitle>
        {upcoming.length === 0 ? <Empty C={C} text="No follow-ups scheduled. Add a next-action date to any application." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
            {upcoming.map((a) => (
              <button key={a.id} onClick={() => onOpen(a.id)} className="sgjt-row"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", borderRadius: 8, width: "100%" }}>
                <div style={{
                  width: 42, textAlign: "center", flexShrink: 0,
                  color: a.days <= 0 ? (dark ? TONE.rose.dk : TONE.rose.dot) : a.days <= 3 ? (dark ? TONE.amber.dk : TONE.amber.dot) : C.dim,
                  fontWeight: 700, fontSize: 12,
                }}>
                  {a.days <= 0 ? "Due" : `${a.days}d`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.company} · {a.title}</div>
                  <div style={{ fontSize: 11.5, color: C.dim }}>{fmtDate(a.nextActionDate)}</div>
                </div>
                <Badge status={a.status} dark={dark} />
                <ChevronRight size={15} color={C.dim} />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
