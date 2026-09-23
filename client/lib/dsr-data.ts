export const PROJECT_NAMES = [
  "SafeQ Cloud",
  "MyQ Roger",
  "HPCR",
  "HP Advance",
  "PaperCut",
  "HP Secure Print",
  "SafeQ Cloud OXPd",
  "SafeQ Cloud Workpath",
  "MyQ X",
  "NDD Print OXPd",
  "NDD Print Workpath",
  "SafeQ Cloud NPI - Workpath",
  "HP Secure Print - NPI Blades",
  "HP Secure Print - NPI Heroes",
  "HP Advanced - NPI",
  "HP Advanced - Fleet",
  "PaperCut MF - 26.0.3",
  "PaperCut MF - 26.0.5",
] as const;

export const excelTabNames: Record<string, string> = {
  "safeq-cloud": "SafeQCloud",
  "myq-roger": "MyQ Roger",
  hpcr: "HPCR",
  "hp-advance": "HP Advance",
  papercut: "PaperCut",
  "hp-secure-print": "HP Secure Print",
  "safeq-cloud-oxpd": "SafeQ Cloud OXPd",
  "safeq-cloud-workpath": "SafeQ Cloud Workpath",
  "myq-x": "MyQ X",
  "ndd-print-oxpd": "NDD_Print_OXPd",
  "ndd-print-workpath": "NDD_Print_Workpath",
  "safeq-cloud-npi-workpath": "SafeQ_Cloud_NPI-Workpath",
  "hp-secure-print-npi-blades": "HP Secure Print- NPI-Blades",
  "hp-secure-print-npi-heroes": "HP Secure Print- NPI-Heroes",
  "hp-advanced-npi": "HP Advanced-NPI",
  "hp-advanced-fleet": "HP Advanced-Fleet",
  "paper-cut-mf-26-0-3": "Paper Cut MF-26.0.3",
  "papercut-mf-26-0-5": "PaperCut MF-26.0.5",
};

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
}

