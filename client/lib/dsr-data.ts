export type SprintStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";
export type ProjectExecutionStatus = "Completed" | "In Progress" | "Blocked" | "Not Started";
export const sprintExecutionCategories = ["Functionality Execution", "Non Functionality Execution", "Automation- Print", "Automation- Scan"] as const;

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  projectIds: string[];
}

export type ProjectStatus =
  | "Completed"
  | "In Progress"
  | "Yet to Start"
  | "Blocked"
  | "Failed"
  | "Deferred";
export type StageStatus =
  | ProjectStatus
  | "Complete"
  | "Not Yet Started"
  | "N/A"
  | "TBD";
export type RecordStatus = "Open" | "Blocked" | "Monitoring" | "Resolved" | "Deferred";

export interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  isCustom?: boolean;
}

export interface Blocker {
  id: string;
  description: string;
  impact: number;
  currentStatus: string;
  notes: string;
}

export type ExecutionMetricValue = number | string | null;

export const executionMetricNumber = (value: ExecutionMetricValue | undefined) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export interface ExecutionMetrics {
  totalTestCases?: ExecutionMetricValue;
  testCasesExecuted?: ExecutionMetricValue;
  testCasesPassed?: ExecutionMetricValue;
  blocked?: ExecutionMetricValue;
  blockedReason?: string;
  etaToUnblock?: string;
  progressUpdateToUnblock?: string;
  toDo?: ExecutionMetricValue;
  failed?: ExecutionMetricValue;
  exploratoryTests?: string;
}

export interface ExecutionItem extends ExecutionMetrics {
  id: string;
  area: string;
  completion: ExecutionMetricValue;
  bugs: string[];
  notes: string;
  owner: string;
  poc: string;
}

export interface PreparationItem {
  id: string;
  name: string;
  status: StageStatus;
  eta: string;
  blockedReason: string;
  etaToUnblock: string;
  owner: string;
  comments: string;
}

export type DefectSeverity = "Low" | "Medium" | "High";
export type DefectPriority = "P1" | "P2" | "P3";
export type DefectStatus = "Open" | "In Progress" | "Development" | "Fixed / In Verification" | "Closed";

export interface Defect {
  id: string;
  title: string;
  impactedTestCases: string;
  status: DefectStatus;
  severity: DefectSeverity;
  priority: DefectPriority;
  comments: string;
  owner: string;
  poc: string;
  link: string;
}

export interface ProjectReport {
  sprintStartDate: string;
  sprintEndDate: string;
  testEnvironment: string;
  firmwareVersion: string;
  solutionVersion: string;
  targetedDevices: string;
}

export interface Risk {
  id: string;
  description: string;
  notes: string;
  status: RecordStatus;
  owner: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: string;
  lastUpdated: string;
  stages: Stage[];
  hiddenStages?: string[];
  blockers: Blocker[];
  execution: ExecutionItem[];
  risks: Risk[];
  riskSummary?: string;
  notes: string;
  report?: ProjectReport;
  preparation?: PreparationItem[];
  defects?: Defect[];
  validatedDefects?: string[];
  bugIds?: string[];
  highLevelComments?: string;
  additionalNotes?: string;
  functionalityStatus: StageStatus;
  nonFunctionalityStatus: StageStatus;
  automationStatus: StageStatus;
}

export interface Workspace {
  name: string;
}

export const projectExecutionStatus = (project: Project): ProjectExecutionStatus => {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
  const statuses = sprintExecutionCategories.map((category) => project.stages.find((stage) => normalize(stage.name) === normalize(category))?.status ?? "N/A");
  if (statuses.every((status) => status === "Completed" || status === "Complete")) return "Completed";
  if (statuses.some((status) => status === "Blocked" || status === "Failed")) return "Blocked";
  if (statuses.every((status) => ["Yet to Start", "Not Yet Started", "N/A"].includes(status))) return "Not Started";
  return "In Progress";
};

export const sprintExecutionStatus = (projects: Project[]): SprintStatus => {
  const statuses = projects.map(projectExecutionStatus);
  if (statuses.length && statuses.every((status) => status === "Completed")) return "Completed";
  if (statuses.includes("Blocked")) return "Blocked";
  if (!statuses.length || statuses.every((status) => status === "Not Started")) return "Not Started";
  return "In Progress";
};

export interface DailySnapshot {
  sprintId: string;
  sprintName: string;
  sprintStartDate: string;
  sprintEndDate: string;
  sprintStatus: SprintStatus;
  date: string;
  capturedAt: string;
  projects: Project[];
}

export type NormalizedExecutionItem = ExecutionItem & Required<ExecutionMetrics>;
export type NormalizedProject = Omit<Project, "report" | "preparation" | "execution" | "defects" | "validatedDefects" | "bugIds" | "highLevelComments" | "hiddenStages" | "additionalNotes" | "riskSummary"> & {
  report: ProjectReport;
  preparation: PreparationItem[];
  execution: NormalizedExecutionItem[];
  defects: Defect[];
  validatedDefects: string[];
  bugIds: string[];
  highLevelComments: string;
  hiddenStages: string[];
  additionalNotes: string;
  riskSummary: string;
};

