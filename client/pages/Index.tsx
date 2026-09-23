import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleDashed, Filter, Layers3, Plus, ShieldAlert, Zap } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { Modal } from "@/components/dsr/Modal";
import { PageTitle, ProgressBar, SectionHeading, StatusBadge } from "@/components/dsr/DsrPrimitives";
import { bugCount, excelTabNames, projectCompletion, stageOptions, type Project } from "@/lib/dsr-data";

const dashboardProjectIds = [
  "ndd-print-oxpd",
  "safeq-cloud-npi-workpath",
  "hp-advanced-npi",
  "hp-advanced-fleet",
  "papercut-mf-26-0-3",
  "papercut-mf-26-0-5",
];

const defaultReportFields = [
  "Functionality Execution",
  "Non Functionality Execution",
  "Automation- Print",
  "Automation- Scan",
];

const statusColors = {
  Completed: "#36b29e",
  Complete: "#36b29e",
  "In Progress": "#6195dc",
  "Yet to Start": "#cbd5e1",
  "Not Yet Started": "#cbd5e1",
  Blocked: "#ec806e",
  Failed: "#ec806e",
  Deferred: "#e2b957",
  "N/A": "#d7dee7",
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
const displayField = (value: string) => value === "Non-Functionality Execution" ? "Non Functionality Execution" : value === "Automation - Print" ? "Automation- Print" : value === "Automation - Scan" ? "Automation- Scan" : value;
const fieldOptions = Array.from(new Set([...defaultReportFields, ...stageOptions.map(displayField)]));

function KpiCard({ label, value, helper, icon: Icon, tone }: { label: string; value: number; helper: string; icon: typeof Layers3; tone: string }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-3 text-[28px] font-bold tracking-tight text-slate-900">{value}</p></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={19} /></div></div><p className="mt-3 text-[11px] font-medium text-slate-400">{helper}</p></div>;
}

function stageForField(project: Project, field: string) {
  return project.stages.find((stage) => normalize(stage.name) === normalize(field));
}

function stageSummary(projects: Project[], field: string) {
  const counts: Record<string, number> = {};
  projects.forEach((project) => {
    const status = stageForField(project, field)?.status ?? "N/A";
    counts[status] = (counts[status] ?? 0) + 1;
  });
  return counts;
}

function HighLevelStatusReport({ projects, fields, onAddFields }: { projects: Project[]; fields: string[]; onAddFields: () => void }) {
  const columns = { gridTemplateColumns: `210px repeat(${fields.length}, minmax(148px, 1fr))` };
  const stageColumns = { gridTemplateColumns: `repeat(${fields.length}, minmax(148px, 1fr))` };
  return <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-end"><div><p className="text-[15px] font-bold text-slate-800">High level status report</p><p className="mt-0.5 text-xs text-slate-400">Daily snapshot for the six active worksheet tabs and their core execution stages.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400"><span className="rounded-full bg-[#e7f7f1] px-2 py-1 text-[#20866f]">Completed</span><span className="rounded-full bg-[#eaf2ff] px-2 py-1 text-[#4071ba]">In Progress</span><span className="rounded-full bg-[#fff7e5] px-2 py-1 text-[#ae7d22]">Deferred</span><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">Not started</span></div><button onClick={onAddFields} className="inline-flex items-center gap-1.5 rounded-lg bg-[#10263d] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#183752]"><Plus size={13} />Add field</button></div></div><div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2 lg:grid-cols-4">{fields.map((field) => { const counts = stageSummary(projects, field); const complete = (counts.Completed ?? 0) + (counts.Complete ?? 0); const completeWidth = projects.length ? (complete / projects.length) * 100 : 0; return <div key={field} className="rounded-xl border border-slate-100 bg-white p-3"><div className="flex items-start justify-between gap-2"><p className="text-[11px] font-bold leading-4 text-slate-600">{field}</p><span className="text-xs font-bold text-slate-800">{complete}/{projects.length}</span></div><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">{Object.entries(counts).map(([status, count]) => <span key={status} style={{ width: `${(count / projects.length) * 100}%`, backgroundColor: statusColors[status as keyof typeof statusColors] ?? "#cbd5e1" }} />)}</div><p className="mt-2 text-[10px] font-medium text-slate-400">completed across selected tabs</p></div>; })}</div><div className="overflow-x-auto"><div className="min-w-max"><div className="grid grid-cols-[210px_minmax(0,1fr)] gap-4 border-b border-slate-100 bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><div className="flex items-center">Projects</div><div><p className="mb-2 text-[9px] tracking-[0.16em] text-[#31a896]">Execution sections</p><div style={stageColumns} className="grid gap-4">{fields.map((field) => <span key={field} className="truncate" title={field}>{field}</span>)}</div></div></div><div className="max-h-[470px] divide-y divide-slate-100 overflow-y-auto">{projects.map((project) => <Link to={`/projects/${project.id}`} key={project.id} style={columns} className="grid items-center gap-4 px-5 py-3 transition hover:bg-[#fbfdfd]"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700" title={excelTabNames[project.id] ?? project.name}>{excelTabNames[project.id] ?? project.name}</p><div className="mt-1"><StatusBadge status={project.status} compact /></div></div>{fields.map((field) => { const stage = stageForField(project, field); return <div key={field} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2"><p className="truncate text-[10px] font-semibold text-slate-500">{field}</p><div className="mt-1.5"><StatusBadge status={stage?.status ?? "N/A"} compact /></div></div>; })}</Link>)}</div></div></div></section>;
}

export default function Index() {
  const { projects } = useOutletContext<DsrOutletContext>();
  const [reportFields, setReportFields] = useState(defaultReportFields);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [draftFields, setDraftFields] = useState(defaultReportFields);
  const dashboardProjects = useMemo(() => dashboardProjectIds.map((id) => projects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project)), [projects]);
  const metrics = useMemo(() => {
    const completed = dashboardProjects.filter((project) => project.status === "Completed").length;
    const inProgress = dashboardProjects.filter((project) => project.status === "In Progress").length;
    const yetToStart = dashboardProjects.filter((project) => project.status === "Yet to Start").length;
    const blockers = dashboardProjects.filter((project) => project.blockers.some((blocker) => blocker.status === "Blocked" || blocker.status === "Open")).length;
    const automationIssues = dashboardProjects.filter((project) => ["Failed", "Blocked", "Deferred"].includes(project.automationStatus)).length;
    return { completed, inProgress, yetToStart, blockers, automationIssues };
  }, [dashboardProjects]);
  const statusData = Object.entries(dashboardProjects.reduce<Record<string, number>>((result, project) => { result[project.status] = (result[project.status] ?? 0) + 1; return result; }, {})).map(([name, value]) => ({ name, value }));
  const blockerData = dashboardProjects.map((project) => ({ name: excelTabNames[project.id] ?? project.name, blockers: project.blockers.length })).filter((project) => project.blockers > 0).sort((a, b) => b.blockers - a.blockers);
  const automationData = ["Completed", "In Progress", "Yet to Start", "Failed / Deferred"].map((name) => ({ name, count: name === "Failed / Deferred" ? metrics.automationIssues : dashboardProjects.filter((project) => project.automationStatus === name).length })).filter((entry) => entry.count > 0);
  const recentProjects = dashboardProjects.filter((project) => project.status !== "Completed").slice(0, 5);

  const openFieldPicker = () => { setDraftFields(reportFields); setFieldPickerOpen(true); };
  const saveFields = () => { setReportFields(draftFields.length ? draftFields : defaultReportFields); setFieldPickerOpen(false); };
  const toggleField = (field: string) => setDraftFields((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);

  return <div className="mx-auto max-w-[1440px]"><PageTitle eyebrow="20 September 2025 · Daily report" title="QA status at a glance" description="A focused daily view of the six active worksheet tabs and the execution stages that matter most." action={<Link to="/projects" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10263d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#183752]"><Filter size={14} />Manage projects</Link>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><KpiCard label="Daily report tabs" value={dashboardProjects.length} helper="Focused dashboard scope" icon={Layers3} tone="bg-[#eaf2ff] text-[#4e83cf]" /><KpiCard label="Completed" value={metrics.completed} helper="Ready for sign-off" icon={CheckCircle2} tone="bg-[#e7f7f1] text-[#2a9b85]" /><KpiCard label="In progress" value={metrics.inProgress} helper="Actively being executed" icon={Zap} tone="bg-[#fff7e5] text-[#bd8a2b]" /><KpiCard label="Yet to start" value={metrics.yetToStart} helper="Planned for next cycle" icon={CircleDashed} tone="bg-slate-100 text-slate-500" /><KpiCard label="With blockers" value={metrics.blockers} helper="Need attention today" icon={ShieldAlert} tone="bg-[#fff0ed] text-[#d36d5f]" /></div><HighLevelStatusReport projects={dashboardProjects} fields={reportFields} onAddFields={openFieldPicker} />

    <div className="mt-7"><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Projects by status" description="Current delivery distribution across the daily report tabs" /><div className="relative h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} innerRadius={67} outerRadius={91} paddingAngle={3} dataKey="value" strokeWidth={0}>{statusData.map((entry) => <Cell key={entry.name} fill={statusColors[entry.name as keyof typeof statusColors] ?? "#cbd5e1"} />)}</Pie><Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center pb-1 text-center"><div><p className="text-3xl font-bold text-slate-800">{dashboardProjects.length}</p><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Report tabs</p></div></div></div><div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1 sm:grid-cols-4">{statusData.map((entry) => <div key={entry.name} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-1.5 text-slate-500"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColors[entry.name as keyof typeof statusColors] ?? "#cbd5e1" }} />{entry.name}</span><span className="font-bold text-slate-700">{entry.value}</span></div>)}</div></div></div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Blockers by project" description="Open items impacting the daily report" action={<Link to="/blockers" className="text-xs font-semibold text-[#269b8c] hover:underline">View blockers</Link>} />{blockerData.length ? <div className="space-y-4">{blockerData.map((entry) => <div key={entry.name}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="truncate text-xs font-semibold text-slate-600">{entry.name}</span><span className="text-[11px] font-bold text-[#d36d5f]">{entry.blockers} {entry.blockers === 1 ? "blocker" : "blockers"}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#fff0ed]"><div className="h-full rounded-full bg-[#ef806f]" style={{ width: `${Math.max(20, entry.blockers / Math.max(...blockerData.map((item) => item.blockers)) * 100)}%` }} /></div></div>)}</div> : <p className="py-8 text-center text-xs text-slate-400">No active blockers.</p>}</div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><SectionHeading title="Automation status" description="Print, scan, and script readiness" /><div className="space-y-3">{automationData.map((entry) => <div key={entry.name} className="flex items-center gap-3"><div className="w-28 text-xs font-medium text-slate-500">{entry.name}</div><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${entry.name === "Completed" ? "bg-[#37b9a5]" : entry.name === "Failed / Deferred" ? "bg-[#ef806f]" : entry.name === "In Progress" ? "bg-[#6195dc]" : "bg-slate-300"}`} style={{ width: `${(entry.count / dashboardProjects.length) * 100}%` }} /></div><div className="w-5 text-right text-xs font-bold text-slate-700">{entry.count}</div></div>)}</div><div className="mt-6 rounded-xl bg-[#f7f9fc] p-3.5"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attention needed</p><p className="mt-1 text-sm font-semibold text-slate-700">{metrics.automationIssues} report tab{metrics.automationIssues === 1 ? "" : "s"} with automation issues</p><Link to="/projects" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#269b8c]">Review projects <ArrowRight size={13} /></Link></div></div></div>

    <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-[15px] font-bold text-slate-800">Active workstreams</h2><p className="mt-0.5 text-xs text-slate-400">Projects needing the team&apos;s attention</p></div><Link to="/projects" className="flex items-center gap-1 text-xs font-bold text-[#269b8c]">Open projects <ArrowRight size={13} /></Link></div><div className="divide-y divide-slate-100">{recentProjects.map((project) => <Link to={`/projects/${project.id}`} key={project.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 sm:grid-cols-[1.25fr_0.7fr_0.8fr_0.8fr_auto]"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">{excelTabNames[project.id] ?? project.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{project.owner}</p></div><div className="hidden sm:block"><StatusBadge status={project.status} compact /></div><div className="hidden sm:block"><ProgressBar value={projectCompletion(project) / 100} /></div><div className="hidden text-right sm:block"><span className="text-xs font-bold text-slate-700">{bugCount(project)}</span><span className="ml-1 text-[10px] text-slate-400">bugs</span></div><ArrowRight size={15} className="text-slate-300" /></Link>)}{recentProjects.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">All report tabs are completed.</p>}</div></div>

    <Modal open={fieldPickerOpen} onClose={() => setFieldPickerOpen(false)} title="Customize status report" description="Choose the stage fields that should appear in the daily dashboard. The selected fields are kept for this session."><div className="grid gap-2 sm:grid-cols-2">{fieldOptions.map((field) => <label key={field} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-xs font-semibold transition ${draftFields.includes(field) ? "border-[#b9e7df] bg-[#eaf8f5] text-[#218f82]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><input type="checkbox" checked={draftFields.includes(field)} onChange={() => toggleField(field)} className="h-4 w-4 accent-[#37b9a5]" />{field}</label>)}</div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setFieldPickerOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button onClick={saveFields} className="rounded-lg bg-[#10263d] px-4 py-2 text-xs font-bold text-white">Apply fields</button></div></Modal>
  </div>;
}
