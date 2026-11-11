import { z } from "zod";
import type { RequestHandler } from "express";
import { readWorkspace, writeWorkspace } from "../db";
import type { WorkspaceData } from "../../shared/api";

const idSchema = z.string().trim().min(1).max(120);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sprintStatusSchema = z.enum(["Not Started", "In Progress", "Completed", "Blocked"]);
const projectStatusSchema = z.enum(["Completed", "In Progress", "Yet to Start", "Blocked", "Failed", "Deferred"]);
const stageStatusSchema = z.enum(["Completed", "In Progress", "Yet to Start", "Blocked", "Failed", "Deferred", "Complete", "Not Yet Started", "N/A"]);
const recordStatusSchema = z.enum(["Open", "Blocked", "Monitoring", "Resolved", "Deferred"]);
const defectStatusSchema = z.enum(["Open", "In Progress", "Development", "Fixed / In Verification", "Closed"]);
const defectSeveritySchema = z.enum(["P1", "P2", "P3"]);
const reportTextSchema = z.string().max(2000);

const projectSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  status: projectStatusSchema,
  owner: z.string().max(200),
  lastUpdated: z.string().max(80),
  stages: z.array(z.object({ id: idSchema, name: z.string().trim().min(1).max(200), status: stageStatusSchema, isCustom: z.boolean().optional() })),
  blockers: z.array(z.object({ id: idSchema, description: z.string().max(2000), impact: z.number().min(0).max(100), currentStatus: z.string().max(100), notes: z.string().max(10000) })),
  execution: z.array(z.object({
    id: idSchema,
    area: z.string().trim().min(1).max(200),
    completion: z.number().min(0).max(1).nullable(),
    bugs: z.array(z.string().max(200)),
    notes: z.string().max(10000),
    owner: z.string().max(200),
    poc: z.string().max(200),
    totalTestCases: z.number().min(0).nullable().optional(),
    testCasesExecuted: z.number().min(0).nullable().optional(),
    testCasesPassed: z.number().min(0).nullable().optional(),
    blocked: z.number().min(0).nullable().optional(),
    blockedReason: z.string().max(2000).optional(),
    etaToUnblock: z.string().max(100).optional(),
    progressUpdateToUnblock: z.string().max(10000).optional(),
    toDo: z.number().min(0).nullable().optional(),
    failed: z.number().min(0).nullable().optional(),
    exploratoryTests: z.string().max(10000).optional(),
  })),
  risks: z.array(z.object({ id: idSchema, description: z.string().max(2000), notes: z.string().max(10000), status: recordStatusSchema, owner: z.string().max(200) })),
  notes: z.string().max(20000),
  report: z.object({
    sprintStartDate: z.string().max(40),
    sprintEndDate: z.string().max(40),
    testEnvironment: reportTextSchema,
    firmwareVersion: z.string().max(200),
    solutionVersion: z.string().max(200),
    targetedDevices: reportTextSchema,
  }).optional(),
  preparation: z.array(z.object({
    id: idSchema,
    name: z.string().trim().min(1).max(200),
    status: stageStatusSchema,
    eta: z.string().max(100),
    blockedReason: z.string().max(2000),
  })).optional(),
  defects: z.array(z.object({
    id: idSchema,
    title: z.string().max(2000),
    impactedTestCases: z.string().max(2000),
    status: defectStatusSchema,
    severity: defectSeveritySchema,
    comments: z.string().max(10000),
    owner: z.string().max(200),
    poc: z.string().max(200),
    link: z.string().max(2000),
  })).optional(),
  validatedDefects: z.array(z.string().max(200)).optional(),
  additionalNotes: z.string().max(20000).optional(),
  functionalityStatus: stageStatusSchema,
  nonFunctionalityStatus: stageStatusSchema,
  automationStatus: stageStatusSchema,
});

const sprintSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  startDate: dateSchema,
  endDate: dateSchema,
  status: sprintStatusSchema,
  projectIds: z.array(idSchema),
});

const dailySnapshotSchema = z.object({
  sprintId: idSchema,
  sprintName: z.string().max(200),
  sprintStartDate: dateSchema,
  sprintEndDate: dateSchema,
  sprintStatus: sprintStatusSchema,
  date: dateSchema,
  capturedAt: z.string().datetime(),
  projects: z.array(projectSchema),
});

const workspaceDataSchema = z.object({
  workspace: z.object({ name: z.string().trim().min(1).max(100) }),
  projects: z.array(projectSchema).max(1000),
  sprints: z.array(sprintSchema).max(500),
  dailySnapshots: z.record(z.string(), dailySnapshotSchema),
}).superRefine((data, context) => {
  const projectIds = new Set(data.projects.map((project) => project.id));
  const sprintIds = new Set(data.sprints.map((sprint) => sprint.id));
  if (projectIds.size !== data.projects.length) {
    context.addIssue({ code: "custom", message: "Project IDs must be unique." });
  }
  if (sprintIds.size !== data.sprints.length) {
    context.addIssue({ code: "custom", message: "Sprint IDs must be unique." });
  }
  for (const sprint of data.sprints) {
    if (sprint.startDate > sprint.endDate) {
      context.addIssue({ code: "custom", message: "Sprint end dates must be on or after start dates." });
    }
    if (new Set(sprint.projectIds).size !== sprint.projectIds.length || sprint.projectIds.some((id) => !projectIds.has(id))) {
      context.addIssue({ code: "custom", message: "Sprint project assignments must be unique and reference existing projects." });
    }
  }
  for (const [key, snapshot] of Object.entries(data.dailySnapshots)) {
    if (key !== `${snapshot.sprintId}:${snapshot.date}` || !sprintIds.has(snapshot.sprintId)) {
      context.addIssue({ code: "custom", message: "Each daily snapshot must match an existing sprint and its date key." });
    }
  }
});

export const getWorkspace: RequestHandler = (_req, res) => {
  res.json(readWorkspace());
};

export const putWorkspace: RequestHandler = (req, res) => {
  const result = workspaceDataSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid workspace data", details: result.error.issues });
    return;
  }

  try {
    writeWorkspace(result.data as WorkspaceData);
    res.json({ saved: true });
  } catch {
    res.status(400).json({ error: "Workspace data could not be saved." });
  }
};