const emptyProjectReport: ProjectReport = {
  sprintStartDate: "",
  sprintEndDate: "",
  testEnvironment: "",
  firmwareVersion: "",
  solutionVersion: "",
  targetedDevices: "",
};

export const createDefaultPreparationItems = (): PreparationItem[] => [
  { id: "hardware-readiness", name: "Hardware Readiness", status: "Yet to Start", eta: "", blockedReason: "", etaToUnblock: "", owner: "", comments: "" },
  { id: "solution-readiness", name: "Solution Readiness", status: "Yet to Start", eta: "", blockedReason: "", etaToUnblock: "", owner: "", comments: "" },
  { id: "new-features-test-case-design", name: "New Features Test Case Design", status: "Yet to Start", eta: "", blockedReason: "", etaToUnblock: "", owner: "", comments: "" },
];

export const executionReportAreas = [
  "Functionality",
  "Card Reader",
  "Non-Functionality",
  "Automation - Print",
  "Automation - Scan",
  "New Features Exploratory",
  "Defect Validation",
] as const;

const executionAreaKey = (area: string) => {
  const key = area.toLowerCase().replace(/[^a-z]/g, "");
  if (key === "functionalityexecution") return "functionality";
  if (key === "nonfunctionalityexecution") return "nonfunctionality";
  if (key === "newfeatures") return "newfeaturesexploratory";
  return key;
};

const normalizeDefect = (defect: Defect): Defect => {
  const legacyPriority = defect.severity as string;
  if (legacyPriority === "P1" || legacyPriority === "P2" || legacyPriority === "P3") {
    return {
      ...defect,
      severity: legacyPriority === "P1" ? "High" : legacyPriority === "P2" ? "Medium" : "Low",
      priority: defect.priority ?? legacyPriority,
    };
  }
  return { ...defect, priority: defect.priority ?? "P2" };
};

const normalizeExecutionItem = (item: ExecutionItem): NormalizedExecutionItem => ({
  totalTestCases: null,
  testCasesExecuted: null,
  testCasesPassed: null,
  blocked: null,
  blockedReason: "",
  etaToUnblock: "",
  progressUpdateToUnblock: "",
  toDo: null,
  failed: null,
  exploratoryTests: "",
  ...item,
});

export function normalizeProject(project: Project): NormalizedProject {
  const existingExecution = project.execution.map(normalizeExecutionItem);
  const usedIds = new Set<string>();
  const execution = executionReportAreas.map((area): NormalizedExecutionItem => {
    const existing = existingExecution.find((item) => executionAreaKey(item.area) === executionAreaKey(area) && !usedIds.has(item.id));
    if (existing) {
      usedIds.add(existing.id);
      return { ...existing, area };
    }
    return normalizeExecutionItem({
      id: `report-${area.toLowerCase().replace(/[^a-z]/g, "-")}`,
      area,
      completion: null,
      bugs: [],
      notes: "",
      owner: project.owner,
      poc: "",
    });
  });
  execution.push(...existingExecution.filter((item) => !usedIds.has(item.id) && !execution.some((row) => row.id === item.id)));

  return {
    ...project,
    report: { ...emptyProjectReport, ...project.report },
    preparation: (project.preparation ?? createDefaultPreparationItems()).map((item) => ({ etaToUnblock: "", owner: "", comments: "", ...item })),
    execution,
    defects: (project.defects ?? []).map(normalizeDefect),
    validatedDefects: project.validatedDefects ?? [],
    bugIds: project.bugIds ?? [],
    highLevelComments: project.highLevelComments ?? "",
    hiddenStages: project.hiddenStages ?? [],
    additionalNotes: project.additionalNotes ?? "",
    riskSummary: project.riskSummary ?? project.risks.map((risk) => [risk.description, risk.notes].filter(Boolean).join("\n")).join("\n\n"),
  };
}

export const stageOptions = [
  "Training",
  "Solution Understanding",
  "Exploratory",
  "TC Design",
  "Functionality Execution",
  "Non-Functionality Execution",
  "Automation",
  "Automation - Print",
  "Automation - Scan",
];

export const executionAreaOptions = [
  "Hardware Readiness",
  "Solution Readiness",
  "Setup Test Case Design",
  "Functional Test Case Design",
  "Non-Functional Test Case Design",
  "Functionality",
  "Card Reader",
  "Non-Functionality",
  "Defect Validation",
  "New Features",
  "Automation - Print",
  "Automation - Scan",
  "Coaster Sanity",
  "Fleet Sanity",
  "New Features Exploratory",
];

export const statusOptions: StageStatus[] = [
  "Completed",
  "In Progress",
  "Yet to Start",
  "Not Yet Started",
  "Blocked",
  "Failed",
  "Deferred",
  "N/A",
];

export const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("complete")) return "success";
  if (normalized.includes("progress")) return "info";
  if (normalized.includes("block") || normalized.includes("fail")) return "danger";
  if (normalized.includes("defer")) return "warning";
  return "neutral";
};

export const projectCompletion = (project: Project) => {
  const values = project.execution.map((entry) => entry.completion).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) : 0;
};

export const bugCount = (project: Project) => project.execution.reduce((count, entry) => count + entry.bugs.length, 0);
