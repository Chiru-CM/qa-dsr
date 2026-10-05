import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, ChevronDown, FolderMinus, FolderPlus, Plus } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { Modal } from "@/components/dsr/Modal";
import { EmptyState, PageTitle, StatusBadge } from "@/components/dsr/DsrPrimitives";
import { statusOptions, type Project, type ProjectStatus, type Sprint, type SprintStatus, type StageStatus } from "@/lib/dsr-data";

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

type ExecutionSummaryStatus = "Completed" | "In Progress" | "Blocked" | "Not Started";

const executionCardTones: Record<ExecutionSummaryStatus, string> = {
  Completed: "border-[#bce8d8] bg-[#f4fbf8] shadow-[0_2px_10px_rgba(55,185,165,0.08)] hover:border-[#37b9a5]",
  "In Progress": "border-[#c9dcfb] bg-[#f6f9ff] shadow-[0_2px_10px_rgba(97,149,220,0.08)] hover:border-[#6195dc]",
  Blocked: "border-[#f7c9c2] bg-[#fff8f6] shadow-[0_2px_10px_rgba(211,109,95,0.08)] hover:border-[#ef806f]",
  "Not Started": "border-slate-200 bg-white shadow-sm hover:border-slate-300",
};

const executionStatusTextTones: Record<ExecutionSummaryStatus, string> = {
  Completed: "text-[#20866f]",
  "In Progress": "text-[#4071ba]",
  Blocked: "text-[#c65e52]",
  "Not Started": "text-slate-500",
};

function projectExecutionStatus(project: Project): ExecutionSummaryStatus {
  const statuses = sprintCategories.map((category) => project.stages.find((stage) => normalize(stage.name) === normalize(category))?.status ?? "N/A");
  if (statuses.every((status) => status === "Completed" || status === "Complete")) return "Completed";
  if (statuses.some((status) => status === "Blocked" || status === "Failed")) return "Blocked";
  if (statuses.every((status) => ["Yet to Start", "Not Yet Started", "N/A"].includes(status))) return "Not Started";
  return "In Progress";
}

function ProjectStatusGrid({ projects, onRemoveProject }: { projects: Project[]; onRemoveProject: (projectId: string) => void }) {
  if (!projects.length) {
    return <EmptyState title="No projects in this sprint yet" description="Add a project to see its status and four-category execution overview." />;
  }

  return <div className="space-y-1.5">
    {projects.map((project) => {
      const executionStatus = projectExecutionStatus(project);
      return <article key={project.id} className={`rounded-lg border p-2.5 transition ${executionCardTones[executionStatus]}`}>
        <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-center">
          <Link to={`/projects/${project.id}`} state={{ fromSprint: true }} className="group min-w-0">
            <p className="truncate text-[13px] font-bold text-slate-800 transition group-hover:text-[#218f82]">{project.name}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{project.owner || "Unassigned"} · <span className={`font-bold ${executionStatusTextTones[executionStatus]}`}>{executionStatus}</span> · Open project details</p>
          </Link>
          <button onClick={() => onRemoveProject(project.id)} className="self-start rounded-md p-1.5 text-slate-400 transition hover:bg-[#fff0ed] hover:text-[#c65e52] sm:self-auto" aria-label={`Remove ${project.name} from sprint`} title="Remove from sprint"><FolderMinus size={14} /></button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {sprintCategories.map((category) => {
            const stage = project.stages.find((item) => normalize(item.name) === normalize(category));
            const status: StageStatus = stage?.status ?? "N/A";
            return <div key={category} className="flex min-h-[48px] flex-col justify-between rounded-md bg-slate-50/80 px-2 py-1.5">
              <p className="text-[10px] font-semibold leading-4 text-slate-500">{category}</p>
              <div className="mt-1"><StatusBadge status={status} compact /></div>
            </div>;
          })}
        </div>
      </article>;
    })}
  </div>;
}

