import React, { useEffect, useState } from "react";
import { Briefcase, Plus, UserRound, Trash2, ArrowRight } from "lucide-react";
import type { Palette, User } from "../lib/types";
import { api } from "../lib/api";

// Pick-a-name login. No password — demonstration-grade only (see README).
export default function Login({ C, dark, onPick }: { C: Palette; dark: boolean; onPick: (u: User) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setUsers(await api.listUsers()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const u = await api.createUser(name.trim(), headline.trim());
      setName(""); setHeadline(""); setAdding(false);
      await load();
      onPick(u);
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try { await api.deleteUser(id); await load(); } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "grid", placeItems: "center", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", padding: 20 }}>
      <div style={{ width: "min(440px, 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: C.accent, display: "grid", placeItems: "center", color: "#fff", boxShadow: `0 4px 14px ${C.accentSoft}` }}>
            <Briefcase size={21} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontWeight: 750, fontSize: 18, letterSpacing: "-.02em" }}>SG Job Tracker</div>
            <div style={{ fontSize: 12, color: C.dim }}>Choose who's using it</div>
          </div>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: C.dim, fontSize: 13 }}>Loading…</div>
          ) : (
            <>
              {users.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: adding ? 16 : 8 }}>
                  {users.map((u) => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", border: `1px solid ${C.border}`, borderRadius: 11, background: C.bg }}
                      className="sgjt-row">
                      <div style={{ width: 34, height: 34, borderRadius: 999, background: C.accentSoft, display: "grid", placeItems: "center", color: dark ? C.accentDk : C.accent, flexShrink: 0 }}>
                        <UserRound size={17} />
                      </div>
                      <button onClick={() => onPick(u)} style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 650, color: C.text }}>{u.name}</div>
                        {u.headline && <div style={{ fontSize: 12, color: C.dim }}>{u.headline}</div>}
                      </button>
                      <button onClick={() => onPick(u)} style={{ border: "none", background: "transparent", cursor: "pointer", color: dark ? C.accentDk : C.accent, padding: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600 }}>
                        Open <ArrowRight size={14} />
                      </button>
                      <button onClick={() => remove(u.id)} disabled={busy} className="sgjt-icon" title="Delete user & their data"
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: dark ? "#fb7185" : "#be123c", padding: 6, borderRadius: 7 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {adding ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: users.length ? 14 : 0, borderTop: users.length ? `1px solid ${C.border}` : "none" }}>
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Kevin)"
                    onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                    style={{ padding: "10px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13.5, outline: "none" }} className="sgjt-input" />
                  <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline (optional, e.g. Senior PM)"
                    onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                    style={{ padding: "10px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13.5, outline: "none" }} className="sgjt-input" />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setAdding(false); setName(""); setHeadline(""); }} style={{ padding: "9px 15px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                    <button onClick={create} disabled={busy || !name.trim()} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: name.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, opacity: name.trim() ? 1 : 0.6 }}>Create & open</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAdding(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 11, border: `1px dashed ${C.border}`, background: "transparent", color: C.dim, cursor: "pointer", fontSize: 13.5, fontWeight: 600, marginTop: users.length ? 6 : 0 }}>
                  <Plus size={16} /> Add a person
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ fontSize: 11, color: C.dim, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
          Mock-up sign-in: pick a name, no password. Each person keeps their own applications, profiles, and matches. Not for real accounts — see the README before adding real users.
        </div>
      </div>
    </div>
  );
}
