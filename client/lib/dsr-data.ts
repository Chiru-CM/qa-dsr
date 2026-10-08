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

export interface ExecutionItem {
  id: string;
  area: string;
  completion: number | null;
  bugs: string[];
  notes: string;
  owner: string;
  poc: string;
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