export interface Blocker {
  id: string;
  description: string;
  impact: number;
  status: RecordStatus;
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

const baseStages = [
  "Exploratory",
  "TC Design",
  "Functionality Execution",
  "Non-Functionality Execution",
  "Automation",
];
const automationStages = [
  "Functionality Execution",
  "Non-Functionality Execution",
  "Automation - Print",
  "Automation - Scan",
];
const executionAreas = ["Functionality", "Card Reader", "Non-Functionality", "Automation"];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const stage = (name: string, status: StageStatus, index: number): Stage => ({
  id: `${slugify(name)}-${index}`,
  name,
  status,
});

const item = (
  area: string,
  completion: number | null,
  options: Partial<Omit<ExecutionItem, "id" | "area" | "completion">> = {},
): ExecutionItem => ({
  id: `${slugify(area)}-${Math.random().toString(36).slice(2, 8)}`,
  area,
  completion: completion === null ? null : completion > 1 ? completion / 100 : completion,
  bugs: [],
  notes: "",
  owner: "",
  poc: "",
  ...options,
});

const makeProject = (
  name: string,
  status: ProjectStatus,
  stageStatuses: StageStatus[],
  overrides: Partial<Project> = {},
): Project => {
  const isAutomationProject = /NPI|Fleet|MF|NDD/.test(name);
  const stageNames = name === "MyQ Roger" ? ["Training", "Solution Understanding", ...baseStages] : isAutomationProject ? automationStages : baseStages;
  const stages = stageNames.map((stageName, index) =>
    stage(stageName, stageStatuses[index] ?? "N/A", index),
  );
  const completion = stageStatuses.filter((value) => value === "Completed" || value === "Complete").length / stageStatuses.length;
  const execution = (overrides.execution ?? (isAutomationProject ? [...executionAreas.slice(0, 3), "Automation - Print", "Automation - Scan"] : executionAreas)).map((area) =>
    typeof area === "string" ? item(area, status === "Yet to Start" ? null : completion) : area,
  );
  return {
    id: slugify(name),
    name,
    status,
    owner: "QA Engineering",
    lastUpdated: "20 Sep 2025",
    stages,
    blockers: [],
    execution,
    risks: [],
    notes: "Weekly DSR update for the QA and automation workstream.",
    functionalityStatus: status === "Completed" ? "Completed" : status === "Yet to Start" ? "Yet to Start" : "In Progress",
    nonFunctionalityStatus: status === "Completed" ? "Completed" : status === "Yet to Start" ? "Yet to Start" : "In Progress",
    automationStatus: status === "Completed" ? "Completed" : status === "Yet to Start" ? "Yet to Start" : "In Progress",
    ...overrides,
  };
};

export const initialProjects: Project[] = [
  makeProject("SafeQ Cloud", "In Progress", ["Completed", "Completed", "Completed", "Completed", "Deferred"], {
    blockers: [{ id: "scl-blocker", description: "Send to OCR File", impact: 5, status: "Blocked", notes: "Special package / license is not available on the server. Follow up with ISV." }],
    execution: [
      item("Functionality", 100, { bugs: ["SCL-941", "SCL-949", "SCL-1027", "1043"] }),
      item("Non-Functionality", 100),
      item("Automation", 0, { notes: "Script issue. Automation team is working to fix it; execution deferred to next release." }),
    ],
    risks: [{ id: "scl-risk", description: "Automation coverage is deferred for this release.", notes: "Re-plan after the script issue is resolved.", status: "Monitoring", owner: "Automation team" }],
    automationStatus: "Deferred",
    notes: "OxPD and Workpath execution are complete. Automation is deferred to the next release because of a script issue.",
  }),
  makeProject("MyQ Roger", "In Progress", ["Completed", "In Progress", "In Progress", "In Progress", "Yet to Start", "Yet to Start", "Yet to Start"], {
    blockers: [{ id: "roger-blocker", description: "Universal print", impact: 5, status: "Blocked", notes: "Admin privilege is missing in the reseller account. Meeting with the MyQ team is planned." }],
    execution: [item("Functionality", 0, { notes: "MyQ Roger bugs" }), item("Card Reader", 0), item("Non-Functionality", 0), item("Automation", 0)],
  }),
  makeProject("HPCR", "Completed", ["Completed", "Completed", "Completed", "Completed", "Completed"], {
    blockers: [
      { id: "hpcr-email", description: "Scan to Email", impact: 0, status: "Monitoring", notes: "SCL-1569. Server restart is currently needed to remedy failing email jobs; Upland is investigating." },
      { id: "hpcr-sharepoint", description: "Scan to Me", impact: 0, status: "Monitoring", notes: "SCL-1570. Reproduction details and logs were sent to Upland." },
      { id: "hpcr-mobile", description: "Mobile Apps", impact: 0, status: "Open", notes: "SCL-1549. Waiting for the components needed to make this work." },
    ],
    execution: [item("Functionality", 100, { bugs: ["HPCR Bugs"], notes: "HP CR Fax deferred due to environment availability." }), item("Card Reader", null, { notes: "Card Reader testing not applicable." }), item("Non-Functionality", 100), item("Automation", 100), item("Coaster Sanity", 100)],
  }),
  makeProject("HP Advance", "Completed", ["Completed", "Completed", "Completed", "Completed", "Completed"], { execution: executionAreas.slice(0, 4).map((area) => item(area, 100, { bugs: area === "Functionality" ? ["HP Advance Bugs"] : [] })).concat(item("Coaster Sanity", 100)) }),
  makeProject("PaperCut", "Completed", ["Completed", "Completed", "Completed", "Completed", "Completed"], { execution: executionAreas.slice(0, 4).map((area) => item(area, 100, { bugs: area === "Functionality" ? ["PaperCut Bugs"] : [] })).concat(item("Coaster Sanity", 100)) }),
  makeProject("HP Secure Print", "Completed", ["Completed", "Completed", "Completed", "Completed", "Completed"], { execution: executionAreas.map((area) => item(area, 100, { bugs: area === "Functionality" ? ["HP Secure Print Bugs"] : [] })) }),
  makeProject("SafeQ Cloud OXPd", "Completed", ["Completed", "Completed", "Completed", "Completed", "Completed"], { execution: [item("Functionality", 100, { bugs: ["SafeQ Cloud Bugs"] }), item("Card Reader", 100), item("Non-Functionality", 100), item("Automation", 100), item("Coaster Sanity", 100), item("New Features Exploratory", 100)] }),
  makeProject("SafeQ Cloud Workpath", "Completed", ["Completed", "Completed", "Completed", "Completed", "Completed"], { execution: [item("Functionality", 100, { bugs: ["SafeQ Cloud Bugs"] }), item("Card Reader", 100), item("Non-Functionality", 100), item("Automation", 100), item("Coaster Sanity", 100), item("New Features Exploratory", 100)] }),
  makeProject("MyQ X", "Completed", ["Completed", "Completed", "Completed", "Completed", "Completed"], { execution: [item("Functionality", 100, { bugs: ["MyQ Bugs"] }), item("Card Reader", 100), item("Non-Functionality", 100), item("Automation", 100), item("Fleet Sanity", 100), item("Coaster Sanity", 100), item("New Features Exploratory", 100)], risks: [{ id: "myqx-risk", description: "BT1T95 card readers are not supported by MyQ X.", notes: "Results were set to N/A and an enhancement request was submitted.", status: "Monitoring", owner: "QA Engineering" }] }),
  makeProject("NDD Print OXPd", "In Progress", ["Completed", "Completed", "Completed", "Completed", "Completed", "Yet to Start"], { execution: [item("Setup Test Case Design", 100), item("Functional Test Case Design", 100), item("Non-Functional Test Case Design", 100), item("Functionality", 100), item("Card Reader", 100), item("Non-Functionality", 100), item("Automation - Print", 100), item("Automation - Scan", null, { notes: "No plugin available. Planned for next release." }), item("New Features Exploratory", 100, { owner: "CP", poc: "Liander/Ambrose Swamy", notes: "NDD team is investigating the QR code issue on the device control panel." })] }),
  makeProject("NDD Print Workpath", "Yet to Start", ["Completed", "Completed", "Failed", "Yet to Start"], { blockers: [{ id: "ndd-wp-blocker", description: "Automation scan plugin", impact: 0, status: "Deferred", notes: "No plugin available. Planned for next release." }], execution: [item("Functionality", 100), item("Card Reader", 100), item("Non-Functionality", 100), item("Automation - Print", 0, { bugs: ["RDLINT-6134"], notes: "NDD Workpath print duration failure.", owner: "Deepika BH", poc: "Vivek/Rohit" }), item("Automation - Scan", null, { notes: "No plugin available." }), item("New Features Exploratory", null, { notes: "Tracked as part of OxPD." })], automationStatus: "Failed" }),
  makeProject("SafeQ Cloud NPI - Workpath", "In Progress", ["Completed", "Completed", "Completed", "Completed"], { execution: [item("Functionality", 100), item("Card Reader", 100), item("Non-Functionality", 100), item("Automation - Print", 100, { owner: "Automation Team (Appanna)", poc: "Rohit/Vivek", notes: "Automation run with 59% success. Logs submitted to automation team." }), item("Automation - Scan", 0, { bugs: ["SWQATR-1254"], notes: "Automation run completed with failures." })], automationStatus: "Failed" }),
  makeProject("HP Secure Print - NPI Blades", "In Progress", ["Completed", "Completed", "Yet to Start", "Yet to Start"], { execution: [item("Hardware Readiness", 100), item("Solution Readiness", 100), item("Functional Test Case Design", 100), item("Functionality", 100), item("Card Reader", 100), item("Non-Functionality", 100), item("Defect Validation", 100), item("Automation - Print", null, { bugs: ["RDLINT-6170"], poc: "ISV" }), item("Automation - Scan", null, { bugs: ["RDLINT-6170"], poc: "ISV" })] }),
  makeProject("HP Secure Print - NPI Heroes", "In Progress", ["Completed", "Completed", "Yet to Start", "Yet to Start"], { execution: [item("Hardware Readiness", 100), item("Functionality", 100), item("Card Reader", 100), item("Non-Functionality", 100), item("Automation - Print", null, { bugs: ["RDLINT-6170"], poc: "ISV" }), item("Automation - Scan", null, { bugs: ["RDLINT-6170"], poc: "ISV" })] }),
  makeProject("HP Advanced - NPI", "Completed", ["Completed", "Completed", "Completed", "Completed"], { execution: [item("Hardware Readiness", 100), item("Functionality", 100, { owner: "Ravi/Chandra", poc: "Ryan/ISV/Haribabu", notes: "Functionality testing is completed." }), item("Card Reader", 100), item("Non-Functionality", 100), item("Defect Validation", 100), item("New Features", 100, { owner: "Nandhu/CP", poc: "Ryan/ISV/Haribabu", notes: "Driverless Print Support (IPP/IPPS) validated successfully." }), item("Automation - Print", 100), item("Automation - Scan", 100)] }),
  makeProject("HP Advanced - Fleet", "Yet to Start", ["Yet to Start", "Yet to Start", "Yet to Start", "Yet to Start"], { execution: [item("Hardware Readiness", 50, { owner: "Baba" }), item("Functionality", null), item("Card Reader", null), item("Non-Functionality", null), item("Defect Validation", null, { owner: "Nandhu/CP", poc: "Ryan/ISV/Haribabu" }), item("New Features", null), item("Automation - Print", null), item("Automation - Scan", null)], automationStatus: "Yet to Start", notes: "Upgrade to the latest version is in progress; automation will start after the upgrade." }),
  makeProject("PaperCut MF - 26.0.3", "Completed", ["Completed", "Completed", "Completed", "Completed"], { execution: [item("Hardware Readiness", 100), item("Functionality", 100), item("Card Reader", 100), item("Non-Functionality", 100), item("Defect Validation", 100, { owner: "Sai Ram/Manoj", poc: "Preethi" }), item("New Features", 100, { owner: "Ravi/Chandrashekar", poc: "Preethi" }), item("Automation - Print", 100), item("Automation - Scan", 100)] }),
  makeProject("PaperCut MF - 26.0.5", "Yet to Start", ["Yet to Start", "Yet to Start", "In Progress", "Yet to Start"], { blockers: [{ id: "papercut-automation", description: "Automation result failures", impact: 0, status: "Open", notes: "Logs submitted to the automation team for verification." }], execution: [item("Hardware Readiness", 50, { owner: "Manoj" }), item("Functionality", null), item("Card Reader", null), item("Non-Functionality", null), item("Defect Validation", null), item("New Features", null), item("Automation - Print", 0, { bugs: ["RDLINT-6204"], owner: "Chitack", poc: "Vivek/Rohit", notes: "Automation duration run completed with failure." }), item("Automation - Scan", null, { owner: "Chitack", poc: "Vivek/Rohit" })], automationStatus: "In Progress" }),
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

export const cloneProjects = () => JSON.parse(JSON.stringify(initialProjects)) as Project[];

export const normalizeProjects = (projects: Project[]) => projects.map((project) => ({
  ...project,
  execution: project.execution.map((entry) => ({
    ...entry,
    completion: entry.completion !== null && entry.completion > 1 ? entry.completion / 100 : entry.completion,
  })),
}));
