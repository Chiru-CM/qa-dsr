import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { Modal } from "@/components/dsr/Modal";
import { EmptyState, PageTitle, ProgressBar, SectionHeading, StatusBadge } from "@/components/dsr/DsrPrimitives";
import { executionReportAreas, normalizeProject, statusOptions, type Blocker, type Defect, type DefectSeverity, type DefectStatus, type ExecutionItem, type NormalizedProject, type PreparationItem, type Project, type ProjectStatus, type RecordStatus, type Risk, type StageStatus } from "@/lib/dsr-data";

type ModalType = "blocker" | "execution" | "risk" | "project" | "stage" | "preparation" | "defect" | "validated" | null;
const recordStatuses: RecordStatus[] = ["Open", "Blocked", "Monitoring", "Resolved", "Deferred"];
const defectStatuses: DefectStatus[] = ["Open", "In Progress", "Development", "Fixed / In Verification", "Closed"];
const defectSeverities: DefectSeverity[] = ["P1", "P2", "P3"];
const defaultStageNames = ["Exploratory", "TC Design", "Functionality Execution", "Non Functionality Execution", "Automation- Print", "Automation- Scan"];
const normalizeStageName = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
const todayLabel = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const inputClass = "form-input";

const readNumber = (data: FormData, key: string) => {
  const value = String(data.get(key) ?? "").trim();
  return value === "" ? null : Math.max(0, Number(value));
};

const asPercent = (part: number | null, whole: number | null) => whole && whole > 0 && part !== null ? Math.round((part / whole) * 10000) / 100 : null;
const executionCompletion = (item: ExecutionItem) => asPercent(item.testCasesExecuted ?? null, item.totalTestCases ?? null) ?? (item.completion === null ? null : Math.round(item.completion * 100));
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
  const total = item.totalTestCases ?? 0;
  return {
    category: item.area,
    "Pass %": total ? Math.round(((item.testCasesPassed ?? 0) / total) * 10000) / 100 : 0,
    "Block %": total ? Math.round(((item.blocked ?? 0) / total) * 10000) / 100 : 0,
    "To Do %": total ? Math.round(((item.toDo ?? 0) / total) * 10000) / 100 : 0,
    "Fail %": total ? Math.round(((item.failed ?? 0) / total) * 10000) / 100 : 0,
  };
};

const defectStatusLabel = (status: DefectStatus) => status === "Development" ? "In Progress" : status;
const defectSummaryStatuses = ["Open", "In Progress", "Fixed / In Verification", "Closed"] as const;

