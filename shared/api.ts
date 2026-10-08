import type { DailySnapshot, Project, Sprint, Workspace } from "../client/lib/dsr-data";

export interface WorkspaceData {
  workspace: Workspace;
  projects: Project[];
  sprints: Sprint[];
  dailySnapshots: Record<string, DailySnapshot>;
}

export interface DemoResponse {
  message: string;
}
