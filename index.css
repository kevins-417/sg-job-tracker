import React, { useMemo } from "react";
import { ChevronRight, Inbox, X, type LucideIcon } from "lucide-react";
import type { Palette } from "../lib/types";
import { TONE, STATUS_TONE, uid } from "../lib/constants";

export function Badge({ status, dark }: { status: string; dark: boolean }) {
  const t = TONE[STATUS_TONE[status] || "slate"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 9px",
      borderRadius: 999, fontSize: 11.5, fontWeight: 600, letterSpacing: ".01em",
      background: t.bg, color: dark ? t.dk : t.fg, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: dark ? t.dk : t.dot }} />
      {status}
    </span>
  );
}

export const Card: React.FC<{ children: React.ReactNode; C: Palette; pad?: number }> = ({ children, C, pad = 16 }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: pad }}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; C: Palette; noMargin?: boolean }> = ({ children, C, noMargin }) => (
  <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-.01em", marginBottom: noMargin ? 0 : 14, color: C.text }}>{children}</div>
);

export const SectionHead: React.FC<{ title: string; sub?: string; C: Palette; noMargin?: boolean }> = ({ title, sub, C, noMargin }) => (
  <div style={{ marginBottom: noMargin ? 0 : 2 }}>
    <h1 style={{ fontSize: 21, fontWeight: 750, letterSpacing: "-.025em", margin: 0, color: C.text }}>{title}</h1>
    {sub && <div style={{ fontSize: 13, color: C.dim, marginTop: 3 }}>{sub}</div>}
  </div>
);

export const SubHead: React.FC<{ children: React.ReactNode; C: Palette }> = ({ children, C }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 9 }}>{children}</div>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; C: Palette }> = ({ label, value, C }) => (
  <div><div style={{ fontSize: 19, fontWeight: 750, color: C.text }}>{value}</div><div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{label}</div></div>
);

export const Detail: React.FC<{ label: string; value: React.ReactNode; C: Palette }> = ({ label, value, C }) => (
  <div><div style={{ fontSize: 10.5, color: C.dim, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{label}</div><div style={{ fontSize: 13.5, fontWeight: 550, marginTop: 3, color: C.text }}>{value}</div></div>
);

export const Empty: React.FC<{ C: Palette; text: string }> = ({ C, text }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "26px 10px", color: C.dim }}>
    <Inbox size={26} strokeWidth={1.6} /><div style={{ fontSize: 12.5, textAlign: "center", maxWidth: 280 }}>{text}</div>
  </div>
);

interface BarDatum { key: string; count: number; }
export function BarRow({ data, C, horizontal }: { data: BarDatum[]; C: Palette; dark?: boolean; accent?: boolean; horizontal?: boolean }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  if (horizontal) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
        {data.map((d) => (
          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 130, fontSize: 12, fontWeight: 500, color: C.text }}>{d.key}</div>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: C.track, overflow: "hidden" }}>
              <div style={{ width: `${(d.count / max) * 100}%`, height: "100%", background: C.accent, borderRadius: 999 }} />
            </div>
            <div style={{ width: 24, textAlign: "right", fontSize: 12, fontWeight: 700, color: C.text }}>{d.count}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, marginTop: 8 }}>
      {data.map((d) => (
        <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{d.count || ""}</div>
          <div style={{ width: "100%", maxWidth: 40, height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0, background: C.accent, borderRadius: "5px 5px 0 0", transition: "height .3s" }} />
          <div style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>{d.key}</div>
        </div>
      ))}
    </div>
  );
}

export function Select({ value, onChange, options, C, icon: Icon }: { value: string; onChange: (v: string) => void; options: readonly string[]; C: Palette; icon?: LucideIcon }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {Icon && <Icon size={14} style={{ position: "absolute", left: 10, color: C.dim, pointerEvents: "none" }} />}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", padding: Icon ? "8px 28px 8px 30px" : "8px 28px 8px 12px", borderRadius: 9,
          border: `1px solid ${C.border}`, background: C.panel, color: C.text, fontSize: 12.5,
          fontWeight: 500, cursor: "pointer", outline: "none",
        }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronRight size={13} style={{ position: "absolute", right: 9, color: C.dim, pointerEvents: "none", transform: "rotate(90deg)" }} />
    </div>
  );
}

export function SelectInput({ value, onChange, options, labels, C }: { value: string; onChange: (v: string) => void; options: readonly string[]; labels?: Record<string, string>; C: Palette }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", width: "100%", padding: "9px 28px 9px 11px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, cursor: "pointer", outline: "none" }} className="sgjt-input">
        {options.map((o) => <option key={o} value={o}>{labels ? labels[o] : o}</option>)}
      </select>
      <ChevronRight size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: C.dim, pointerEvents: "none" }} />
    </div>
  );
}

export const Field: React.FC<{ label: string; children: React.ReactNode; C: Palette }> = ({ label, children, C }) => (
  <label style={{ display: "block" }}>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: C.dim, display: "block", marginBottom: 5 }}>{label}</span>
    {children}
  </label>
);

export function Input({ value, onChange, C, type = "text", list }: { value: string | number; onChange: (v: string) => void; C: Palette; type?: string; list?: string[] }) {
  const id = useMemo(() => "dl" + uid(), []);
  return (
    <>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} list={list ? id : undefined}
        style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} className="sgjt-input" />
      {list && <datalist id={id}>{list.map((o) => <option key={o} value={o} />)}</datalist>}
    </>
  );
}

export function Textarea({ value, onChange, C }: { value: string; onChange: (v: string) => void; C: Palette }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
      style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} className="sgjt-input" />
  );
}

// Toggleable chip multi-select. Tap a chip to add/remove it from `selected`.
export function Chips({ options, selected, onToggle, C, dark }: { options: readonly string[]; selected: string[]; onToggle: (v: string) => void; C: Palette; dark: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            style={{
              padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${on ? C.accent : C.border}`,
              background: on ? C.accentSoft : "transparent",
              color: on ? (dark ? C.accentDk : C.accent) : C.dim,
            }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ title, children, C, onClose, wide }: { title: string; children: React.ReactNode; C: Palette; onClose: () => void; wide?: boolean }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 60 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 70,
        width: wide ? "min(720px,94vw)" : "min(440px,94vw)", maxHeight: "90vh", overflowY: "auto",
        background: C.panel, borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,.3)", padding: 22,
        animation: "sgjt-pop .18s ease", color: C.text,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 750, letterSpacing: "-.01em" }}>{title}</div>
          <button onClick={onClose} className="sgjt-icon" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.dim, padding: 6, borderRadius: 8 }}><X size={19} /></button>
        </div>
        {children}
      </div>
    </>
  );
}