function ProjectDetails() {
  const { projectId } = useParams();
  const location = useLocation();
  const { projects, setProjects } = useOutletContext<DsrOutletContext>();
  const [modal, setModal] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stageError, setStageError] = useState("");
  const project = projects.find((item) => item.id === projectId);

  const updateProject = (updater: (current: NormalizedProject) => NormalizedProject) => {
    setProjects((current) => current.map((item) => item.id === projectId ? updater(normalizeProject(item)) : item));
  };
  const openModal = (type: Exclude<ModalType, null>, id?: string) => { setEditingId(id ?? null); setModal(type); };
  const closeModal = () => { setEditingId(null); setModal(null); setStageError(""); };
  if (!project) return <Navigate to="/projects" replace />;

  const reportProject = normalizeProject(project);
  const editingBlocker = reportProject.blockers.find((item) => item.id === editingId);
  const editingExecution = reportProject.execution.find((item) => item.id === editingId);
  const editingRisk = reportProject.risks.find((item) => item.id === editingId);
  const editingPreparation = reportProject.preparation.find((item) => item.id === editingId);
  const editingDefect = reportProject.defects.find((item) => item.id === editingId);
  const visibleStages = [
    ...defaultStageNames.map((name) => {
      const stage = reportProject.stages.find((item) => normalizeStageName(item.name) === normalizeStageName(name));
      return { id: stage?.id ?? `default-${normalizeStageName(name)}`, name, status: stage?.status ?? "N/A" as StageStatus, isCustom: false };
    }),
    ...reportProject.stages.filter((stage) => stage.isCustom),
  ];
  const chartExecution = reportProject.execution.map(chartExecutionMetrics);
  const hasExecutionMetrics = reportProject.execution.some((item) => [item.totalTestCases, item.testCasesPassed, item.blocked, item.toDo, item.failed].some((value) => value !== null && value !== undefined));
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
      owner: String(data.get("owner") || "").trim(),
      status: String(data.get("status")) as ProjectStatus,
      notes: String(data.get("notes") ?? current.notes),
      additionalNotes: String(data.get("additionalNotes") ?? ""),
      report: {
        sprintStartDate: String(data.get("sprintStartDate") ?? ""),
        sprintEndDate: String(data.get("sprintEndDate") ?? ""),
        testEnvironment: String(data.get("testEnvironment") ?? "").trim(),
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
      const testCasesExecuted = readNumber(data, "testCasesExecuted");
      const totalTestCases = readNumber(data, "totalTestCases");
      const manualCompletion = readNumber(data, "completion");
      const record: NormalizedProject["execution"][number] = {
        ...(editingExecution ?? { id: crypto.randomUUID(), area: "", completion: null, bugs: [], notes: "", owner: "", poc: "" }),
        area: value("area"),
        totalTestCases,
        testCasesExecuted,
        testCasesPassed: readNumber(data, "testCasesPassed"),
        blocked: readNumber(data, "blocked"),
        blockedReason: value("blockedReason"),
        etaToUnblock: value("etaToUnblock"),
        progressUpdateToUnblock: value("progressUpdateToUnblock"),
        toDo: readNumber(data, "toDo"),
        failed: readNumber(data, "failed"),
        exploratoryTests: value("exploratoryTests"),
        completion: totalTestCases && testCasesExecuted !== null ? Math.min(1, testCasesExecuted / totalTestCases) : manualCompletion === null ? editingExecution?.completion ?? null : Math.min(100, manualCompletion) / 100,
        bugs: value("bugs").split(",").map((bug) => bug.trim()).filter(Boolean),
        notes: value("notes"),
        owner: value("owner"),
        poc: value("poc"),
      };
      updateProject((current) => ({ ...current, execution: editingExecution ? current.execution.map((item) => item.id === editingExecution.id ? record : item) : [...current.execution, record], lastUpdated: todayLabel() }));
    }
    if (modal === "preparation") {
      const record: PreparationItem = { id: editingPreparation?.id ?? crypto.randomUUID(), name: value("name"), status: value("status") as StageStatus, eta: value("eta"), blockedReason: value("blockedReason") };
      updateProject((current) => ({ ...current, preparation: editingPreparation ? current.preparation.map((item) => item.id === editingPreparation.id ? record : item) : [...current.preparation, record], lastUpdated: todayLabel() }));
    }
    if (modal === "defect") {
      const record: Defect = { id: value("id"), title: value("title"), impactedTestCases: value("impactedTestCases"), status: value("status") as DefectStatus, severity: value("severity") as DefectSeverity, comments: value("comments"), owner: value("owner"), poc: value("poc"), link: value("link") };
      updateProject((current) => ({ ...current, defects: editingDefect ? current.defects.map((item) => item.id === editingDefect.id ? record : item) : [...current.defects, record], lastUpdated: todayLabel() }));
    }
    if (modal === "risk") {
      const record: Risk = { id: editingRisk?.id ?? crypto.randomUUID(), description: value("description"), notes: value("notes"), status: value("status") as RecordStatus, owner: value("owner") };
      updateProject((current) => ({ ...current, risks: editingRisk ? current.risks.map((item) => item.id === editingRisk.id ? record : item) : [...current.risks, record], lastUpdated: todayLabel() }));
    }
    closeModal();
  };

  const saveValidatedDefects = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ids = String(data.get("validatedDefects") ?? "").split(/[\n,]+/).map((id) => id.trim()).filter(Boolean);
    updateProject((current) => ({ ...current, validatedDefects: [...new Set(ids)], lastUpdated: todayLabel() }));
    closeModal();
  };

  const removeRecord = (type: "blocker" | "execution" | "risk" | "defect", id: string) => updateProject((current) => {
    if (type === "blocker") return { ...current, blockers: current.blockers.filter((item) => item.id !== id) };
    if (type === "execution") return { ...current, execution: current.execution.filter((item) => item.id !== id) };
    if (type === "risk") return { ...current, risks: current.risks.filter((item) => item.id !== id) };
    return { ...current, defects: current.defects.filter((item) => item.id !== id) };
  });

  const modalTitle = modal === "blocker" ? `${editingBlocker ? "Edit" : "Add"} blocker` : modal === "execution" ? `${editingExecution ? "Edit" : "Add"} execution item` : modal === "preparation" ? `${editingPreparation ? "Edit" : "Add"} preparation item` : modal === "defect" ? `${editingDefect ? "Edit" : "Add"} defect` : modal === "stage" ? "Add status item" : `${editingRisk ? "Edit" : "Add"} project risk`;

  return <div className="mx-auto max-w-[1440px]">
    <Link to={location.state?.fromSprint ? "/" : "/projects"} className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 transition hover:text-[#218f82]"><ArrowLeft size={14} />{location.state?.fromSprint ? "Back to sprint overview" : "Back to all projects"}</Link>
    <PageTitle eyebrow="Project DSR" title={reportProject.name} description={`${reportProject.owner} · Last updated ${reportProject.lastUpdated}`} action={<button onClick={() => openModal("project")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-[#b9e7df] hover:text-[#218f82]"><Pencil size={14} />Edit project</button>} />

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="Sprint and test environment" description="Reporting window, environment versions, and targeted devices." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryValue label="Sprint date" value={reportProject.report.sprintStartDate && reportProject.report.sprintEndDate ? `${reportProject.report.sprintStartDate} – ${reportProject.report.sprintEndDate}` : "Not set"} />
        <SummaryValue label="Test environment" value={reportProject.report.testEnvironment || "Not set"} />
        <SummaryValue label="Firmware version" value={reportProject.report.firmwareVersion || "Not set"} />
        <SummaryValue label="Solution version" value={reportProject.report.solutionVersion || "Not set"} />
        <SummaryValue label="Targeted devices" value={reportProject.report.targetedDevices || "Not set"} className="sm:col-span-2 xl:col-span-4" />
      </div>
    </section>

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="High level status report" description="Exploratory, test case design, and execution stage status." action={<button onClick={() => openModal("stage")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add status item</button>} />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{visibleStages.map((stage) => <div key={stage.id} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/60 p-3"><p className="mb-2 text-[11px] font-bold leading-4 text-slate-700">{stage.name}</p><select aria-label={`${stage.name} status`} value={stage.status} onChange={(event) => updateStageStatus(stage.id, stage.name, stage.isCustom, event.target.value as StageStatus)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 outline-none focus:border-[#69cbbb]">{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></div>)}</div>
    </section>

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="Test preparation summary" description="Readiness status, completion ETA, and blockers for setup activities." action={<button onClick={() => openModal("preparation")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add preparation item</button>} />
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><th className="pb-3 pr-4">Preparation item</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">ETA for completion</th><th className="pb-3 pr-4">Blocked reason</th><th className="pb-3" /></tr></thead><tbody className="divide-y divide-slate-100">{reportProject.preparation.map((item) => <tr key={item.id} className="text-xs"><td className="py-3 pr-4 font-bold text-slate-700">{item.name}</td><td className="py-3 pr-4"><StatusBadge status={item.status} compact /></td><td className="py-3 pr-4 text-slate-600">{item.eta || "—"}</td><td className="max-w-[360px] py-3 pr-4 whitespace-pre-wrap text-slate-500">{item.blockedReason || "—"}</td><td className="py-3"><RowActions onEdit={() => openModal("preparation", item.id)} /></td></tr>)}</tbody></table></div>
    </section>

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="Test execution summary" description="Track case counts, outcomes, completion, ownership, and unblock progress." action={<button onClick={() => openModal("execution")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add execution item</button>} />
      <div className="overflow-x-auto"><table className="w-full min-w-[2200px] text-left"><thead><tr className="border-b border-slate-100 bg-[#fff8e8] text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">{["Execution area", "Total test cases", "Test cases executed", "% completion", "Test cases passed", "Pass %", "Blocked", "Blocked reason", "ETA to unblock", "Progress update to unblock", "Owner", "POC / SL", "To do", "To do %", "Test cases failed", "Fail %", "Exploratory tests added", "Additional comments", "Actions"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{reportProject.execution.map((item) => <tr key={item.id} className="align-top text-[11px] text-slate-600"><td className="px-3 py-3 font-bold text-slate-700">{item.area}</td><td className="px-3 py-3">{item.totalTestCases ?? "—"}</td><td className="px-3 py-3">{item.testCasesExecuted ?? "—"}</td><td className="px-3 py-3">{displayPercent(executionCompletion(item))}</td><td className="px-3 py-3">{item.testCasesPassed ?? "—"}</td><td className="px-3 py-3">{displayPercent(asPercent(item.testCasesPassed ?? null, item.totalTestCases ?? null))}</td><td className="px-3 py-3">{item.blocked ?? "—"}</td><td className="max-w-[200px] whitespace-pre-wrap px-3 py-3">{item.blockedReason || "—"}</td><td className="px-3 py-3">{item.etaToUnblock || "—"}</td><td className="max-w-[200px] whitespace-pre-wrap px-3 py-3">{item.progressUpdateToUnblock || "—"}</td><td className="px-3 py-3">{item.owner || "—"}</td><td className="px-3 py-3">{item.poc || "—"}</td><td className="px-3 py-3">{item.toDo ?? "—"}</td><td className="px-3 py-3">{displayPercent(asPercent(item.toDo ?? null, item.totalTestCases ?? null))}</td><td className="px-3 py-3">{item.failed ?? "—"}</td><td className="px-3 py-3">{displayPercent(asPercent(item.failed ?? null, item.totalTestCases ?? null))}</td><td className="max-w-[200px] whitespace-pre-wrap px-3 py-3">{item.exploratoryTests || "—"}</td><td className="max-w-[240px] whitespace-pre-wrap px-3 py-3">{item.notes || "—"}</td><td className="px-3 py-3"><RowActions onEdit={() => openModal("execution", item.id)} onDelete={() => removeRecord("execution", item.id)} /></td></tr>)}</tbody></table></div>
      <div className="mt-5 rounded-xl border border-[#f6bd91] bg-[#fff7f1] p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">Additional notes</h3><button onClick={() => openModal("project")} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#218f82] hover:underline"><Pencil size={12} />Edit report notes</button></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{reportProject.additionalNotes || "No additional notes added."}</p></div>
    </section>

    <div className="mb-5 grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Test execution outcomes" description="Pass, blocked, to-do, and failed percentages by execution area." />{hasExecutionMetrics ? <div className="mt-4 h-[320px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartExecution} margin={{ top: 8, right: 8, left: -18, bottom: 42 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="category" interval={0} angle={-20} textAnchor="end" height={68} tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" /><Tooltip formatter={(value) => `${value}%`} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="Pass %" fill="#5e9bd6" radius={[3, 3, 0, 0]} /><Bar dataKey="Block %" fill="#f3a477" radius={[3, 3, 0, 0]} /><Bar dataKey="To Do %" fill="#aab0ba" radius={[3, 3, 0, 0]} /><Bar dataKey="Fail %" fill="#f07167" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState title="Execution chart is ready" description="Enter test case totals and outcome counts to populate this chart." />}</section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Defect summary" description="Defect counts by workflow status and severity." /><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[360px] text-left text-xs"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><th className="pb-3 pr-4">Status</th>{defectSeverities.map((severity) => <th key={severity} className="pb-3 pr-4">{severity}</th>)}<th className="pb-3">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{defectSummary.map((row) => <tr key={row.status}><td className="py-2.5 pr-4 font-semibold text-slate-700">{row.status}</td>{defectSeverities.map((severity) => <td key={severity} className="py-2.5 pr-4 text-slate-600">{row[severity]}</td>)}<td className="py-2.5 font-bold text-slate-700">{row.P1 + row.P2 + row.P3}</td></tr>)}<tr className="border-t-2 border-slate-200"><td className="py-2.5 pr-4 font-bold text-slate-700">Total defects</td>{defectSeverities.map((severity) => <td key={severity} className="py-2.5 pr-4 font-bold text-slate-700">{totalDefectsBySeverity[severity]}</td>)}<td className="py-2.5 font-bold text-slate-800">{reportProject.defects.length}</td></tr></tbody></table></div><div className="mt-4 h-[220px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={defectSummary} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="P1" stackId="severity" fill="#5996d3" radius={[2, 2, 0, 0]} /><Bar dataKey="P2" stackId="severity" fill="#eea37b" /><Bar dataKey="P3" stackId="severity" fill="#a9aeb8" /></BarChart></ResponsiveContainer></div></section>
    </div>

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]">
      <SectionHeading title="Defect management" description="Track defect IDs, affected test cases, status, severity, and ownership." action={<button onClick={() => openModal("defect")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add defect</button>} />
      {reportProject.defects.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><th className="pb-3 pr-4">Defect ID</th><th className="pb-3 pr-4">Defect title</th><th className="pb-3 pr-4">Test cases impacted</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">Severity</th><th className="pb-3 pr-4">Comments</th><th className="pb-3 pr-4">Task owner</th><th className="pb-3 pr-4">POC / SL</th><th className="pb-3 pr-4">Link</th><th className="pb-3" /></tr></thead><tbody className="divide-y divide-slate-100">{reportProject.defects.map((defect) => { const href = safeExternalUrl(defect.link); return <tr key={defect.id} className="align-top text-xs"><td className="py-3.5 pr-4 font-bold text-slate-700">{defect.id}</td><td className="max-w-[280px] whitespace-pre-wrap py-3.5 pr-4 font-semibold text-slate-700">{defect.title || "—"}</td><td className="max-w-[180px] whitespace-pre-wrap py-3.5 pr-4 text-slate-600">{defect.impactedTestCases || "—"}</td><td className="py-3.5 pr-4"><StatusBadge status={defect.status} compact /></td><td className="py-3.5 pr-4 font-bold text-slate-600">{defect.severity}</td><td className="max-w-[260px] whitespace-pre-wrap py-3.5 pr-4 text-slate-500">{defect.comments || "—"}</td><td className="py-3.5 pr-4 text-slate-600">{defect.owner || "—"}</td><td className="py-3.5 pr-4 text-slate-600">{defect.poc || "—"}</td><td className="max-w-[200px] break-all py-3.5 pr-4">{href ? <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-[#218f82] underline">Open link</a> : defect.link || "—"}</td><td className="py-3.5"><RowActions onEdit={() => openModal("defect", defect.id)} onDelete={() => removeRecord("defect", defect.id)} /></td></tr>; })}</tbody></table></div> : <EmptyState title="No defects recorded" description="Add defects to populate the severity summary and chart." />}
      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold text-slate-700">Defects validated</h3><button onClick={() => openModal("validated")} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#218f82] hover:underline"><Pencil size={12} />Edit validated IDs</button></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{reportProject.validatedDefects.length ? reportProject.validatedDefects.join(", ") : "No validated defects recorded."}</p></div>
    </section>

    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Blockers" description="Issues impacting delivery or test case coverage." action={<button onClick={() => openModal("blocker")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add blocker</button>} />{reportProject.blockers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><th className="pb-3 pr-4">Description</th><th className="pb-3 pr-4">Impacted test cases</th><th className="pb-3 pr-4">Current status</th><th className="pb-3 pr-4">Additional notes</th><th className="pb-3" /></tr></thead><tbody className="divide-y divide-slate-100">{reportProject.blockers.map((blocker) => <tr key={blocker.id} className="text-xs"><td className="py-3.5 pr-4 font-bold text-slate-700">{blocker.description}</td><td className="py-3.5 pr-4 font-semibold text-slate-600">{blocker.impact}%</td><td className="py-3.5 pr-4"><StatusBadge status={blocker.currentStatus} compact /></td><td className="max-w-[440px] whitespace-pre-wrap py-3.5 pr-4 leading-5 text-slate-500">{blocker.notes || "—"}</td><td className="py-3.5"><RowActions onEdit={() => openModal("blocker", blocker.id)} onDelete={() => removeRecord("blocker", blocker.id)} /></td></tr>)}</tbody></table></div> : <EmptyState title="No blockers recorded" description="Add delivery blockers and their impacted test-case percentage." />}</section>

    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Current project risks" description="Risks to monitor through the next reporting cycle." action={<button onClick={() => openModal("risk")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf8f5] px-3 py-2 text-xs font-bold text-[#218f82] hover:bg-[#d9f3ee]"><Plus size={14} />Add risk</button>} />{reportProject.risks.length ? <div className="space-y-3">{reportProject.risks.map((risk) => <div key={risk.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-700">{risk.description}</p><p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-slate-500">{risk.notes || "No additional notes."}</p></div><RowActions onEdit={() => openModal("risk", risk.id)} onDelete={() => removeRecord("risk", risk.id)} /></div><div className="mt-3 flex items-center gap-3"><StatusBadge status={risk.status} compact /><span className="text-[11px] font-medium text-slate-400">Owner: {risk.owner || "Unassigned"}</span></div></div>)}</div> : <EmptyState title="No project risks recorded" description="Capture risks that need monitoring even when they are not blocking execution." />}</section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Notes" description="High-level context for the current DSR." /><div className="rounded-xl bg-[#f7f9fc] p-4"><FileText size={17} className="text-[#37b9a5]" /><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{reportProject.notes || "No notes added yet."}</p></div><button onClick={() => openModal("project")} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#218f82] hover:underline"><Pencil size={13} />Edit project notes</button></section>
    </div>

    <Modal open={modal === "stage"} onClose={closeModal} title="Add status item" description="Add an extra stage to this project's high-level status report."><form onSubmit={addCustomStage} className="space-y-4"><Field label="Stage name"><input name="name" required placeholder="e.g. Security validation" className={inputClass} /></Field><Field label="Initial status"><select name="status" defaultValue="Yet to Start" className={inputClass}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></Field>{stageError && <p role="alert" className="text-xs font-medium text-[#c65e52]">{stageError}</p>}<FormFooter onCancel={closeModal} label="Add item" /></form></Modal>

    <Modal open={modal === "project"} onClose={closeModal} title="Edit project report" description="Update the report header and project context." wide><form onSubmit={saveProject} className="grid gap-4 sm:grid-cols-2"><Field label="Project name"><input name="name" defaultValue={reportProject.name} required className={inputClass} /></Field><Field label="Owner"><input name="owner" defaultValue={reportProject.owner} className={inputClass} /></Field><Field label="Overall status"><select name="status" defaultValue={reportProject.status} className={inputClass}>{statusOptions.filter((value) => !["N/A", "Not Yet Started", "Complete"].includes(value)).map((option) => <option key={option}>{option}</option>)}</select></Field><Field label="Test environment"><input name="testEnvironment" defaultValue={reportProject.report.testEnvironment} className={inputClass} /></Field><Field label="Sprint start date"><input name="sprintStartDate" type="date" defaultValue={reportProject.report.sprintStartDate} className={inputClass} /></Field><Field label="Sprint end date"><input name="sprintEndDate" type="date" defaultValue={reportProject.report.sprintEndDate} className={inputClass} /></Field><Field label="Firmware version"><input name="firmwareVersion" defaultValue={reportProject.report.firmwareVersion} className={inputClass} /></Field><Field label="Solution version"><input name="solutionVersion" defaultValue={reportProject.report.solutionVersion} className={inputClass} /></Field><Field label="Targeted devices" className="sm:col-span-2"><textarea name="targetedDevices" defaultValue={reportProject.report.targetedDevices} rows={2} className={`${inputClass} resize-y`} /></Field><Field label="Project notes" className="sm:col-span-2"><textarea name="notes" defaultValue={reportProject.notes} rows={3} className={`${inputClass} resize-y`} /></Field><Field label="Additional report notes" className="sm:col-span-2"><textarea name="additionalNotes" defaultValue={reportProject.additionalNotes} rows={3} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label="Save changes" /></form></Modal>

    <Modal open={modal === "preparation" || modal === "execution" || modal === "risk" || modal === "blocker" || modal === "defect"} onClose={closeModal} title={modalTitle} description="Keep the project report current with the latest execution details." wide>
      {modal === "preparation" && <form onSubmit={saveRecord} className="grid gap-4 sm:grid-cols-2"><Field label="Preparation item"><input name="name" defaultValue={editingPreparation?.name ?? ""} required className={inputClass} /></Field><Field label="Status"><select name="status" defaultValue={editingPreparation?.status ?? "Yet to Start"} className={inputClass}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></Field><Field label="ETA for completion"><input name="eta" defaultValue={editingPreparation?.eta ?? ""} placeholder="e.g. 30/10/2026 or TBD" className={inputClass} /></Field><Field label="Blocked reason"><input name="blockedReason" defaultValue={editingPreparation?.blockedReason ?? ""} className={inputClass} /></Field><FormFooter onCancel={closeModal} label={editingPreparation ? "Save item" : "Add item"} /></form>}
      {modal === "execution" && <form onSubmit={saveRecord} className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2"><Field label="Execution area"><select name="area" defaultValue={editingExecution?.area ?? executionReportAreas[0]} className={inputClass}>{[...executionReportAreas, ...reportProject.execution.map((item) => item.area).filter((area) => !executionReportAreas.includes(area as typeof executionReportAreas[number]))].map((area) => <option key={area}>{area}</option>)}</select></Field><Field label="Total test cases"><input name="totalTestCases" type="number" min="0" defaultValue={editingExecution?.totalTestCases ?? ""} className={inputClass} /></Field><Field label="Test cases executed"><input name="testCasesExecuted" type="number" min="0" defaultValue={editingExecution?.testCasesExecuted ?? ""} className={inputClass} /></Field><Field label="Completion (%)"><input name="completion" type="number" min="0" max="100" defaultValue={editingExecution ? executionCompletion(editingExecution) ?? "" : ""} className={inputClass} /></Field><Field label="Test cases passed"><input name="testCasesPassed" type="number" min="0" defaultValue={editingExecution?.testCasesPassed ?? ""} className={inputClass} /></Field><Field label="Blocked"><input name="blocked" type="number" min="0" defaultValue={editingExecution?.blocked ?? ""} className={inputClass} /></Field><Field label="Blocked reason"><input name="blockedReason" defaultValue={editingExecution?.blockedReason ?? ""} className={inputClass} /></Field><Field label="ETA to unblock"><input name="etaToUnblock" defaultValue={editingExecution?.etaToUnblock ?? ""} placeholder="e.g. 30/10/2026 or TBD" className={inputClass} /></Field><Field label="Progress update to unblock"><textarea name="progressUpdateToUnblock" defaultValue={editingExecution?.progressUpdateToUnblock ?? ""} rows={2} className={`${inputClass} resize-y`} /></Field><Field label="Owner"><input name="owner" defaultValue={editingExecution?.owner ?? reportProject.owner} className={inputClass} /></Field><Field label="POC / SL"><input name="poc" defaultValue={editingExecution?.poc ?? ""} className={inputClass} /></Field><Field label="To do"><input name="toDo" type="number" min="0" defaultValue={editingExecution?.toDo ?? ""} className={inputClass} /></Field><Field label="Test cases failed"><input name="failed" type="number" min="0" defaultValue={editingExecution?.failed ?? ""} className={inputClass} /></Field><Field label="Bugs submitted"><input name="bugs" defaultValue={editingExecution?.bugs.join(", ") ?? ""} placeholder="Comma-separated defect IDs" className={inputClass} /></Field><Field label="Exploratory tests added"><textarea name="exploratoryTests" defaultValue={editingExecution?.exploratoryTests ?? ""} rows={2} className={`${inputClass} resize-y`} /></Field><Field label="Additional comments" className="sm:col-span-2"><textarea name="notes" defaultValue={editingExecution?.notes ?? ""} rows={3} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label={editingExecution ? "Save item" : "Add item"} /></form>}
      {modal === "blocker" && <form onSubmit={saveRecord} className="grid gap-4 sm:grid-cols-2"><Field label="Description" className="sm:col-span-2"><input name="description" defaultValue={editingBlocker?.description ?? ""} required className={inputClass} /></Field><Field label="Impacted test cases (%)"><input name="impact" type="number" min="0" max="100" defaultValue={editingBlocker?.impact ?? 0} className={inputClass} /></Field><Field label="Current status"><input name="currentStatus" defaultValue={editingBlocker?.currentStatus ?? ""} className={inputClass} /></Field><Field label="Additional notes" className="sm:col-span-2"><textarea name="notes" defaultValue={editingBlocker?.notes ?? ""} rows={3} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label={editingBlocker ? "Save blocker" : "Add blocker"} /></form>}
      {modal === "risk" && <form onSubmit={saveRecord} className="grid gap-4 sm:grid-cols-2"><Field label="Risk description" className="sm:col-span-2"><input name="description" defaultValue={editingRisk?.description ?? ""} required className={inputClass} /></Field><Field label="Status"><select name="status" defaultValue={editingRisk?.status ?? "Open"} className={inputClass}>{recordStatuses.map((status) => <option key={status}>{status}</option>)}</select></Field><Field label="Owner"><input name="owner" defaultValue={editingRisk?.owner ?? ""} className={inputClass} /></Field><Field label="Additional notes" className="sm:col-span-2"><textarea name="notes" defaultValue={editingRisk?.notes ?? ""} rows={3} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label={editingRisk ? "Save risk" : "Add risk"} /></form>}
      {modal === "defect" && <form onSubmit={saveRecord} className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2"><Field label="Defect ID"><input name="id" defaultValue={editingDefect?.id ?? ""} required className={inputClass} /></Field><Field label="Severity"><select name="severity" defaultValue={editingDefect?.severity ?? "P2"} className={inputClass}>{defectSeverities.map((severity) => <option key={severity}>{severity}</option>)}</select></Field><Field label="Defect title" className="sm:col-span-2"><input name="title" defaultValue={editingDefect?.title ?? ""} required className={inputClass} /></Field><Field label="Test cases impacted"><textarea name="impactedTestCases" defaultValue={editingDefect?.impactedTestCases ?? ""} rows={2} className={`${inputClass} resize-y`} /></Field><Field label="Status"><select name="status" defaultValue={editingDefect?.status ?? "Open"} className={inputClass}>{defectStatuses.map((status) => <option key={status}>{status}</option>)}</select></Field><Field label="Task owner"><input name="owner" defaultValue={editingDefect?.owner ?? ""} className={inputClass} /></Field><Field label="POC / SL"><input name="poc" defaultValue={editingDefect?.poc ?? ""} className={inputClass} /></Field><Field label="Defect link" className="sm:col-span-2"><input name="link" type="url" defaultValue={editingDefect?.link ?? ""} placeholder="https://…" className={inputClass} /></Field><Field label="Comments" className="sm:col-span-2"><textarea name="comments" defaultValue={editingDefect?.comments ?? ""} rows={3} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label={editingDefect ? "Save defect" : "Add defect"} /></form>}
    </Modal>

    <Modal open={modal === "validated"} onClose={closeModal} title="Defects validated" description="Enter validated defect IDs, separated by commas or new lines."><form onSubmit={saveValidatedDefects} className="space-y-4"><Field label="Bug IDs"><textarea name="validatedDefects" defaultValue={reportProject.validatedDefects.join(", ")} rows={5} className={`${inputClass} resize-y`} /></Field><FormFooter onCancel={closeModal} label="Save IDs" /></form></Modal>
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
