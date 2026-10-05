import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CalendarDays, Check, CircleAlert, Clock3, Download, FileImage, Printer, ShieldAlert, Users } from "lucide-react";
import { toPng } from "html-to-image";
import { useOutletContext } from "react-router-dom";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { PageTitle, ProgressBar } from "@/components/dsr/DsrPrimitives";
import { bugCount, projectCompletion, type Project, type Sprint } from "@/lib/dsr-data";

const localDate = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
};

const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));

const latestSprintDate = (sprint: Sprint) => {
  const today = localDate();
  if (today < sprint.startDate) return sprint.startDate;
  return today > sprint.endDate ? sprint.endDate : today;
};

const executionStatus = (project: Project) => {
  if (project.status === "Blocked" || project.status === "Failed") return "Needs attention";
  if (project.status === "Completed") return "Completed";
  if (project.status === "Yet to Start") return "Not started";
  return "In progress";
};

const statusColors: Record<string, string> = {
  Completed: "border-[#bce8d8] bg-[#e7f7f1] text-[#20866f]",
  "In progress": "border-[#c9dcfb] bg-[#eaf2ff] text-[#4071ba]",
  "Not started": "border-slate-200 bg-slate-100 text-slate-500",
  "Needs attention": "border-[#f7c9c2] bg-[#fff0ed] text-[#c65e52]",
};

const statusDot: Record<string, string> = {
  Completed: "bg-[#37b9a5]",
  "In progress": "bg-[#6195dc]",
  "Not started": "bg-slate-400",
  "Needs attention": "bg-[#ef806f]",
};

