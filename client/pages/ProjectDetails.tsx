import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Pencil, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { Modal } from "@/components/dsr/Modal";
import { EmptyState, PageTitle, ProgressBar, SectionHeading, StatusBadge } from "@/components/dsr/DsrPrimitives";
import { executionMetricNumber, normalizeProject, statusOptions, type Blocker, type Defect, type DefectSeverity, type DefectStatus, type ExecutionItem, type ExecutionMetricValue, type NormalizedProject, type PreparationItem, type Project, type StageStatus } from "@/lib/dsr-data";

type ModalType = "blocker" | "execution" | "project" | "stage" | "preparation" | "defect" | null;
const defectStatuses: DefectStatus[] = ["Open", "In Progress", "Development", "Fixed / In Verification", "Closed"];
const defectSeverities: DefectSeverity[] = ["P1", "P2", "P3"];
const defaultStageNames = ["Exploratory", "TC Design", "Functionality Execution", "Non Functionality Execution", "Automation- Print", "Automation- Scan"];
const normalizeStageName = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
const todayLabel = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const inputClass = "form-input";
const stageStatusOptions: StageStatus[] = [...statusOptions.filter((status) => status !== "Not Yet Started"), "TBD"];
const stageStatusColors: Record<StageStatus, string> = {
  Completed: "bg-[#e7f7f1] text-[#20866f]",
  Complete: "bg-[#e7f7f1] text-[#20866f]",
  "In Progress": "bg-[#eaf2ff] text-[#4071ba]",
  "Yet to Start": "bg-slate-50 text-slate-600",
  "Not Yet Started": "bg-slate-50 text-slate-600",
  Blocked: "bg-[#fffaf0] text-[#8a6829]",
  Failed: "bg-[#fff0ed] text-[#c65e52]",
  Deferred: "bg-[#f5f3ff] text-[#7257b5]",
  "N/A": "bg-slate-50 text-slate-400",
  TBD: "bg-slate-50 text-slate-600",
};

const readExecutionMetric = (data: FormData, key: string) => {
  const value = String(data.get(key) ?? "").trim();
  return value === "" ? null : value;
};

const asPercent = (part: ExecutionMetricValue | undefined, whole: ExecutionMetricValue | undefined) => {
  const partNumber = executionMetricNumber(part);
  const wholeNumber = executionMetricNumber(whole);
  return wholeNumber && wholeNumber > 0 && partNumber !== null ? Math.round((partNumber / wholeNumber) * 10000) / 100 : null;
};
const executionCompletion = (item: ExecutionItem) => asPercent(item.testCasesExecuted, item.totalTestCases) ?? (item.completion === null ? null : typeof item.completion === "number" ? Math.round(item.completion * 100) : executionMetricNumber(item.completion));
const completionDisplay = (item: ExecutionItem) => {
  const percentage = executionCompletion(item);
  return percentage === null ? item.completion || "—" : `${percentage}%`;
};
const displayPercent = (value: number | null) => value === null ? "—" : `${value}%`;

const safeExternalUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

const chartExecutionMetrics = (item: NormalizedProject["execution"][number]) => {
  const total = item.totalTestCases;
  return {
    category: item.area,
    "Pass %": asPercent(item.testCasesPassed, total) ?? 0,
    "Block %": asPercent(item.blocked, total) ?? 0,
    "To Do %": asPercent(item.toDo, total) ?? 0,
    "Fail %": asPercent(item.failed, total) ?? 0,
  };
};

const defectStatusLabel = (status: DefectStatus) => status === "Development" ? "In Progress" : status;
const defectSummaryStatuses = ["Open", "In Progress", "Fixed / In Verification", "Closed"] as const;