export default function Index() {
  const { projects, setProjects, sprints, setSprints, setActiveSprintId } = useOutletContext<DsrOutletContext>();
  const [expandedSprintIds, setExpandedSprintIds] = useState<Set<string>>(() => new Set());
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState("");
  const [existingProjectId, setExistingProjectId] = useState("");
  const [sprintError, setSprintError] = useState("");
  const targetSprint = sprints.find((sprint) => sprint.id === targetSprintId);

  const projectsForSprint = (sprint: Sprint) => sprint.projectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project));

  const toggleSprint = (sprintId: string) => {
    if (!expandedSprintIds.has(sprintId)) setActiveSprintId(sprintId);
    setExpandedSprintIds((current) => {
      const next = new Set(current);
      if (next.has(sprintId)) next.delete(sprintId);
      else next.add(sprintId);
      return next;
    });
  };

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
    const sprint: Sprint = { id: `sprint-${Date.now()}`, name, startDate, endDate, status: "In Progress", projectIds: [] };
    setSprints((current) => [sprint, ...current]);
    setExpandedSprintIds((current) => new Set(current).add(sprint.id));
    setActiveSprintId(sprint.id);
    setSprintError("");
    setSprintModalOpen(false);
  };

  const openProjectModal = (sprintId: string) => {
    setTargetSprintId(sprintId);
    setExistingProjectId("");
    setProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    setProjectModalOpen(false);
    setExistingProjectId("");
    setTargetSprintId("");
  };

  const addExistingProject = () => {
    if (!targetSprint || !existingProjectId) return;
    setSprints((current) => current.map((sprint) => sprint.id === targetSprint.id && !sprint.projectIds.includes(existingProjectId)
      ? { ...sprint, projectIds: [...sprint.projectIds, existingProjectId] }
      : sprint));
    closeProjectModal();
  };

  const updateSprintStatus = (sprintId: string, status: SprintStatus) => {
    setSprints((current) => current.map((sprint) => sprint.id === sprintId ? { ...sprint, status } : sprint));
  };

  const removeProjectFromSprint = (sprintId: string, projectId: string) => {
    setSprints((current) => current.map((sprint) => sprint.id === sprintId
      ? { ...sprint, projectIds: sprint.projectIds.filter((id) => id !== projectId) }
      : sprint));
  };

  const createProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetSprint) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const owner = String(data.get("owner") ?? "QA Engineering").trim() || "QA Engineering";
    const status = String(data.get("status") ?? "Yet to Start") as ProjectStatus;
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
    const stageNames = ["Exploratory", "TC Design", ...sprintCategories];
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
      notes: "",
      functionalityStatus: "Yet to Start",
      nonFunctionalityStatus: "Yet to Start",
      automationStatus: "Yet to Start",
    };
    setProjects((current) => [newProject, ...current]);
    setSprints((current) => current.map((sprint) => sprint.id === targetSprint.id ? { ...sprint, projectIds: [...sprint.projectIds, id] } : sprint));
    closeProjectModal();
  };

  return <div className="mx-auto max-w-[1440px]">
    <PageTitle
      eyebrow="Sprint workspace"
      title="Sprints"
      description="Expand a sprint to view project statuses and execution details."
      action={<button onClick={() => { setSprintError(""); setSprintModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10263d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#183752]"><Plus size={14} />New sprint</button>}
    />

    {sprints.length ? <div className="space-y-3">
      {sprints.map((sprint) => {
        const isExpanded = expandedSprintIds.has(sprint.id);
        const sprintProjects = projectsForSprint(sprint);
        return <section key={sprint.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
          <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center md:px-4">
            <button type="button" onClick={() => toggleSprint(sprint.id)} aria-expanded={isExpanded} aria-controls={`sprint-content-${sprint.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 text-left transition hover:bg-slate-50/70">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${isExpanded ? "bg-[#eaf8f5] text-[#218f82]" : "bg-slate-100 text-slate-500"}`}><ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`} /></span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5"><span className="truncate text-sm font-bold text-slate-800">{sprint.name}</span><span className="flex items-center gap-1 text-[11px] font-medium text-slate-400"><CalendarDays size={12} />{formatDateRange(sprint.startDate, sprint.endDate)}</span></span>
              <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{sprintProjects.length} {sprintProjects.length === 1 ? "project" : "projects"}</span>
            </button>
            <select aria-label={`Status for ${sprint.name}`} value={sprint.status ?? "In Progress"} onChange={(event) => updateSprintStatus(sprint.id, event.target.value as SprintStatus)} className={`h-8 shrink-0 rounded-full border px-3 text-[11px] font-semibold outline-none ${sprint.status === "Completed" ? "border-[#bce8d8] bg-[#e7f7f1] text-[#20866f]" : sprint.status === "Blocked" ? "border-[#f7c9c2] bg-[#fff0ed] text-[#c65e52]" : sprint.status === "Not Started" ? "border-slate-200 bg-slate-100 text-slate-500" : "border-[#c9dcfb] bg-[#eaf2ff] text-[#4071ba]"}`}>
              {["Not Started", "In Progress", "Blocked", "Completed"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          {isExpanded && <div id={`sprint-content-${sprint.id}`} className="border-t border-slate-100 bg-slate-50/40 p-3 md:p-4">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div><h3 className="text-sm font-bold text-slate-800">Project execution overview</h3><p className="mt-0.5 text-[11px] text-slate-400">Overall project status and progress across the four execution categories.</p></div>
              <button onClick={() => openProjectModal(sprint.id)} className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#10263d] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#183752] sm:self-auto"><FolderPlus size={14} />Add project</button>
            </div>
            <ProjectStatusGrid projects={sprintProjects} onRemoveProject={(projectId) => removeProjectFromSprint(sprint.id, projectId)} />
          </div>}
        </section>;
      })}
    </div> : <EmptyState title="No sprints yet" description="Create a sprint with a name and date range, then add projects to see their execution overview." />}

    <div className="mt-4 flex justify-end"><Link to="/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#218f82] hover:underline">Browse all projects<ArrowRight size={13} /></Link></div>

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

    <Modal open={projectModalOpen} onClose={closeProjectModal} title="Add project to sprint" description={targetSprint ? `Add an existing project or create one for ${targetSprint.name}.` : undefined}>
      {targetSprint && projects.some((project) => !targetSprint.projectIds.includes(project.id)) && <div className="mb-5 rounded-xl bg-slate-50 p-3.5">
        <p className="mb-2 text-xs font-bold text-slate-700">Add an existing project</p>
        <div className="flex gap-2"><select value={existingProjectId} onChange={(event) => setExistingProjectId(event.target.value)} className="form-input"><option value="">Choose a project</option>{projects.filter((project) => !targetSprint.projectIds.includes(project.id)).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button type="button" disabled={!existingProjectId} onClick={addExistingProject} className="shrink-0 rounded-lg bg-[#eaf8f5] px-3 text-xs font-bold text-[#218f82] transition hover:bg-[#d9f3ee] disabled:cursor-not-allowed disabled:opacity-50">Add</button></div>
        <div className="my-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or create new<span className="h-px flex-1 bg-slate-200" /></div>
      </div>}
      <form onSubmit={createProject} className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Project name</span><input name="name" required placeholder="e.g. SafeQ Cloud 26.1" className="form-input" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Owner</span><input name="owner" defaultValue="QA Engineering" className="form-input" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Overall status</span><select name="status" defaultValue="Yet to Start" className="form-input">{statusOptions.filter((status) => !["N/A", "Not Yet Started", "Complete"].includes(status)).map((status) => <option key={status}>{status}</option>)}</select></label>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={closeProjectModal} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-[#10263d] px-4 py-2 text-xs font-bold text-white">Create project</button></div>
      </form>
    </Modal>
  </div>;
}
