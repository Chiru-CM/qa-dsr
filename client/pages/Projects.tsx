import { FormEvent, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ChevronRight, ListFilter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { PageTitle, ProgressBar, StatusBadge } from "@/components/dsr/DsrPrimitives";
import { Modal } from "@/components/dsr/Modal";
import { PROJECT_NAMES, projectCompletion, type Project, type ProjectStatus } from "@/lib/dsr-data";

const statuses: Array<"All statuses" | ProjectStatus> = ["All statuses", "Completed", "In Progress", "Yet to Start", "Blocked", "Failed", "Deferred"];

export default function Projects() {
  const { projects, setProjects } = useOutletContext<DsrOutletContext>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All statuses");
  const [automationOnly, setAutomationOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const filtered = useMemo(() => projects.filter((project) => {
    const matchesQuery = project.name.toLowerCase().includes(query.toLowerCase()) || project.owner.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All statuses" || project.status === status;
    const matchesAutomation = !automationOnly || ["Failed", "Blocked", "Deferred"].includes(project.automationStatus);
    return matchesQuery && matchesStatus && matchesAutomation;
  }), [projects, query, status, automationOnly]);

  const addProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "New project").trim();
    const owner = String(data.get("owner") || "QA Engineering").trim();
    const newProject: Project = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name,
      owner,
      status: String(data.get("status")) as ProjectStatus,
      lastUpdated: "20 Sep 2025",
      stages: ["Exploratory", "TC Design", "Functionality Execution", "Non-Functionality Execution", "Automation"].map((stageName, index) => ({ id: `${Date.now()}-${index}`, name: stageName, status: "Yet to Start" })),
      blockers: [],
      execution: ["Functionality", "Non-Functionality", "Automation"].map((area, index) => ({ id: `${Date.now()}-execution-${index}`, area, completion: null, bugs: [], notes: "", owner, poc: "" })),
      risks: [],
      notes: "New DSR project. Add the initial execution details below.",
      functionalityStatus: "Yet to Start",
      nonFunctionalityStatus: "Yet to Start",
      automationStatus: "Yet to Start",
    };
    setProjects((current) => [newProject, ...current]);
    setAddOpen(false);
  };

  return <div className="mx-auto max-w-[1440px]">
    <PageTitle eyebrow="Portfolio overview" title="All projects" description="Track stage readiness, execution health, defects, and owners across the QA portfolio." action={<button onClick={() => setAddOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10263d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#183752]"><Plus size={15} />Add project</button>} />
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_3px_15px_rgba(20,40,70,0.03)] lg:flex-row lg:items-center">
      <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or owners..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#69cbbb] focus:bg-white focus:ring-2 focus:ring-[#bdebe4]" /></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><SlidersHorizontal size={14} />Filters</div><select value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-[#69cbbb]"><option value="All statuses">All statuses</option>{statuses.slice(1).map((value) => <option key={value} value={value}>{value}</option>)}</select><button onClick={() => setAutomationOnly((value) => !value)} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${automationOnly ? "border-[#b9e7df] bg-[#eaf8f5] text-[#218f82]" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}><ListFilter size={14} />Automation issues</button></div>
    </div>
    <div className="mb-4 flex items-center justify-between"><p className="text-xs font-semibold text-slate-400">Showing <span className="text-slate-700">{filtered.length}</span> of {projects.length} projects</p><p className="text-[11px] text-slate-400">Click a project to open its DSR</p></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><div className="hidden min-w-[960px] grid-cols-[1.55fr_0.82fr_0.95fr_0.9fr_0.9fr_0.82fr_0.6fr_0.9fr_22px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 md:grid"><span>Project</span><span>Status</span><span>Completion</span><span>Functionality</span><span>Non-functionality</span><span>Automation</span><span>Bugs</span><span>Owner</span><span /></div><div className="divide-y divide-slate-100">{filtered.map((project) => <Link to={`/projects/${project.id}`} key={project.id} className="group block px-4 py-4 transition hover:bg-[#fbfdfd] md:px-5"><div className="grid items-center gap-3 md:min-w-[960px] md:grid-cols-[1.55fr_0.82fr_0.95fr_0.9fr_0.9fr_0.82fr_0.6fr_0.9fr_22px] md:gap-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf8f6] text-xs font-bold text-[#268f81]">{project.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700 group-hover:text-[#218f82]">{project.name}</p><p className="mt-1 truncate text-[11px] text-slate-400">Updated {project.lastUpdated}</p></div></div><div><StatusBadge status={project.status} compact /></div><ProgressBar value={projectCompletion(project) / 100} /><div><StatusBadge status={project.functionalityStatus} compact /></div><div><StatusBadge status={project.nonFunctionalityStatus} compact /></div><div><StatusBadge status={project.automationStatus} compact /></div><div className="text-xs font-bold text-slate-600">{project.execution.reduce((sum, item) => sum + item.bugs.length, 0)}</div><div className="truncate text-xs font-medium text-slate-500">{project.owner}</div><ChevronRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#37b9a5]" /></div><div className="mt-3 flex flex-wrap items-center gap-2 md:hidden"><StatusBadge status={project.status} compact /><ProgressBar value={projectCompletion(project) / 100} className="min-w-[150px] flex-1" /><span className="text-[11px] font-semibold text-slate-400">{project.execution.reduce((sum, item) => sum + item.bugs.length, 0)} bugs</span></div></Link>)}{filtered.length === 0 && <div className="px-5 py-14 text-center"><p className="text-sm font-semibold text-slate-600">No projects match those filters</p><p className="mt-1 text-xs text-slate-400">Try a different search or reset the active filters.</p></div>}</div></div>
    <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add project" description="Create a new project in the current DSR workspace."><form onSubmit={addProject} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Project name</span><input name="name" required placeholder="e.g. SafeQ Cloud 26.1" className="form-input" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Owner</span><input name="owner" defaultValue="QA Engineering" className="form-input" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Overall status</span><select name="status" defaultValue="Yet to Start" className="form-input"><option>Yet to Start</option><option>In Progress</option><option>Completed</option><option>Blocked</option></select></label><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-[#10263d] px-4 py-2 text-xs font-bold text-white">Create project</button></div></form></Modal>
  </div>;
}

export const availableProjectNames = PROJECT_NAMES;