function ProjectDetails() {
  const { projectId } = useParams();
  const location = useLocation();
  const { projects, setProjects, sprints, activeSprintId } = useOutletContext<DsrOutletContext>();
  const [modal, setModal] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stageError, setStageError] = useState("");
  const [editingBugIds, setEditingBugIds] = useState(false);
  const [bugIdsText, setBugIdsText] = useState("");
  const [editingHighLevelComments, setEditingHighLevelComments] = useState(false);
  const [highLevelCommentsText, setHighLevelCommentsText] = useState("");
  const [editingProjectNotes, setEditingProjectNotes] = useState(false);
  const [projectNotesText, setProjectNotesText] = useState("");
  const [editingRiskSummary, setEditingRiskSummary] = useState(false);
  const [riskSummaryText, setRiskSummaryText] = useState("");
  const project = projects.find((item) => item.id === projectId);
  const projectSprint = sprints.find((sprint) => sprint.id === activeSprintId && sprint.projectIds.includes(projectId ?? "")) ?? sprints.find((sprint) => sprint.projectIds.includes(projectId ?? ""));

  const updateProject = (updater: (current: NormalizedProject) => NormalizedProject) => {
    setProjects((current) => current.map((item) => item.id === projectId ? updater(normalizeProject(item)) : item));
  };
  const openModal = (type: Exclude<ModalType, null>, id?: string) => { setEditingId(id ?? null); setModal(type); };
  const closeModal = () => { setEditingId(null); setModal(null); setStageError(""); };
  if (!project) return <Navigate to="/projects" replace />;

  const reportProject = normalizeProject(project);
  const editingBlocker = reportProject.blockers.find((item) => item.id === editingId);
  const editingExecution = reportProject.execution.find((item) => item.id === editingId);
  const editingPreparation = reportProject.preparation.find((item) => item.id === editingId);
  const editingDefect = reportProject.defects.find((item) => item.id === editingId);
  const visibleStages = [
    ...defaultStageNames.filter((name) => !reportProject.hiddenStages.includes(normalizeStageName(name))).map((name) => {
      const stage = reportProject.stages.find((item) => normalizeStageName(item.name) === normalizeStageName(name));
      return { id: stage?.id ?? `default-${normalizeStageName(name)}`, name, status: stage?.status ?? "N/A" as StageStatus, isCustom: false };
    }),
    ...reportProject.stages.filter((stage) => stage.isCustom),
  ];
  const chartExecution = reportProject.execution.map(chartExecutionMetrics);
  const hasExecutionMetrics = reportProject.execution.some((item) => [item.totalTestCases, item.testCasesPassed, item.blocked, item.toDo, item.failed].some((value) => executionMetricNumber(value) !== null));
  const defectSummary = defectSummaryStatuses.map((status) => ({
    status,
    P1: reportProject.defects.filter((defect) => defectStatusLabel(defect.status) === status && defect.severity === "P1").length,
    P2: reportProject.defects.filter((defect) => defectStatusLabel(defect.status) === status && defect.severity === "P2").length,
    P3: reportProject.defects.filter((defect) => defectStatusLabel(defect.status) === status && defect.severity === "P3").length,
  }));
  const totalDefectsBySeverity = defectSeverities.reduce((totals, severity) => ({ ...totals, [severity]: reportProject.defects.filter((defect) => defect.severity === severity).length }), {} as Record<DefectSeverity, number>);

  const saveProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateProject((current) => ({
      ...current,
      name: String(data.get("name") || current.name).trim(),
      report: {
        ...current.report,
        sprintStartDate: projectSprint?.startDate ?? "",
        sprintEndDate: projectSprint?.endDate ?? "",
        firmwareVersion: String(data.get("firmwareVersion") ?? "").trim(),
        solutionVersion: String(data.get("solutionVersion") ?? "").trim(),
        targetedDevices: String(data.get("targetedDevices") ?? "").trim(),
      },
      lastUpdated: todayLabel(),
    }));
    closeModal();
  };

  const updateStageStatus = (stageId: string, stageName: string, isCustom: boolean, status: StageStatus) => {
    updateProject((current) => {
      const index = current.stages.findIndex((stage) => isCustom ? stage.id === stageId : normalizeStageName(stage.name) === normalizeStageName(stageName));
      const stages = index === -1
        ? [...current.stages, { id: stageId, name: stageName, status, isCustom }]
        : current.stages.map((stage, itemIndex) => itemIndex === index ? { ...stage, status } : stage);
      return { ...current, stages, lastUpdated: todayLabel() };
    });
  };

  const deleteStatusItem = (stage: (typeof visibleStages)[number]) => {
    updateProject((current) => ({
      ...current,
      stages: current.stages.filter((item) => item.id !== stage.id),
      hiddenStages: stage.isCustom ? current.hiddenStages : [...new Set([...current.hiddenStages, normalizeStageName(stage.name)])],
      lastUpdated: todayLabel(),
    }));
  };

  const beginEditingBugIds = () => {
    setBugIdsText(reportProject.bugIds.join("\n"));
    setEditingBugIds(true);
  };

  const saveBugIds = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("bugIds") ?? "");
    const values = text.split(/[\n,]+/).map((id) => id.trim()).filter(Boolean);
    const bugIds = values.filter((id, index) => values.findIndex((value) => value.toLowerCase() === id.toLowerCase()) === index);
    updateProject((current) => ({ ...current, bugIds, lastUpdated: todayLabel() }));
    setBugIdsText(bugIds.join("\n"));
    setEditingBugIds(false);
  };

  const beginEditingHighLevelComments = () => {
    setHighLevelCommentsText(reportProject.highLevelComments);
    setEditingHighLevelComments(true);
  };

  const saveHighLevelComments = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const comments = String(new FormData(event.currentTarget).get("highLevelComments") ?? "").trim();
    updateProject((current) => ({ ...current, highLevelComments: comments, lastUpdated: todayLabel() }));
    setHighLevelCommentsText(comments);
    setEditingHighLevelComments(false);
  };

  const beginEditingProjectNotes = () => {
    setProjectNotesText(reportProject.notes);
    setEditingProjectNotes(true);
  };

  const saveProjectNotes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const notes = String(new FormData(event.currentTarget).get("notes") ?? "").trim();
    updateProject((current) => ({ ...current, notes, lastUpdated: todayLabel() }));
    setEditingProjectNotes(false);
  };

  const beginEditingRiskSummary = () => {
    setRiskSummaryText(reportProject.riskSummary);
    setEditingRiskSummary(true);
  };

  const saveRiskSummary = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const riskSummary = String(new FormData(event.currentTarget).get("riskSummary") ?? "").trim();
    updateProject((current) => ({ ...current, riskSummary, lastUpdated: todayLabel() }));
    setEditingRiskSummary(false);
  };

  const addCustomStage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (visibleStages.some((stage) => normalizeStageName(stage.name) === normalizeStageName(name))) {
      setStageError("A stage with this name already exists.");
      return;
    }
    const stage = { id: crypto.randomUUID(), name, status: String(data.get("status")) as StageStatus, isCustom: true };
    updateProject((current) => ({ ...current, stages: [...current.stages, stage], lastUpdated: todayLabel() }));
    closeModal();
  };

  const saveRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    if (modal === "blocker") {
      const record: Blocker = { id: editingBlocker?.id ?? crypto.randomUUID(), description: value("description"), impact: Number(data.get("impact") || 0), currentStatus: value("currentStatus"), notes: value("notes") };
      updateProject((current) => ({ ...current, blockers: editingBlocker ? current.blockers.map((item) => item.id === editingBlocker.id ? record : item) : [...current.blockers, record], lastUpdated: todayLabel() }));
    }
    if (modal === "execution") {
      const testCasesExecuted = readExecutionMetric(data, "testCasesExecuted");
      const totalTestCases = readExecutionMetric(data, "totalTestCases");
      const testCasesExecutedNumber = executionMetricNumber(testCasesExecuted);
      const totalTestCasesNumber = executionMetricNumber(totalTestCases);
      const manualCompletion = readExecutionMetric(data, "completion");
      const manualCompletionNumber = executionMetricNumber(manualCompletion);
      const record: NormalizedProject["execution"][number] = {
        ...(editingExecution ?? { id: crypto.randomUUID(), area: value("area"), completion: null, bugs: [], notes: "", owner: "", poc: "" }),
        totalTestCases,
        testCasesExecuted,
        testCasesPassed: readExecutionMetric(data, "testCasesPassed"),
        blocked: readExecutionMetric(data, "blocked"),
        blockedReason: value("blockedReason"),
        etaToUnblock: editingExecution?.etaToUnblock ?? "",
        progressUpdateToUnblock: value("progressUpdateToUnblock"),
        toDo: readExecutionMetric(data, "toDo"),
        failed: readExecutionMetric(data, "failed"),
        exploratoryTests: value("exploratoryTests"),
        completion: totalTestCasesNumber && testCasesExecutedNumber !== null ? Math.min(1, testCasesExecutedNumber / totalTestCasesNumber) : manualCompletion === null ? editingExecution?.completion ?? null : manualCompletionNumber === null ? manualCompletion : Math.min(100, manualCompletionNumber) / 100,
        bugs: editingExecution?.bugs ?? [],
        notes: value("notes"),
        owner: value("owner"),
        poc: value("poc"),
      };
      updateProject((current) => ({ ...current, execution: editingExecution ? current.execution.map((item) => item.id === editingExecution.id ? record : item) : [...current.execution, record], lastUpdated: todayLabel() }));
    }
    if (modal === "preparation") {
      const record: PreparationItem = { id: editingPreparation?.id ?? crypto.randomUUID(), name: value("name"), status: value("status") as StageStatus, eta: value("eta"), blockedReason: value("blockedReason"), etaToUnblock: value("etaToUnblock"), owner: value("owner"), comments: value("comments") };
      updateProject((current) => ({ ...current, preparation: editingPreparation ? current.preparation.map((item) => item.id === editingPreparation.id ? record : item) : [...current.preparation, record], lastUpdated: todayLabel() }));
    }
    if (modal === "defect") {
      const record: Defect = { id: value("id"), title: value("title"), impactedTestCases: value("impactedTestCases"), status: value("status") as DefectStatus, severity: value("severity") as DefectSeverity, comments: value("comments"), owner: value("owner"), poc: value("poc"), link: value("link") };
      updateProject((current) => ({ ...current, defects: editingDefect ? current.defects.map((item) => item.id === editingDefect.id ? record : item) : [...current.defects, record], lastUpdated: todayLabel() }));
    }
    closeModal();
  };

  const removeRecord = (type: "blocker" | "execution" | "preparation" | "defect", id: string) => updateProject((current) => {
    if (type === "blocker") return { ...current, blockers: current.blockers.filter((item) => item.id !== id) };
    if (type === "execution") return { ...current, execution: current.execution.filter((item) => item.id !== id) };
    if (type === "preparation") return { ...current, preparation: current.preparation.filter((item) => item.id !== id), lastUpdated: todayLabel() };
    return { ...current, defects: current.defects.filter((item) => item.id !== id) };
  });

  const modalTitle = modal === "blocker" ? `${editingBlocker ? "Edit" : "Add"} blocker` : modal === "execution" ? `${editingExecution ? "Edit" : "Add"} execution item` : modal === "preparation" ? `${editingPreparation ? "Edit" : "Add"} preparation item` : modal === "defect" ? `${editingDefect ? "Edit" : "Add"} defect` : "Add status item";

  return <div className="mx-auto max-w-[1440px]">
    <Link to={location.state?.fromSprint ? "/" : "/projects"} className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 transition hover:text-[#218f82]"><ArrowLeft size={14} />{location.state?.fromSprint ? "Back to sprint overview" : "Back to all projects"}</Link>
    <PageTitle eyebrow="Project DSR" title={reportProject.name} description={`${reportProject.owner} · Last updated ${reportProject.lastUpdated}`} action={<button onClick={() => openModal("project")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-[#b9e7df] hover:text-[#218f82]"><Pencil size={14} />Edit project</button>} />

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="High level status report" description="Sprint dates, test environment, status, validated defects, and comments." action={<button onClick={() => openModal("stage")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add status item</button>} />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryValue label="Sprint dates" value={projectSprint ? `${projectSprint.startDate} – ${projectSprint.endDate}` : "Not set"} className="sm:col-span-2" />
          <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-white p-3">
            <p className="text-xs font-bold text-slate-700">Test environment</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">{reportProject.report.testEnvironment || "Not set"}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <SummaryValue label="Firmware version" value={reportProject.report.firmwareVersion || "Not set"} />
              <SummaryValue label="Solution version" value={reportProject.report.solutionVersion || "Not set"} />
              <SummaryValue label="Targeted devices" value={reportProject.report.targetedDevices || "Not set"} />
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{visibleStages.map((stage) => <div key={stage.id} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/60 p-3"><p className="mb-2 text-[11px] font-bold leading-4 text-slate-700">{stage.name}</p><select aria-label={`${stage.name} status`} value={stage.status} onChange={(event) => updateStageStatus(stage.id, stage.name, stage.isCustom, event.target.value as StageStatus)} className={`h-9 w-full rounded-md border border-slate-200 px-2 text-[11px] font-semibold outline-none focus:border-[#69cbbb] ${stageStatusColors[stage.status]}`}>{stageStatusOptions.map((option) => <option key={option} className="bg-white text-slate-700">{option}</option>)}</select></div>)}</div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-700">Defect validated</h3>{!editingBugIds && <button type="button" onClick={beginEditingBugIds} className="text-xs font-bold text-[#218f82] hover:underline">Edit</button>}</div>
          {editingBugIds ? <form onSubmit={saveBugIds} className="mt-3 space-y-2">
            <textarea name="bugIds" aria-label="Validated defect IDs" value={bugIdsText} onChange={(event) => setBugIdsText(event.target.value)} rows={4} placeholder="Enter defect IDs, separated by commas or new lines" className={`${inputClass} resize-y`} />
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingBugIds(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-[#10263d] px-3 py-2 text-xs font-bold text-white">Save</button></div>
          </form> : <p className="mt-3 whitespace-pre-wrap text-xs text-slate-600">{reportProject.bugIds.length ? reportProject.bugIds.join(", ") : "No defects validated."}</p>}
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-700">Comments</h3>{!editingHighLevelComments && <button type="button" onClick={beginEditingHighLevelComments} className="text-xs font-bold text-[#218f82] hover:underline">Edit</button>}</div>
          {editingHighLevelComments ? <form onSubmit={saveHighLevelComments} className="mt-3 space-y-2">
            <textarea name="highLevelComments" aria-label="High-level comments" value={highLevelCommentsText} onChange={(event) => setHighLevelCommentsText(event.target.value)} rows={4} placeholder="Add a project status comment" className={`${inputClass} resize-y`} />
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingHighLevelComments(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-[#10263d] px-3 py-2 text-xs font-bold text-white">Save</button></div>
          </form> : <p className="mt-3 whitespace-pre-wrap text-xs text-slate-600">{reportProject.highLevelComments || "No comments added."}</p>}
        </div>
      </div>
    </section>

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="Test preparation summary" description="Readiness status, completion and unblock estimates, ownership, and comments." action={<button onClick={() => openModal("preparation")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add preparation item</button>} />
      {reportProject.preparation.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1320px] table-fixed text-left"><colgroup><col className="w-[200px]" /><col className="w-[140px]" /><col className="w-[170px]" /><col className="w-[240px]" /><col className="w-[150px]" /><col className="w-[120px]" /><col className="w-[240px]" /><col className="w-[60px]" /></colgroup><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 text-center"><th className="sticky left-0 z-20 w-[200px] min-w-[200px] max-w-[200px] border-r border-slate-100 bg-white pb-3 pr-4 text-left">Preparation item</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">ETA for completion</th><th className="pb-3 pr-4">Blocked reason</th><th className="pb-3 pr-4">ETA to unblock</th><th className="pb-3 pr-4">Owner</th><th className="pb-3 pr-4">Comments</th><th className="pb-3" /></tr></thead><tbody className="divide-y divide-slate-100">{reportProject.preparation.map((item) => <tr key={item.id} className="align-top text-xs text-center"><td className="sticky left-0 z-10 w-[200px] min-w-[200px] max-w-[200px] border-r border-slate-100 bg-white py-3 pr-4 font-bold text-slate-700 text-left">{item.name}</td><td className="py-3 pr-4 text-center"><StatusBadge status={item.status} compact /></td><td className={`py-3 pr-4 text-slate-600 ${item.eta ? "" : "text-center"}`}>{item.eta || "—"}</td><td className={`max-w-[240px] whitespace-pre-wrap py-3 pr-4 text-slate-500 ${item.blockedReason ? "" : "text-center"}`}>{item.blockedReason || "—"}</td><td className={`py-3 pr-4 text-slate-600 ${item.etaToUnblock ? "" : "text-center"}`}>{item.etaToUnblock || "—"}</td><td className={`py-3 pr-4 text-slate-600 ${item.owner ? "" : "text-center"}`}>{item.owner || "—"}</td><td className={`max-w-[260px] whitespace-pre-wrap py-3 pr-4 text-slate-500 ${item.comments ? "" : "text-center"}`}>{item.comments || "—"}</td><td className="py-3"><RowActions onEdit={() => openModal("preparation", item.id)} onDelete={() => removeRecord("preparation", item.id)} /></td></tr>)}</tbody></table></div> : <EmptyState title="No preparation items yet" description="Add a preparation item to track project readiness." />}
    </section>

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="Test execution summary" description="Track case counts, outcomes, completion, ownership, and unblock progress." action={<button onClick={() => openModal("execution")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add execution item</button>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[2200px] text-center">
          <thead>
            <tr className="border-b border-slate-100 bg-[#fff8e8] text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <th className="sticky left-0 z-20 border-r border-slate-100 bg-[#fff8e8] px-3 py-3 text-left">Execution area</th>
              <th className="px-3 py-3">Total No. Test cases</th>
              <th className="px-3 py-3">Test cases Executed</th>
              <th className="px-3 py-3">% of Completion</th>
              <th className="px-3 py-3">No. of TC's Pass</th>
              <th className="px-3 py-3">Pass %</th>
              <th className="px-3 py-3">Blocked</th>
              <th className="px-3 py-3">Blocked Reason</th>
              <th className="px-3 py-3">Block %</th>
              <th className="px-3 py-3">Progress Update to Unblock</th>
              <th className="px-3 py-3">To Do</th>
              <th className="px-3 py-3">To Do %</th>
              <th className="px-3 py-3">No. of TC's Failed</th>
              <th className="px-3 py-3">Fail %</th>
              <th className="px-3 py-3">Exploratory Tc's added to Test Suite and details</th>
              <th className="px-3 py-3">Additional Comments</th>
              <th className="px-3 py-3">Task<br />Owner</th>
              <th className="px-3 py-3">POC/SL</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportProject.execution.map((item) => <tr key={item.id} className="align-top text-[11px] text-slate-600">
              <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-3 py-3 text-left font-bold text-slate-700">{item.area}</td>
              <td className="px-3 py-3">{item.totalTestCases ?? "—"}</td>
              <td className="px-3 py-3">{item.testCasesExecuted ?? "—"}</td>
              <td className="px-3 py-3">{completionDisplay(item)}</td>
              <td className="px-3 py-3">{item.testCasesPassed ?? "—"}</td>
              <td className="px-3 py-3">{displayPercent(asPercent(item.testCasesPassed ?? null, item.totalTestCases ?? null))}</td>
              <td className="px-3 py-3">{item.blocked ?? "—"}</td>
              <td className="max-w-[200px] whitespace-pre-wrap px-3 py-3">{item.blockedReason || "—"}</td>
              <td className="px-3 py-3">{displayPercent(asPercent(item.blocked ?? null, item.totalTestCases ?? null))}</td>
              <td className="max-w-[200px] whitespace-pre-wrap px-3 py-3">{item.progressUpdateToUnblock || "—"}</td>
              <td className="px-3 py-3">{item.toDo ?? "—"}</td>
              <td className="px-3 py-3">{displayPercent(asPercent(item.toDo ?? null, item.totalTestCases ?? null))}</td>
              <td className="px-3 py-3">{item.failed ?? "—"}</td>
              <td className="px-3 py-3">{displayPercent(asPercent(item.failed ?? null, item.totalTestCases ?? null))}</td>
              <td className="max-w-[200px] whitespace-pre-wrap px-3 py-3">{item.exploratoryTests || "—"}</td>
              <td className="max-w-[240px] whitespace-pre-wrap px-3 py-3">{item.notes || "—"}</td>
              <td className="px-3 py-3">{item.owner || "—"}</td>
              <td className="px-3 py-3">{item.poc || "—"}</td>
              <td className="px-3 py-3 [&>div]:justify-center"><RowActions onEdit={() => openModal("execution", item.id)} onDelete={() => removeRecord("execution", item.id)} /></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <div className="mb-5 grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Test execution outcomes" description="Pass, blocked, to-do, and failed percentages by execution area." />{hasExecutionMetrics ? <div className="mt-4 h-[320px] w-full rounded-lg bg-slate-100 p-2"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartExecution} margin={{ top: 8, right: 8, left: -18, bottom: 42 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="category" interval={0} angle={-20} textAnchor="end" height={68} tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" /><Tooltip formatter={(value) => `${value}%`} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="Pass %" fill="#5e9bd6" radius={[3, 3, 0, 0]}><LabelList dataKey="Pass %" position="insideTop" fill="#172b4d" fontSize={11} fontWeight={700} /></Bar><Bar dataKey="Block %" fill="#f3a477" radius={[3, 3, 0, 0]}><LabelList dataKey="Block %" position="insideTop" fill="#172b4d" fontSize={11} fontWeight={700} /></Bar><Bar dataKey="To Do %" fill="#aab0ba" radius={[3, 3, 0, 0]}><LabelList dataKey="To Do %" position="insideTop" fill="#172b4d" fontSize={11} fontWeight={700} /></Bar><Bar dataKey="Fail %" fill="#f07167" radius={[3, 3, 0, 0]}><LabelList dataKey="Fail %" position="insideTop" fill="#172b4d" fontSize={11} fontWeight={700} /></Bar></BarChart></ResponsiveContainer></div> : <EmptyState title="Execution chart is ready" description="Enter test case totals and outcome counts to populate this chart." />}</section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="Defect management" description="Track defect IDs, affected test cases, status, severity, and ownership." action={<button onClick={() => openModal("defect")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add defect</button>} />
      {reportProject.defects.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><th className="pb-3 pr-4">Defect ID</th><th className="pb-3 pr-4">Defect title</th><th className="pb-3 pr-4">Test cases impacted</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">Severity</th><th className="pb-3 pr-4">Comments</th><th className="pb-3 pr-4">Task owner</th><th className="pb-3 pr-4">POC / SL</th><th className="pb-3 pr-4">Link</th><th className="pb-3" /></tr></thead><tbody className="divide-y divide-slate-100">{reportProject.defects.map((defect) => { const href = safeExternalUrl(defect.link); return <tr key={defect.id} className="align-top text-xs"><td className="py-3.5 pr-4 font-bold text-slate-700">{defect.id}</td><td className="max-w-[280px] whitespace-pre-wrap py-3.5 pr-4 font-semibold text-slate-700">{defect.title || "—"}</td><td className="max-w-[180px] whitespace-pre-wrap py-3.5 pr-4 text-slate-600">{defect.impactedTestCases || "—"}</td><td className="py-3.5 pr-4"><StatusBadge status={defect.status} compact /></td><td className="py-3.5 pr-4 font-bold text-slate-600">{defect.severity}</td><td className="max-w-[260px] whitespace-pre-wrap py-3.5 pr-4 text-slate-500">{defect.comments || "—"}</td><td className="py-3.5 pr-4 text-slate-600">{defect.owner || "—"}</td><td className="py-3.5 pr-4 text-slate-600">{defect.poc || "—"}</td><td className="max-w-[200px] break-all py-3.5 pr-4">{href ? <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-[#218f82] underline">Open link</a> : defect.link || "—"}</td><td className="py-3.5"><RowActions onEdit={() => openModal("defect", defect.id)} onDelete={() => removeRecord("defect", defect.id)} /></td></tr>; })}</tbody></table></div> : <EmptyState title="No defects recorded" description="Add defects to populate the severity summary and chart." />}
    </section>
    </div>

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Defect summary" description="Defect counts by workflow status and severity." />{reportProject.defects.length ? <><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[360px] text-left text-xs"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><th className="pb-3 pr-4">Status</th>{defectSeverities.map((severity) => <th key={severity} className="pb-3 pr-4">{severity}</th>)}<th className="pb-3">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{defectSummary.map((row) => <tr key={row.status}><td className="py-2.5 pr-4 font-semibold text-slate-700">{row.status}</td>{defectSeverities.map((severity) => <td key={severity} className="py-2.5 pr-4 text-slate-600">{row[severity]}</td>)}<td className="py-2.5 font-bold text-slate-700">{row.P1 + row.P2 + row.P3}</td></tr>)}<tr className="border-t-2 border-slate-200"><td className="py-2.5 pr-4 font-bold text-slate-700">Total defects</td>{defectSeverities.map((severity) => <td key={severity} className="py-2.5 pr-4 font-bold text-slate-700">{totalDefectsBySeverity[severity]}</td>)}<td className="py-2.5 font-bold text-slate-800">{reportProject.defects.length}</td></tr></tbody></table></div><div className="mt-4 h-[220px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={defectSummary} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="P1" stackId="severity" fill="#5996d3" radius={[2, 2, 0, 0]}><LabelList dataKey="P1" position="inside" fill="#172b4d" fontSize={10} fontWeight={700} /></Bar><Bar dataKey="P2" stackId="severity" fill="#eea37b"><LabelList dataKey="P2" position="inside" fill="#172b4d" fontSize={10} fontWeight={700} /></Bar><Bar dataKey="P3" stackId="severity" fill="#a9aeb8"><LabelList dataKey="P3" position="inside" fill="#172b4d" fontSize={10} fontWeight={700} /></Bar></BarChart></ResponsiveContainer></div></> : <EmptyState title="Defect summary is ready" description="Add defects to display counts by workflow status and severity." />}</section>


    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
        <SectionHeading title="Current project risks" description="Risks to monitor through the next reporting cycle." />
        {editingRiskSummary ? <form onSubmit={saveRiskSummary} className="mt-4 space-y-3">
          <textarea name="riskSummary" aria-label="Current project risks" value={riskSummaryText} onChange={(event) => setRiskSummaryText(event.target.value)} rows={5} className={`${inputClass} !h-auto min-h-[120px] resize-y`} />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingRiskSummary(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-[#10263d] px-3 py-2 text-xs font-bold text-white">Save</button></div>
        </form> : <>
          <div className="rounded-xl bg-[#f7f9fc] p-4"><ShieldAlert size={17} className="text-[#37b9a5]" /><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{reportProject.riskSummary || "No project risks recorded."}</p></div>
          <button type="button" onClick={beginEditingRiskSummary} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#218f82] hover:underline"><Pencil size={13} />Edit project risks</button>
        </>}
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
        <SectionHeading title="Notes" description="High-level context for the current DSR." />
        {editingProjectNotes ? <form onSubmit={saveProjectNotes} className="mt-4 space-y-3">
          <textarea name="notes" aria-label="Project notes" value={projectNotesText} onChange={(event) => setProjectNotesText(event.target.value)} rows={5} className={`${inputClass} !h-auto min-h-[120px] resize-y`} />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingProjectNotes(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-[#10263d] px-3 py-2 text-xs font-bold text-white">Save</button></div>
        </form> : <>
          <div className="rounded-xl bg-[#f7f9fc] p-4"><FileText size={17} className="text-[#37b9a5]" /><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{reportProject.notes || "No notes added yet."}</p></div>
          <button type="button" onClick={beginEditingProjectNotes} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#218f82] hover:underline"><Pencil size={13} />Edit project notes</button>
        </>}
      </section>
    </div>

    <Modal open={modal === "stage"} onClose={closeModal} title="Add status item" description="Add an extra stage to this project's high-level status report."><form onSubmit={addCustomStage} className="space-y-4"><Field label="Stage name"><input name="name" required placeholder="e.g. Security validation" className={inputClass} /></Field><Field label="Initial status"><select name="status" defaultValue="Yet to Start" className={inputClass}>{stageStatusOptions.map((option) => <option key={option}>{option}</option>)}</select></Field>{stageError && <p role="alert" className="text-xs font-medium text-[#c65e52]">{stageError}</p>}<FormFooter onCancel={closeModal} label="Add item" /></form></Modal>

    <Modal open={modal === "project"} onClose={closeModal} title="Edit project report" description="Update the report header and project context." wide><form onSubmit={saveProject} className="grid gap-4 sm:grid-cols-2"><Field label="Project name"><input name="name" defaultValue={reportProject.name} required className={inputClass} /></Field><p className="self-center text-xs text-slate-500 sm:col-span-2">Sprint dates are managed in the sprint configuration.</p><Field label="Firmware version"><input name="firmwareVersion" defaultValue={reportProject.report.firmwareVersion} className={inputClass} /></Field><Field label="Solution version"><input name="solutionVersion" defaultValue={reportProject.report.solutionVersion} className={inputClass} /></Field><Field label="Targeted devices" className="sm:col-span-2"><textarea name="targetedDevices" defaultValue={reportProject.report.targetedDevices} rows={2} className={`${inputClass} resize-y`} /></Field><div className="sm:col-span-2 rounded-lg border border-slate-100 p-3"><h3 className="text-xs font-bold text-slate-700">Status items</h3>{visibleStages.length ? <div className="mt-2 divide-y divide-slate-100">{visibleStages.map((stage) => <div key={stage.id} className="flex items-center justify-between gap-3 py-2"><span className="text-xs font-medium text-slate-600">{stage.name}</span><button type="button" onClick={() => deleteStatusItem(stage)} aria-label={`Delete ${stage.name} status item`} className="rounded-md px-2 py-1 text-xs font-semibold text-[#c65e52] hover:bg-[#fff0ed]">Delete</button></div>)}</div> : <p className="mt-2 text-xs text-slate-400">No status items.</p>}</div><FormFooter onCancel={closeModal} label="Save changes" /></form></Modal>

    <Modal open={modal === "preparation" || modal === "execution" || modal === "blocker" || modal === "defect"} onClose={closeModal} title={modalTitle} description="Keep the project report current with the latest execution details." wide>
      {modal === "preparation" && <form onSubmit={saveRecord} className="grid gap-4 sm:grid-cols-2"><Field label="Preparation item"><input name="name" defaultValue={editingPreparation?.name ?? ""} required className={inputClass} /></Field><Field label="Status"><select name="status" defaultValue={editingPreparation?.status ?? "Yet to Start"} className={inputClass}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></Field><Field label="ETA for completion"><input name="eta" defaultValue={editingPreparation?.eta ?? ""} placeholder="e.g. 30/10/2026 or TBD" className={inputClass} /></Field><Field label="Blocked reason"><input name="blockedReason" defaultValue={editingPreparation?.blockedReason ?? ""} className={inputClass} /></Field><Field label="ETA to unblock"><input name="etaToUnblock" defaultValue={editingPreparation?.etaToUnblock ?? ""} placeholder="e.g. 30/10/2026 or TBD" className={inputClass} /></Field><Field label="Owner"><input name="owner" defaultValue={editingPreparation?.owner ?? ""} className={inputClass} /></Field><Field label="Comments" className="sm:col-span-2"><textarea name="comments" defaultValue={editingPreparation?.comments ?? ""} rows={3} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label={editingPreparation ? "Save item" : "Add item"} /></form>}
      {modal === "execution" && <form onSubmit={saveRecord} className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        {!editingExecution && <Field label="Execution area"><input name="area" type="text" required placeholder="e.g. Functionality" className={inputClass} /></Field>}
        <Field label="Total test cases"><input name="totalTestCases" type="text" defaultValue={editingExecution?.totalTestCases ?? ""} className={inputClass} /></Field>
        <Field label="Test cases executed"><input name="testCasesExecuted" type="text" defaultValue={editingExecution?.testCasesExecuted ?? ""} className={inputClass} /></Field>
        <Field label="Completion (%)"><input name="completion" type="text" defaultValue={editingExecution ? executionCompletion(editingExecution) ?? editingExecution.completion ?? "" : ""} className={inputClass} /></Field>
        <Field label="Test cases passed"><input name="testCasesPassed" type="text" defaultValue={editingExecution?.testCasesPassed ?? ""} className={inputClass} /></Field>
        <Field label="Blocked"><input name="blocked" type="text" defaultValue={editingExecution?.blocked ?? ""} className={inputClass} /></Field>
        <Field label="Blocked reason"><input name="blockedReason" defaultValue={editingExecution?.blockedReason ?? ""} className={inputClass} /></Field>
        <Field label="Progress update to unblock"><textarea name="progressUpdateToUnblock" defaultValue={editingExecution?.progressUpdateToUnblock ?? ""} rows={2} className="form-input resize-y" /></Field>
        <Field label="To do"><input name="toDo" type="text" defaultValue={editingExecution?.toDo ?? ""} className={inputClass} /></Field>
        <Field label="Test cases failed"><input name="failed" type="text" defaultValue={editingExecution?.failed ?? ""} className={inputClass} /></Field>
        <Field label="Exploratory tests added"><textarea name="exploratoryTests" defaultValue={editingExecution?.exploratoryTests ?? ""} rows={2} className="form-input resize-y" /></Field>
        <Field label="Additional comments" className="sm:col-span-2"><textarea name="notes" defaultValue={editingExecution?.notes ?? ""} rows={3} className="form-input resize-y" /></Field>
        <Field label="Task owner"><input name="owner" type="text" defaultValue={editingExecution?.owner ?? reportProject.owner} placeholder="Enter task owner" className={inputClass} /></Field>
        <Field label="POC / SL"><input name="poc" type="text" defaultValue={editingExecution?.poc ?? ""} placeholder="Enter POC / SL" className={inputClass} /></Field>
        <FormFooter onCancel={closeModal} label={editingExecution ? "Save item" : "Add item"} />
      </form>}
      {modal === "blocker" && <form onSubmit={saveRecord} className="grid gap-4 sm:grid-cols-2"><Field label="Description" className="sm:col-span-2"><input name="description" defaultValue={editingBlocker?.description ?? ""} required className={inputClass} /></Field><Field label="Impacted test cases (%)"><input name="impact" type="number" min="0" max="100" defaultValue={editingBlocker?.impact ?? 0} className={inputClass} /></Field><Field label="Current status"><input name="currentStatus" defaultValue={editingBlocker?.currentStatus ?? ""} className={inputClass} /></Field><Field label="Additional notes" className="sm:col-span-2"><textarea name="notes" defaultValue={editingBlocker?.notes ?? ""} rows={3} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label={editingBlocker ? "Save blocker" : "Add blocker"} /></form>}
      {modal === "defect" && <form onSubmit={saveRecord} className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2"><Field label="Defect ID"><input name="id" defaultValue={editingDefect?.id ?? ""} required className={inputClass} /></Field><Field label="Severity"><select name="severity" defaultValue={editingDefect?.severity ?? "P2"} className={inputClass}>{defectSeverities.map((severity) => <option key={severity}>{severity}</option>)}</select></Field><Field label="Defect title" className="sm:col-span-2"><input name="title" defaultValue={editingDefect?.title ?? ""} required className={inputClass} /></Field><Field label="Test cases impacted"><textarea name="impactedTestCases" defaultValue={editingDefect?.impactedTestCases ?? ""} rows={2} className={`${inputClass} resize-y`} /></Field><Field label="Status"><select name="status" defaultValue={editingDefect?.status ?? "Open"} className={inputClass}>{defectStatuses.map((status) => <option key={status}>{status}</option>)}</select></Field><Field label="Task owner"><input name="owner" defaultValue={editingDefect?.owner ?? ""} className={inputClass} /></Field><Field label="POC / SL"><input name="poc" defaultValue={editingDefect?.poc ?? ""} className={inputClass} /></Field><Field label="Defect link" className="sm:col-span-2"><input name="link" type="url" defaultValue={editingDefect?.link ?? ""} placeholder="https://…" className={inputClass} /></Field><Field label="Comments" className="sm:col-span-2"><textarea name="comments" defaultValue={editingDefect?.comments ?? ""} rows={3} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label={editingDefect ? "Save defect" : "Add defect"} /></form>}
    </Modal>

  </div>;
}

export default ProjectDetails;

function SummaryValue({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`rounded-lg border border-slate-100 bg-slate-50/60 p-3 ${className}`}><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-700">{value}</p></div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete?: () => void }) {
  return <div className="flex items-center gap-1"><button type="button" onClick={onEdit} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#218f82]" aria-label="Edit"><Pencil size={13} /></button>{onDelete && <button type="button" onClick={onDelete} className="rounded-md p-1.5 text-slate-400 hover:bg-[#fff0ed] hover:text-[#d36d5f]" aria-label="Delete"><Trash2 size={13} /></button>}</div>;
}

function FormFooter({ onCancel, label }: { onCancel: () => void; label: string }) {
  return <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="inline-flex items-center gap-1.5 rounded-lg bg-[#10263d] px-4 py-2 text-xs font-bold text-white"><Save size={13} />{label}</button></div>;
}
