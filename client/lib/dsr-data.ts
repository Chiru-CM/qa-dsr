export type SprintStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";

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
  | "N/A";
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

export interface ExecutionMetrics {
  totalTestCases?: number | null;
  testCasesExecuted?: number | null;
  testCasesPassed?: number | null;
  blocked?: number | null;
  blockedReason?: string;
  etaToUnblock?: string;
  progressUpdateToUnblock?: string;
  toDo?: number | null;
  failed?: number | null;
  exploratoryTests?: string;
}

export interface ExecutionItem extends ExecutionMetrics {
  id: string;
  area: string;
  completion: number | null;
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

export type DefectSeverity = "P1" | "P2" | "P3";
export type DefectStatus = "Open" | "In Progress" | "Development" | "Fixed / In Verification" | "Closed";

export interface Defect {
  id: string;
  title: string;
  impactedTestCases: string;
  status: DefectStatus;
  severity: DefectSeverity;
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
  blockers: Blocker[];
  execution: ExecutionItem[];
  risks: Risk[];
  notes: string;
  report?: ProjectReport;
  preparation?: PreparationItem[];
  defects?: Defect[];
  validatedDefects?: string[];
  additionalNotes?: string;
  functionalityStatus: StageStatus;
  nonFunctionalityStatus: StageStatus;
  automationStatus: StageStatus;
}

export interface Workspace {
  name: string;
}

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
export type NormalizedProject = Omit<Project, "report" | "preparation" | "execution" | "defects" | "validatedDefects" | "additionalNotes"> & {
  report: ProjectReport;
  preparation: PreparationItem[];
  execution: NormalizedExecutionItem[];
  defects: Defect[];
  validatedDefects: string[];
  additionalNotes: string;
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
    preparation: (project.preparation?.length ? project.preparation : createDefaultPreparationItems()).map((item) => ({ etaToUnblock: "", owner: "", comments: "", ...item })),
    execution,
    defects: project.defects ?? [],
    validatedDefects: project.validatedDefects ?? [],
    additionalNotes: project.additionalNotes ?? "",
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
  const values = project.execution.map((entry) => entry.completion).filter((value): value is number => value !== null);
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) : 0;
};

export const bugCount = (project: Project) => project.execution.reduce((count, entry) => count + entry.bugs.length, 0);
