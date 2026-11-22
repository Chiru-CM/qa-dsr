import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { WorkspaceData } from "../../shared/api";

describe("workspace API", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv("DSR_DATABASE_PATH", ":memory:");
    const { createServer } = await import("../index");
    server = createServer().listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Server did not start");
    baseUrl = `http://127.0.0.1:${address.port}/api/workspace`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    vi.unstubAllEnvs();
  });

  it("saves TBD statuses in projects and daily snapshots", async () => {
    const project: WorkspaceData["projects"][number] = {
      id: "project-1",
      name: "Project",
      status: "In Progress",
      owner: "",
      lastUpdated: "",
      stages: [{ id: "stage-1", name: "Exploratory", status: "TBD" }],
      blockers: [],
      execution: [],
      risks: [],
      notes: "",
      functionalityStatus: "TBD",
      nonFunctionalityStatus: "N/A",
      automationStatus: "N/A",
    };
    const data: WorkspaceData = {
      workspace: { name: "Test workspace" },
      projects: [project],
      sprints: [{ id: "sprint-1", name: "Sprint", startDate: "2026-11-02", endDate: "2026-11-25", status: "In Progress", projectIds: [project.id] }],
      dailySnapshots: {
        "sprint-1:2026-11-02": {
          sprintId: "sprint-1",
          sprintName: "Sprint",
          sprintStartDate: "2026-11-02",
          sprintEndDate: "2026-11-25",
          sprintStatus: "In Progress",
          date: "2026-11-02",
          capturedAt: "2026-11-02T12:00:00.000Z",
          projects: [project],
        },
      },
    };

    const response = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: true });

    const saved = await fetch(baseUrl).then((result) => result.json()) as WorkspaceData;
    expect(saved.projects[0].stages[0].status).toBe("TBD");
    expect(saved.projects[0].functionalityStatus).toBe("TBD");
    expect(saved.dailySnapshots["sprint-1:2026-11-02"].projects[0].stages[0].status).toBe("TBD");

    const invalid = structuredClone(data);
    invalid.projects[0].stages[0].status = "Invalid" as typeof project.stages[number]["status"];
    const invalidResponse = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalid),
    });
    expect(invalidResponse.status).toBe(400);
    expect(await fetch(baseUrl).then((result) => result.json())).toEqual(saved);
  });
});
