import { describe, expect, it } from "vitest";
import { projectExecutionStatus, sprintExecutionStatus, sprintExecutionCategories, type Project, type StageStatus } from "./dsr-data";

const projectWithStatuses = (...statuses: StageStatus[]) => ({
  stages: sprintExecutionCategories.map((name, index) => ({ id: String(index), name, status: statuses[index] })),
} as Project);

describe("execution status derivation", () => {
  it("uses execution stages for each project's overall status", () => {
    expect(projectExecutionStatus(projectWithStatuses("Completed", "Complete", "Completed", "Completed"))).toBe("Completed");
    expect(projectExecutionStatus(projectWithStatuses("Yet to Start", "Failed", "Yet to Start", "Yet to Start"))).toBe("Blocked");
    expect(projectExecutionStatus(projectWithStatuses("Yet to Start", "Not Yet Started", "N/A", "Yet to Start"))).toBe("Not Started");
    expect(projectExecutionStatus(projectWithStatuses("Completed", "In Progress", "TBD", "Yet to Start"))).toBe("In Progress");
  });

  it("summarizes sprint status from its project execution statuses", () => {
    expect(sprintExecutionStatus([])).toBe("Not Started");
    expect(sprintExecutionStatus([projectWithStatuses("Yet to Start", "Yet to Start", "Yet to Start", "Yet to Start")])).toBe("Not Started");
    expect(sprintExecutionStatus([projectWithStatuses("Completed", "Completed", "Completed", "Completed")])).toBe("Completed");
    expect(sprintExecutionStatus([
      projectWithStatuses("Yet to Start", "Yet to Start", "Yet to Start", "Yet to Start"),
      projectWithStatuses("Completed", "In Progress", "TBD", "Yet to Start"),
    ])).toBe("In Progress");
    expect(sprintExecutionStatus([
      projectWithStatuses("Yet to Start", "Yet to Start", "Yet to Start", "Yet to Start"),
      projectWithStatuses("Yet to Start", "Failed", "Yet to Start", "Yet to Start"),
    ])).toBe("Blocked");
  });
});
