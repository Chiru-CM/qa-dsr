import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, FolderMinus, FolderPlus, Plus } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { Modal } from "@/components/dsr/Modal";
import { EmptyState, PageTitle, StatusBadge } from "@/components/dsr/DsrPrimitives";
import { statusOptions, type Project, type ProjectStatus, type Sprint, type StageStatus } from "@/lib/dsr-data";

const sprintCategories = [
  "Functionality Execution",
  "Non Functionality Execution",
  "Automation- Print",
  "Automation- Scan",
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${value}T00:00:00.000Z`));
const formatDateRange = (start: string, end: string) => `${formatDate(start)} – ${formatDate(end)}`;
const todayLabel = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function ProjectStatusGrid({ projects, onRemoveProject }: { projects: Project[]; onRemoveProject: (projectId: string) => void }) {
  if (!projects.length) {
    return <EmptyState title="No projects in this sprint yet" description="Add a project to see its execution status across the four sprint categories." />;
  }

  return <div className="space-y-3">
    {projects.map((project) => (
      <article key={project.id} className="rounded-xl border border-slate-100 bg-white p-4 transition hover:border-[#c9e9e3]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Link to={`/projects/${project.id}`} state={{ fromSprint: true }} className="min-w-0 group">
            <p className="truncate text-sm font-bold text-slate-800 transition group-hover:text-[#218f82]">{project.name}</p>
            <p className="mt-1 text-[11px] text-slate-400">{project.owner || "Unassigned"} · Open project details</p>
          </Link>
          <div className="flex items-center gap-2"><StatusBadge status={project.status} compact /><button onClick={() => onRemoveProject(project.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-[#fff0ed] hover:text-[#c65e52]" aria-label={`Remove ${project.name} from sprint`} title="Remove from sprint"><FolderMinus size={15} /></button></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {sprintCategories.map((category) => {
            const stage = project.stages.find((item) => normalize(item.name) === normalize(category));
            const status: StageStatus = stage?.status ?? "N/A";
            return <div key={category} className="flex min-h-[66px] flex-col justify-between rounded-lg bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-semibold leading-4 text-slate-500">{category}</p>
              <div className="mt-2"><StatusBadge status={status} compact /></div>
            </div>;
          })}
        </div>
      </article>
    ))}
  </div>;
}

export default function Index() {
  const { projects, setProjects, sprints, setSprints, activeSprintId, setActiveSprintId } = useOutletContext<DsrOutletContext>();
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [existingProjectId, setExistingProjectId] = useState("");
  const [sprintError, setSprintError] = useState("");
  const activeSprint = sprints.find((sprint) => sprint.id === activeSprintId);
  const sprintProjects = useMemo(() => {
    if (!activeSprint) return [];
    return activeSprint.projectIds
      .map((id) => projects.find((project) => project.id === id))
      .filter((project): project is Project => Boolean(project));
  }, [activeSprint, projects]);

  const createSprint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const startDate = String(data.get("startDate") ?? "");
    const endDate = String(data.get("endDate") ?? "");
    if (startDate > endDate) {
      setSprintError("The end date must be on or after the start date.");
      return;
    }
    const sprint: Sprint = { id: `sprint-${Date.now()}`, name, startDate, endDate, projectIds: [] };
    setSprints((current) => [sprint, ...current]);
    setActiveSprintId(sprint.id);
    setSprintError("");
    setSprintModalOpen(false);
  };

  const addExistingProject = () => {
    if (!activeSprint || !existingProjectId) return;
    setSprints((current) => current.map((sprint) => sprint.id === activeSprint.id && !sprint.projectIds.includes(existingProjectId)
      ? { ...sprint, projectIds: [...sprint.projectIds, existingProjectId] }
      : sprint));
    setExistingProjectId("");
    setProjectModalOpen(false);
  };

  const removeProjectFromSprint = (projectId: string) => {
    if (!activeSprint) return;
    setSprints((current) => current.map((sprint) => sprint.id === activeSprint.id
      ? { ...sprint, projectIds: sprint.projectIds.filter((id) => id !== projectId) }
      : sprint));
  };

  const createProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSprint) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const owner = String(data.get("owner") ?? "QA Engineering").trim() || "QA Engineering";
    const status = String(data.get("status") ?? "Yet to Start") as ProjectStatus;
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
    const stageNames = [
      "Exploratory",
      "TC Design",
      "Functionality Execution",
      "Non Functionality Execution",
      "Automation- Print",
      "Automation- Scan",
    ];
    const newProject: Project = {
      id,
      name,
      owner,
      status,
      lastUpdated: todayLabel(),
      stages: stageNames.map((stageName, index) => ({ id: `${id}-stage-${index}`, name: stageName, status: "Yet to Start" })),
      blockers: [],
      execution: sprintCategories.map((area, index) => ({ id: `${id}-execution-${index}`, area, completion: null, bugs: [], notes: "", owner, poc: "" })),
      risks: [],
      notes: "New DSR project. Add the initial execution details below.",
      functionalityStatus: "Yet to Start",
      nonFunctionalityStatus: "Yet to Start",
      automationStatus: "Yet to Start",
    };
    setProjects((current) => [newProject, ...current]);
    setSprints((current) => current.map((sprint) => sprint.id === activeSprint.id ? { ...sprint, projectIds: [...sprint.projectIds, id] } : sprint));
    setProjectModalOpen(false);
  };

  return <div className="mx-auto max-w-[1440px]">
    <PageTitle
      eyebrow="Sprint workspace"
      title={activeSprint?.name ?? "Sprint overview"}
      description={activeSprint ? "A focused view of project execution across the sprint date range." : "Create a sprint with its own dates, then add projects to track their execution."}
      action={<button onClick={() => { setSprintError(""); setSprintModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#b9e7df] hover:text-[#218f82]"><Plus size={14} />New sprint</button>}
    />

    <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_3px_15px_rgba(20,40,70,0.03)] md:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="block min-w-[220px]">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Selected sprint</span>
            <select value={activeSprintId} onChange={(event) => setActiveSprintId(event.target.value)} disabled={!sprints.length} className="form-input">
              {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
              {!sprints.length && <option value="">Create your first sprint</option>}
            </select>
          </label>
          {activeSprint && <div className="flex items-center gap-2 rounded-lg bg-[#f3f8fa] px-3 py-2.5 text-xs font-semibold text-slate-600"><CalendarDays size={15} className="shrink-0 text-[#269b8c]" /><span>{formatDateRange(activeSprint.startDate, activeSprint.endDate)}</span></div>}
        </div>
        {activeSprint && <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-400"><span className="font-bold text-slate-700">{sprintProjects.length}</span> {sprintProjects.length === 1 ? "project" : "projects"}</span>
          <button onClick={() => setProjectModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10263d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#183752]"><FolderPlus size={14} />Add project</button>
        </div>}
      </div>
    </section>

    {activeSprint ? <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div><h2 className="text-[15px] font-bold text-slate-800">Execution overview</h2><p className="mt-0.5 text-xs text-slate-400">Project status across the four sprint categories. Select a project for its detailed DSR.</p></div>
          <span className="text-[11px] font-semibold text-slate-400">{formatDateRange(activeSprint.startDate, activeSprint.endDate)}</span>
        </div>
      </div>
      <div className="space-y-3 bg-slate-50/40 p-4 md:p-5">
        <ProjectStatusGrid projects={sprintProjects} onRemoveProject={removeProjectFromSprint} />
      </div>
    </section> : <EmptyState title="Start with your first sprint" description="Set the sprint name and date range. You can then create projects inside it and follow the four execution categories." />}

    {activeSprint && <div className="mt-4 flex justify-end"><Link to="/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#218f82] hover:underline">Browse all projects<ArrowRight size={13} /></Link></div>}

    <Modal open={sprintModalOpen} onClose={() => { setSprintModalOpen(false); setSprintError(""); }} title="Create sprint" description="Choose a name and date range for this reporting cycle.">
      <form onSubmit={createSprint} className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Sprint name</span><input name="name" required placeholder="e.g. Sprint 12" className="form-input" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Start date</span><input name="startDate" type="date" required className="form-input" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">End date</span><input name="endDate" type="date" required className="form-input" /></label>
        </div>
        {sprintError && <p role="alert" className="text-xs font-medium text-[#c65e52]">{sprintError}</p>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setSprintModalOpen(false); setSprintError(""); }} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-[#10263d] px-4 py-2 text-xs font-bold text-white">Create sprint</button></div>
      </form>
    </Modal>

    <Modal open={projectModalOpen} onClose={() => { setProjectModalOpen(false); setExistingProjectId(""); }} title="Add project to sprint" description={activeSprint ? `Add an existing project or create one for ${activeSprint.name}.` : undefined}>
      {activeSprint && projects.some((project) => !activeSprint.projectIds.includes(project.id)) && <div className="mb-5 rounded-xl bg-slate-50 p-3.5">
        <p className="mb-2 text-xs font-bold text-slate-700">Add an existing project</p>
        <div className="flex gap-2"><select value={existingProjectId} onChange={(event) => setExistingProjectId(event.target.value)} className="form-input"><option value="">Choose a project</option>{projects.filter((project) => !activeSprint.projectIds.includes(project.id)).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button type="button" disabled={!existingProjectId} onClick={addExistingProject} className="shrink-0 rounded-lg bg-[#eaf8f5] px-3 text-xs font-bold text-[#218f82] transition hover:bg-[#d9f3ee] disabled:cursor-not-allowed disabled:opacity-50">Add</button></div>
        <div className="my-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or create new<span className="h-px flex-1 bg-slate-200" /></div>
      </div>}
      <form onSubmit={createProject} className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Project name</span><input name="name" required placeholder="e.g. SafeQ Cloud 26.1" className="form-input" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Owner</span><input name="owner" defaultValue="QA Engineering" className="form-input" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Overall status</span><select name="status" defaultValue="Yet to Start" className="form-input">{statusOptions.filter((status) => !["N/A", "Not Yet Started", "Complete"].includes(status)).map((status) => <option key={status}>{status}</option>)}</select></label>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setProjectModalOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-[#10263d] px-4 py-2 text-xs font-bold text-white">Create project</button></div>
      </form>
    </Modal>
  </div>;
}
