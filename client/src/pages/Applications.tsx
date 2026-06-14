import React, { useState } from "react";
import { Filter, GripVertical, Pencil } from "lucide-react";
import type { Application, Palette } from "../lib/types";
import { STATUSES, PORTALS, KANBAN_COLUMNS, fmtDate } from "../lib/constants";
import { Card, SectionHead, Badge, Empty, Select } from "../components/ui";

interface Props {
  list: Application[];
  all: Application[];
  C: Palette;
  dark: boolean;
  layout: string;
  setLayout: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  portalFilter: string;
  setPortalFilter: (v: string) => void;
  onMove: (id: string, status: string) => void;
  onOpen: (id: string) => void;
  onEdit: (a: Application) => void;
}

export default function Applications({
  list, all, C, dark, layout, setLayout, statusFilter, setStatusFilter,
  portalFilter, setPortalFilter, onMove, onOpen, onEdit,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const colItems = (members: readonly string[]) => list.filter((a) => members.includes(a.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SectionHead title="Applications" sub={`${list.length} of ${all.length} shown`} C={C} noMargin />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Select value={statusFilter} onChange={setStatusFilter} options={["All", ...STATUSES]} C={C} icon={Filter} />
          <Select value={portalFilter} onChange={setPortalFilter} options={["All", ...PORTALS]} C={C} />
          <div style={{ display: "flex", background: C.track, borderRadius: 9, padding: 3 }}>
            {["kanban", "table"].map((v) => (
              <button key={v} onClick={() => setLayout(v)}
                style={{
                  padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 12.5, fontWeight: 600, textTransform: "capitalize",
                  background: layout === v ? C.panel : "transparent",
                  color: layout === v ? C.text : C.dim,
                  boxShadow: layout === v ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                }}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <Card C={C}><Empty C={C} text="No applications match these filters." /></Card>
      ) : layout === "kanban" ? (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="sgjt-board">
          {KANBAN_COLUMNS.map((col) => {
            const items = colItems(col.members);
            const isOver = overCol === col.id;
            return (
              <div key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={() => { if (dragId) onMove(dragId, col.members[0]); setDragId(null); setOverCol(null); }}
                style={{
                  flex: "0 0 244px", display: "flex", flexDirection: "column", gap: 9,
                  background: isOver ? C.accentSoft : C.track, borderRadius: 12, padding: 10,
                  border: `1px solid ${isOver ? C.accent : "transparent"}`, transition: "background .12s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{col.label}</span>
                  <span style={{ fontSize: 11.5, color: C.dim, fontWeight: 600, background: C.panel, padding: "1px 8px", borderRadius: 999 }}>{items.length}</span>
                </div>
                {items.map((a) => (
                  <div key={a.id} draggable
                    onDragStart={() => setDragId(a.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onClick={() => onOpen(a.id)} className="sgjt-kcard"
                    style={{
                      background: C.panel, borderRadius: 10, padding: "11px 12px", cursor: "pointer",
                      border: `1px solid ${C.border}`, opacity: dragId === a.id ? 0.4 : 1,
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 650, color: C.text, lineHeight: 1.3 }}>{a.title}</div>
                      <GripVertical size={14} color={C.dim} style={{ flexShrink: 0, marginTop: 2 }} />
                    </div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 2, fontWeight: 500 }}>{a.company}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9 }}>
                      <Badge status={a.status} dark={dark} />
                      {a.salaryMax ? <span style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>${(Number(a.salaryMax) / 1000).toFixed(0)}k</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <Card C={C} pad={0}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Company", "Role", "Portal", "Salary (SGD)", "Location", "Status", "Next action"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 14px", color: C.dim, fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="sgjt-trow" onClick={() => onOpen(a.id)}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: C.text }}>{a.company}</td>
                    <td style={{ padding: "11px 14px", color: C.dim }}>{a.title}</td>
                    <td style={{ padding: "11px 14px", color: C.dim, whiteSpace: "nowrap" }}>{a.portal}</td>
                    <td style={{ padding: "11px 14px", color: C.dim, whiteSpace: "nowrap" }}>{a.salaryMin && a.salaryMax ? `${Number(a.salaryMin).toLocaleString()}–${Number(a.salaryMax).toLocaleString()}` : "—"}</td>
                    <td style={{ padding: "11px 14px", color: C.dim }}>{a.location}</td>
                    <td style={{ padding: "11px 14px" }}><Badge status={a.status} dark={dark} /></td>
                    <td style={{ padding: "11px 14px", color: C.dim, whiteSpace: "nowrap" }}>{fmtDate(a.nextActionDate)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <button onClick={(e) => { e.stopPropagation(); onEdit(a); }} className="sgjt-icon"
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: C.dim, padding: 4, borderRadius: 6 }}>
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
