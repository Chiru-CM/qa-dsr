import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronRight,
  CalendarDays,
  FolderKanban,
  Menu,
  Settings,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import type { DailySnapshot, Project, Sprint, Workspace } from "@/lib/dsr-data";
import type { WorkspaceData } from "@shared/api";

export interface DsrOutletContext {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  sprints: Sprint[];
  setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>;
  workspace: Workspace;
  setWorkspace: React.Dispatch<React.SetStateAction<Workspace>>;
  activeSprintId: string;
  setActiveSprintId: React.Dispatch<React.SetStateAction<string>>;
  dailySnapshots: Record<string, DailySnapshot>;
}

const navItems = [
  { label: "Sprints", to: "/", icon: CalendarDays },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Blockers", to: "/blockers", icon: ShieldAlert },
  { label: "Risks", to: "/risks", icon: TriangleAlert },
  { label: "Settings", to: "/settings", icon: Settings },
];

export default function DsrLayout() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [workspace, setWorkspace] = useState<Workspace>({ name: "My Workspace" });
  const [activeSprintId, setActiveSprintId] = useState("");
  const [dailySnapshots, setDailySnapshots] = useState<Record<string, DailySnapshot>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saveQueue = useRef(Promise.resolve());
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError(false);
    fetch("/api/workspace")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load workspace");
        return response.json() as Promise<WorkspaceData>;
      })
      .then((data) => {
        if (cancelled) return;
        setWorkspace(data.workspace);
        setProjects(data.projects);
        setSprints(data.sprints);
        setDailySnapshots(data.dailySnapshots);
        setActiveSprintId(data.sprints[0]?.id ?? "");
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [loadAttempt]);

  useEffect(() => {
    if (!loaded) return;
    const data: WorkspaceData = { workspace, projects, sprints, dailySnapshots };
    saveQueue.current = saveQueue.current.then(async () => {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Unable to save workspace");
      setSaveError(false);
    }).catch(() => setSaveError(true));
  }, [loaded, workspace, projects, sprints, dailySnapshots]);

  useEffect(() => {
    if (!loaded) return;
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    setDailySnapshots((current) => {
      const next = { ...current };
      sprints.forEach((sprint) => {
        next[`${sprint.id}:${date}`] = {
          sprintId: sprint.id,
          sprintName: sprint.name,
          sprintStartDate: sprint.startDate,
          sprintEndDate: sprint.endDate,
          sprintStatus: sprint.status,
          date,
          capturedAt: now.toISOString(),
          projects: sprint.projectIds.map((id) => projects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project)),
        };
      });
      return next;
    });
  }, [loaded, projects, sprints]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col bg-[#10263d] text-slate-300 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[88px] items-center justify-between px-7">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#37c7b1] text-lg font-extrabold text-[#10263d] shadow-lg shadow-[#37c7b1]/20">Q</span>
            <span>
              <span className="block text-[15px] font-bold tracking-wide text-white">QALens</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">DSR Operations</span>
            </span>
          </Link>
          <button className="text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close sidebar"><X size={20} /></button>
        </div>
        <div className="px-4 pb-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{workspace.name}</span>
              <ChevronRight size={15} className="text-slate-500" />
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4" aria-label="Main navigation">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
          <div className="space-y-1">
            {navItems.map(({ label, to, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${isActive ? "bg-[#1d4056] text-white shadow-sm" : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"}`}>
                {({ isActive }) => <><Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} /><span>{label}</span>{isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#37c7b1]" />}</>}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] p-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f3c969] text-xs font-bold text-[#10263d]">WO</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">Workspace Owner</p>
              <p className="truncate text-[11px] text-slate-500">Single-user workspace</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="dsr-main-content lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex"><span>{workspace.name}</span><ChevronRight size={13} /><span className="font-medium text-slate-600">{navItems.find((item) => item.to === location.pathname)?.label ?? (location.pathname.includes("/projects/") ? "Project Details" : "Workspace")}</span></div>
            <span className="text-sm font-semibold text-slate-800 md:hidden">QALens</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 border-r border-slate-200 pr-4 text-right sm:block"><p className="text-[11px] font-medium text-slate-400">Reporting period</p><p className="text-xs font-semibold text-slate-700">{sprints.find((sprint) => sprint.id === activeSprintId)?.name ?? "No sprint selected"}</p></div>
            <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ef806f]" /></button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f7f4] text-[11px] font-bold text-[#218f82]">U</div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-72px)] p-5 md:p-8">
          {loadError ? <div className="mx-auto max-w-lg rounded-2xl border border-[#f7c9c2] bg-white p-8 text-center"><p className="text-sm font-bold text-slate-800">Workspace could not be loaded</p><p className="mt-2 text-xs text-slate-500">Check the server connection and try again.</p><button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-5 rounded-lg bg-[#10263d] px-4 py-2 text-xs font-bold text-white">Try again</button></div> : !loaded ? <div className="py-16 text-center text-sm font-medium text-slate-400">Loading workspace…</div> : <>
            {saveError && <p role="alert" className="mb-4 rounded-lg border border-[#f2dfaa] bg-[#fffaf0] px-3 py-2 text-xs font-medium text-[#8a6829]">Changes could not be saved. Check the server connection.</p>}
            <Outlet context={{ projects, setProjects, sprints, setSprints, workspace, setWorkspace, activeSprintId, setActiveSprintId, dailySnapshots }} />
          </>}
        </main>
      </div>
    </div>
  );
}