const safeFileName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function ProjectReportCard({ project, index }: { project: Project; index: number }) {
  const status = executionStatus(project);
  const completion = projectCompletion(project);
  const activeBlockers = project.blockers.filter((blocker) => !["Resolved", "Deferred"].includes(blocker.currentStatus));
  const activeRisks = project.risks.filter((risk) => !["Resolved", "Deferred"].includes(risk.status));

  return (
    <article className="sprint-report-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_15px_rgba(20,40,70,0.035)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between md:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf7f6] text-xs font-bold text-[#218f82]">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-6 text-slate-900">{project.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Users size={13} />{project.owner || "Unassigned"}</p>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${statusColors[status]}`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />{status}</span>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)] md:p-6">
        <div>
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Overall completion</p><p className="mt-1 text-3xl font-bold tracking-tight text-[#10263d]">{completion}<span className="ml-0.5 text-base text-slate-400">%</span></p></div><BarChart3 size={19} className="mb-1 text-[#37b9a5]" /></div>
          <ProgressBar value={completion / 100} className="mt-3" showValue={false} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Open blockers</p><p className={`mt-1 text-lg font-bold ${activeBlockers.length ? "text-[#c65e52]" : "text-slate-700"}`}>{activeBlockers.length}</p></div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bug references</p><p className="mt-1 text-lg font-bold text-slate-700">{bugCount(project)}</p></div>
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Execution areas</p>
          {project.execution.length ? <div className="space-y-3">{project.execution.map((entry) => (
            <div key={entry.id}>
              <div className="mb-1 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-xs font-semibold text-slate-700">{entry.area}</span><span className="shrink-0 text-[10px] font-bold text-slate-500">{entry.completion === null ? "Not tracked" : `${Math.round(entry.completion * 100)}%`}</span></div>
              <ProgressBar value={entry.completion} showValue={false} />
              {(entry.notes || entry.bugs.length > 0 || entry.owner) && <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{[entry.notes, entry.bugs.length ? `Bugs: ${entry.bugs.join(", ")}` : "", entry.owner ? `Owner: ${entry.owner}` : ""].filter(Boolean).join(" · ")}</p>}
            </div>
          ))}</div> : <p className="text-xs text-slate-400">No execution areas recorded.</p>}
        </div>
      </div>

      <div className="grid gap-px border-t border-slate-100 bg-slate-100 md:grid-cols-2">
        <div className="bg-white p-5 md:px-6"><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Project update</p><p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{project.notes || "No project update recorded."}</p></div>
        <div className="bg-white p-5 md:px-6"><p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400"><ShieldAlert size={12} />Risks & blockers</p>{activeBlockers.length || activeRisks.length ? <ul className="space-y-1.5">{activeBlockers.map((blocker) => <li key={blocker.id} className="text-xs leading-5 text-slate-600"><span className="font-semibold text-[#c65e52]">{blocker.currentStatus || "Blocker"}:</span> {blocker.description}{blocker.notes ? ` — ${blocker.notes}` : ""}</li>)}{activeRisks.map((risk) => <li key={risk.id} className="text-xs leading-5 text-slate-600"><span className="font-semibold text-[#ae7d22]">Risk:</span> {risk.description}{risk.notes ? ` — ${risk.notes}` : ""}</li>)}</ul> : <p className="text-xs leading-5 text-slate-500">No active risks or blockers reported.</p>}</div>
      </div>
    </article>
  );
}

export default function Reports() {
  const { projects, sprints, activeSprintId, dailySnapshots } = useOutletContext<DsrOutletContext>();
  const [selectedSprintId, setSelectedSprintId] = useState(() => activeSprintId || sprints[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(() => {
    const sprint = sprints.find((item) => item.id === (activeSprintId || sprints[0]?.id));
    return sprint ? latestSprintDate(sprint) : localDate();
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const selectedSprint = sprints.find((sprint) => sprint.id === selectedSprintId);
  const snapshotKey = selectedSprint ? `${selectedSprint.id}:${selectedDate}` : "";
  const snapshot = dailySnapshots[snapshotKey];
  const reportProjects = useMemo(() => {
    if (!selectedSprint) return [];
    if (snapshot) return snapshot.projects;
    return selectedSprint.projectIds.map((id) => projects.find((project) => project.id === id)).filter((project): project is Project => Boolean(project));
  }, [projects, selectedSprint, snapshot]);

  useEffect(() => {
    if (selectedSprint) setSelectedDate(latestSprintDate(selectedSprint));
  }, [selectedSprintId]);

  const counts = useMemo(() => ({
    completed: reportProjects.filter((project) => project.status === "Completed").length,
    inProgress: reportProjects.filter((project) => project.status === "In Progress").length,
    attention: reportProjects.filter((project) => project.status === "Blocked" || project.status === "Failed" || project.blockers.some((blocker) => !["Resolved", "Deferred"].includes(blocker.currentStatus))).length,
  }), [reportProjects]);
  const averageCompletion = reportProjects.length ? Math.round(reportProjects.reduce((total, project) => total + projectCompletion(project), 0) / reportProjects.length) : 0;

  const selectSprint = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    const sprint = sprints.find((item) => item.id === sprintId);
    if (sprint) setSelectedDate(latestSprintDate(sprint));
    setExportError("");
  };

  const exportPng = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    setExportError("");
    try {
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#f7f9fc" });
      const link = document.createElement("a");
      link.download = `${safeFileName(selectedSprint?.name ?? "sprint")}-${selectedDate}-pulse.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setExportError("The image could not be generated. Try printing the report as a PDF instead.");
    } finally {
      setExporting(false);
    }
  };

  if (!sprints.length) {
    return <div className="mx-auto max-w-[1100px]"><PageTitle eyebrow="Reporting center" title="Sprint Pulse" description="A visual daily report for every project in a sprint." /><div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><CalendarDays className="mx-auto text-[#37b9a5]" size={28} /><h2 className="mt-4 text-lg font-bold text-slate-800">Create a sprint to get started</h2><p className="mt-1 text-sm text-slate-500">Once a sprint has projects, its daily pulse can be previewed and exported here.</p></div></div>;
  }

  const hasProjects = reportProjects.length > 0;
  const dateIsInSprint = Boolean(selectedSprint && selectedDate >= selectedSprint.startDate && selectedDate <= selectedSprint.endDate);
  const missingHistory = dateIsInSprint && !snapshot;

  return <div className="mx-auto max-w-[1180px]">
    <div className="sprint-report-page-title"><PageTitle eyebrow="Reporting center" title="Sprint Pulse" description="A shareable daily snapshot of every project in your sprint." action={<div className="flex flex-wrap gap-2"><button onClick={() => window.print()} disabled={!hasProjects} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#b9e7df] hover:text-[#218f82] disabled:cursor-not-allowed disabled:opacity-50"><Printer size={14} />Save as PDF</button><button onClick={exportPng} disabled={!hasProjects || exporting} className="inline-flex items-center gap-2 rounded-lg bg-[#10263d] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#183752] disabled:cursor-not-allowed disabled:opacity-60"><FileImage size={14} />{exporting ? "Creating image…" : "Download PNG"}</button></div>} /></div>

    <section className="sprint-report-controls mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_3px_15px_rgba(20,40,70,0.03)] md:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Sprint</span><select value={selectedSprintId} onChange={(event) => selectSprint(event.target.value)} className="form-input">{sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Report date</span><input type="date" value={selectedDate} min={selectedSprint?.startDate} max={selectedSprint ? latestSprintDate(selectedSprint) : undefined} onChange={(event) => { setSelectedDate(event.target.value); setExportError(""); }} className="form-input" /></label>
        <div className="flex h-10 items-center gap-2 rounded-lg bg-[#f3f8f8] px-3 text-xs font-semibold text-[#218f82]"><CalendarDays size={15} />{selectedSprint ? `${selectedSprint.projectIds.length} projects in sprint` : "Choose a sprint"}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">
        {snapshot ? <><Check size={13} className="mt-0.5 shrink-0 text-[#218f82]" /><span>Saved snapshot from {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(snapshot.capturedAt))}. Refreshed when the workspace opens or project and sprint data changes.</span></> : <><CircleAlert size={13} className="mt-0.5 shrink-0 text-[#ae7d22]" /><span>{missingHistory ? "No saved snapshot exists for this day. Preview and export use current project data; daily history starts being saved from now on." : "This date is outside the sprint range. Choose a date within the sprint to preview its report."}</span></>}
      </div>
    </section>

    {exportError && <p role="alert" className="sprint-report-alert mb-4 rounded-lg border border-[#f7c9c2] bg-[#fff8f6] px-3 py-2 text-xs font-semibold text-[#c65e52]">{exportError}</p>}

    {!hasProjects ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center"><Download className="mx-auto text-slate-300" size={25} /><h2 className="mt-4 text-base font-bold text-slate-700">No projects in this sprint yet</h2><p className="mt-1 text-xs text-slate-500">Add projects from the sprint workspace to build its daily report.</p></div> : <div ref={reportRef} className="sprint-report-print-area space-y-5 rounded-2xl bg-[#f7f9fc]">
      <section className="sprint-report-hero relative overflow-hidden rounded-2xl bg-[#10263d] p-6 text-white shadow-[0_12px_32px_rgba(16,38,61,0.18)] md:p-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[38px] border-white/[0.045]" /><div className="pointer-events-none absolute -bottom-28 right-28 h-56 w-56 rounded-full border-[28px] border-[#37c7b1]/10" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8ee2d4]"><span className="h-1.5 w-1.5 rounded-full bg-[#37c7b1]" />QALens · Daily Sprint Pulse</div><h2 className="max-w-2xl text-2xl font-bold leading-tight tracking-tight text-white md:text-4xl">{selectedSprint?.name}</h2><p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-300"><CalendarDays size={15} className="text-[#7fd9ca]" />{formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}<span className="text-slate-500">·</span>{selectedSprint ? `${formatDate(selectedSprint.startDate)} – ${formatDate(selectedSprint.endDate)}` : ""}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 lg:min-w-[190px]"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Sprint status</p><div className="mt-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#37c7b1]" /><span className="text-sm font-bold text-white">{snapshot?.sprintStatus ?? selectedSprint?.status ?? "In Progress"}</span></div><p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400"><Clock3 size={11} />{snapshot ? "Snapshot saved" : "Live project data"}</p></div>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Projects</p><p className="mt-1 text-2xl font-bold text-white">{reportProjects.length}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Completed</p><p className="mt-1 text-2xl font-bold text-[#8ee2d4]">{counts.completed}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">In progress</p><p className="mt-1 text-2xl font-bold text-[#a9c9ff]">{counts.inProgress}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Avg. completion</p><p className="mt-1 text-2xl font-bold text-white">{averageCompletion}<span className="ml-0.5 text-sm text-slate-400">%</span></p></div>
        </div>
        <div className="relative mt-4 flex items-center gap-2 text-[11px] font-medium text-slate-300"><CircleAlert size={13} className="text-[#f3c969]" />{counts.attention} {counts.attention === 1 ? "project needs" : "projects need"} attention</div>
      </section>

      {missingHistory && <div className="rounded-xl border border-[#f2dfaa] bg-[#fffaf0] px-4 py-3 text-xs leading-5 text-[#8a6829]"><strong>Historical snapshot unavailable.</strong> This date predates saved daily history, so this report shows the current project details rather than a verified past-day state.</div>}

      <div className="flex items-end justify-between gap-3 px-1"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#31a896]">Portfolio detail</p><h2 className="mt-1 text-lg font-bold text-slate-900">Project-by-project pulse</h2></div><p className="text-[10px] font-semibold text-slate-400">{reportProjects.length} {reportProjects.length === 1 ? "PROJECT" : "PROJECTS"}</p></div>
      <div className="space-y-4">{reportProjects.map((project, index) => <ProjectReportCard key={project.id} project={project} index={index} />)}</div>
      <footer className="flex flex-col justify-between gap-1 border-t border-slate-200 px-1 pt-3 text-[10px] font-medium text-slate-400 sm:flex-row"><span>QALens · QA Engineering</span><span>{snapshot ? `Snapshot captured ${formatDate(snapshot.date)}` : "Generated from current project data"}</span></footer>
    </div>}
  </div>;
}
