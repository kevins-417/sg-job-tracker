import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Briefcase, Building2, CalendarDays, BarChart3, MapPin,
  Plus, Search, Moon, Sun, Zap, UserRound, LogOut, type LucideIcon,
} from "lucide-react";
import type { Application, Company, Resume, User } from "./lib/types";
import { palette, blankApp, uid, todayISO } from "./lib/constants";
import { api, getCurrentUserId, setCurrentUserId } from "./lib/api";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Companies from "./pages/Companies";
import Interviews from "./pages/Interviews";
import Analytics from "./pages/Analytics";
import Insights from "./pages/Insights";
import AutoApply from "./pages/AutoApply";
import ApplicationForm from "./components/ApplicationForm";
import DetailDrawer from "./components/DetailDrawer";
import Login from "./components/Login";

type View = "dashboard" | "applications" | "companies" | "interviews" | "analytics" | "insights" | "autoapply";

export default function App() {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("sgjt:theme") === "dark");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userChecked, setUserChecked] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>("dashboard");
  const [appLayout, setAppLayout] = useState("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [portalFilter, setPortalFilter] = useState("All");
  const [editing, setEditing] = useState<Application | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const C = palette(dark);

  useEffect(() => { localStorage.setItem("sgjt:theme", dark ? "dark" : "light"); }, [dark]);

  // On mount, resolve the stored user id (if any) to a user object.
  useEffect(() => {
    (async () => {
      const stored = getCurrentUserId();
      if (stored) {
        try {
          const users = await api.listUsers();
          const found = users.find((u) => u.id === stored) || null;
          if (found) setCurrentUser(found);
          else setCurrentUserId(""); // stale id
        } catch { /* show login */ }
      }
      setUserChecked(true);
    })();
  }, []);

  const pickUser = useCallback((u: User) => {
    setCurrentUserId(u.id);
    setCurrentUser(u);
    setView("dashboard");
  }, []);

  const switchUser = useCallback(() => {
    setCurrentUserId("");
    setCurrentUser(null);
    setApps([]); setCompanies([]); setResumes([]);
  }, []);

  // Load this user's data whenever the picked user changes.
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        setLoading(true);
        const [a, c, r] = await Promise.all([
          api.listApplications(),
          api.listCompanies(),
          api.listResumes(),
        ]);
        setApps(a);
        setCompanies(c);
        setResumes(r);
        setError(null);
      } catch (e) {
        setError(
          "Couldn't reach the API. Make sure the server is running (npm run dev) and the database is migrated and seeded."
        );
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (portalFilter !== "All" && a.portal !== portalFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!`${a.company} ${a.title} ${a.recruiterName} ${a.location}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [apps, statusFilter, portalFilter, search]);

  const saveApp = useCallback(async (rec: Application) => {
    const exists = apps.some((a) => a.id === rec.id);
    // optimistic update
    setApps((prev) => exists ? prev.map((a) => (a.id === rec.id ? rec : a)) : [rec, ...prev]);
    try {
      const saved = exists
        ? await api.updateApplication(rec.id, rec)
        : await api.createApplication(rec);
      setApps((prev) => prev.map((a) => (a.id === rec.id ? saved : a)));
    } catch (e) {
      console.error("save failed", e);
      // reload to reconcile on failure
      api.listApplications().then(setApps).catch(() => {});
    }
  }, [apps]);

  const deleteApp = useCallback(async (id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
    setDetailId(null);
    try { await api.deleteApplication(id); }
    catch (e) { console.error("delete failed", e); }
  }, []);

  const moveStatus = useCallback(async (id: string, status: string) => {
    const current = apps.find((a) => a.id === id);
    if (!current) return;
    const updated: Application = {
      ...current,
      status,
      timeline: [...(current.timeline || []), { id: uid(), date: todayISO(), label: `Status → ${status}` }],
    };
    setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
    try { await api.updateApplication(id, updated); }
    catch (e) { console.error("move failed", e); }
  }, [apps]);

  const upsertCompany = useCallback(async (c: Company) => {
    const exists = companies.some((x) => x.id === c.id);
    setCompanies((prev) => exists ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]);
    try {
      const saved = await api.upsertCompany(c);
      setCompanies((prev) => prev.map((x) => (x.id === c.id ? saved : x)));
    } catch (e) { console.error(e); }
  }, [companies]);

  const deleteCompany = useCallback(async (id: string) => {
    setCompanies((prev) => prev.filter((x) => x.id !== id));
    try { await api.deleteCompany(id); } catch (e) { console.error(e); }
  }, []);

  // After an auto-apply run drafts applications, pull the fresh list so the
  // new Drafts show up everywhere immediately.
  const reloadApps = useCallback(async () => {
    try { setApps(await api.listApplications()); } catch (e) { console.error(e); }
  }, []);

  const navItems: { id: View; label: string; icon: LucideIcon }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "applications", label: "Applications", icon: Briefcase },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "interviews", label: "Interviews", icon: CalendarDays },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "autoapply", label: "Auto-apply", icon: Zap },
    { id: "insights", label: "SG Market Insights", icon: MapPin },
  ];

  const detailApp = apps.find((a) => a.id === detailId) || null;

  // Gate on a picked user. While checking the stored id, render nothing brief.
  if (!userChecked) {
    return <div style={{ minHeight: "100vh", background: C.bg }} />;
  }
  if (!currentUser) {
    return <Login C={C} dark={dark} onPick={pickUser} />;
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", display: "flex",
      fontFeatureSettings: "'tnum' 1, 'cv05' 1",
    }}>
      <aside style={{
        width: 232, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.panel,
        padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4,
        position: "sticky", top: 0, height: "100vh",
      }} className="sgjt-aside">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 18px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: C.accent,
            display: "grid", placeItems: "center", color: "#fff", flexShrink: 0,
            boxShadow: `0 4px 12px ${C.accentSoft}`,
          }}>
            <Briefcase size={17} strokeWidth={2.4} />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: "-.01em" }}>SG Job Tracker</div>
            <div style={{ fontSize: 10.5, color: C.dim, fontWeight: 500 }}>Application console</div>
          </div>
        </div>

        {navItems.map((n) => {
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => setView(n.id)} className="sgjt-nav"
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "9px 11px",
                borderRadius: 9, border: "none", cursor: "pointer", textAlign: "left",
                fontSize: 13, fontWeight: active ? 650 : 500, width: "100%",
                background: active ? C.accentSoft : "transparent",
                color: active ? (dark ? C.accentDk : C.accent) : C.dim,
              }}>
              <n.icon size={16.5} strokeWidth={active ? 2.4 : 2} />
              {n.label}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: C.accentSoft, display: "grid", placeItems: "center", color: dark ? C.accentDk : C.accent, flexShrink: 0 }}>
              <UserRound size={15} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
              {currentUser.headline && <div style={{ fontSize: 10.5, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.headline}</div>}
            </div>
          </div>
          <button onClick={switchUser} className="sgjt-nav"
            style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 9, border: "none", cursor: "pointer", width: "100%", fontSize: 13, fontWeight: 500, background: "transparent", color: C.dim }}>
            <LogOut size={16.5} /> Switch user
          </button>
          <button onClick={() => setDark((d) => !d)} className="sgjt-nav"
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "9px 11px",
              borderRadius: 9, border: "none", cursor: "pointer", width: "100%",
              fontSize: 13, fontWeight: 500, background: "transparent", color: C.dim,
            }}>
            {dark ? <Sun size={16.5} /> : <Moon size={16.5} />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{
          height: 60, borderBottom: `1px solid ${C.border}`, background: C.panel,
          display: "flex", alignItems: "center", gap: 14, padding: "0 22px",
          position: "sticky", top: 0, zIndex: 20,
        }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.dim }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, role, recruiter…"
              style={{
                width: "100%", padding: "8px 12px 8px 33px", borderRadius: 9,
                border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                fontSize: 13, outline: "none",
              }} className="sgjt-input" />
          </div>
          <button onClick={() => setEditing(blankApp())} className="sgjt-primary"
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 15px",
              borderRadius: 9, border: "none", cursor: "pointer", background: C.accent,
              color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: `0 2px 8px ${C.accentSoft}`,
            }}>
            <Plus size={16} strokeWidth={2.6} /> New application
          </button>
        </header>

        <div style={{ padding: 22, flex: 1 }}>
          {error && (
            <div style={{ background: "rgba(225,29,72,.1)", border: "1px solid rgba(225,29,72,.3)", color: dark ? "#fb7185" : "#be123c", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          {loading ? (
            <div style={{ display: "grid", placeItems: "center", height: 300, color: C.dim, fontSize: 13 }}>Loading…</div>
          ) : (
            <>
              {view === "dashboard" && <Dashboard list={apps} C={C} dark={dark} onOpen={setDetailId} />}
              {view === "applications" && (
                <Applications
                  list={filtered} all={apps} C={C} dark={dark} layout={appLayout} setLayout={setAppLayout}
                  statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                  portalFilter={portalFilter} setPortalFilter={setPortalFilter}
                  onMove={moveStatus} onOpen={setDetailId} onEdit={setEditing}
                />
              )}
              {view === "companies" && <Companies companies={companies} apps={apps} C={C} dark={dark} onUpsert={upsertCompany} onDelete={deleteCompany} onOpenApp={setDetailId} />}
              {view === "interviews" && <Interviews list={apps} C={C} dark={dark} onOpen={setDetailId} />}
              {view === "analytics" && <Analytics list={apps} resumes={resumes} C={C} dark={dark} />}
              {view === "autoapply" && <AutoApply resumes={resumes} C={C} dark={dark} onDataChanged={reloadApps} />}
              {view === "insights" && <Insights list={apps} C={C} dark={dark} />}
            </>
          )}
        </div>
      </main>

      {editing && (
        <ApplicationForm
          record={editing} resumes={resumes} companies={companies} C={C} dark={dark}
          onClose={() => setEditing(null)}
          onSave={(r) => { saveApp(r); setEditing(null); }}
        />
      )}
      {detailApp && (
        <DetailDrawer
          app={detailApp} resumes={resumes} C={C} dark={dark}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditing(detailApp); setDetailId(null); }}
          onDelete={() => deleteApp(detailApp.id)}
        />
      )}
    </div>
  );
}
