import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import { cloneProjects, normalizeProjects, type Project } from "@/lib/dsr-data";

export interface DsrOutletContext {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

const navItems = [
  { label: "DSR Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Blockers", to: "/blockers", icon: ShieldAlert },
  { label: "Risks", to: "/risks", icon: TriangleAlert },
  { label: "Settings", to: "/settings", icon: Settings },
];

export default function DsrLayout() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem("dsr-projects");
    return saved ? normalizeProjects(JSON.parse(saved) as Project[]) : cloneProjects();
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("dsr-projects", JSON.stringify(projects));
  }, [projects]);

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
              <span className="text-sm font-semibold text-white">QA Engineering</span>
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
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f3c969] text-xs font-bold text-[#10263d]">QA</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">QA Operations</p>
              <p className="truncate text-[11px] text-slate-500">Internal workspace</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex"><span>QA Engineering</span><ChevronRight size={13} /><span className="font-medium text-slate-600">{navItems.find((item) => item.to === location.pathname)?.label ?? (location.pathname.includes("/projects/") ? "Project Details" : "Workspace")}</span></div>
            <span className="text-sm font-semibold text-slate-800 md:hidden">QALens</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 border-r border-slate-200 pr-4 text-right sm:block"><p className="text-[11px] font-medium text-slate-400">Reporting period</p><p className="text-xs font-semibold text-slate-700">20 September 2025</p></div>
            <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ef806f]" /></button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f7f4] text-[11px] font-bold text-[#218f82]">CM</div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-72px)] p-5 md:p-8">
          <Outlet context={{ projects, setProjects }} />
        </main>
      </div>
    </div>
  );
}
