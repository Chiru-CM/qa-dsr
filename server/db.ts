import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DailySnapshot, Project, Sprint, Workspace } from "../client/lib/dsr-data";
import type { WorkspaceData } from "../shared/api";

const databasePath = process.env.DSR_DATABASE_PATH ?? path.resolve(process.cwd(), ".data/dsr.sqlite");
mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS workspace (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    status TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sprint_projects (
    sprint_id TEXT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY (sprint_id, project_id)
  );

  CREATE TABLE IF NOT EXISTS daily_snapshots (
    sprint_id TEXT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (sprint_id, date)
  );

  INSERT OR IGNORE INTO workspace (id, name) VALUES (1, 'My Workspace');
`);

export function readWorkspace(): WorkspaceData {
  const workspaceRow = db.prepare("SELECT name FROM workspace WHERE id = 1").get() as { name: string };
  const projectRows = db.prepare("SELECT data FROM projects ORDER BY position").all() as { data: string }[];
  const sprintRows = db.prepare("SELECT id, name, start_date, end_date, status FROM sprints ORDER BY position").all() as {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: Sprint["status"];
  }[];
  const membershipRows = db.prepare("SELECT sprint_id, project_id FROM sprint_projects ORDER BY sprint_id, position").all() as {
    sprint_id: string;
    project_id: string;
  }[];
  const snapshotRows = db.prepare("SELECT sprint_id, date, data FROM daily_snapshots").all() as {
    sprint_id: string;
    date: string;
    data: string;
  }[];

  const projects = projectRows.map(({ data }) => JSON.parse(data) as Project);
  const projectIdsBySprint = new Map<string, string[]>();
  for (const row of membershipRows) {
    const ids = projectIdsBySprint.get(row.sprint_id) ?? [];
    ids.push(row.project_id);
    projectIdsBySprint.set(row.sprint_id, ids);
  }

  const sprints = sprintRows.map((row): Sprint => ({
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    projectIds: projectIdsBySprint.get(row.id) ?? [],
  }));

  const dailySnapshots: Record<string, DailySnapshot> = {};
  for (const row of snapshotRows) {
    dailySnapshots[`${row.sprint_id}:${row.date}`] = JSON.parse(row.data) as DailySnapshot;
  }

  const workspace: Workspace = { name: workspaceRow.name };
  return { workspace, projects, sprints, dailySnapshots };
}

export function writeWorkspace(value: WorkspaceData) {
  const transaction = db;
  transaction.exec("BEGIN IMMEDIATE");
  try {
    transaction.prepare("UPDATE workspace SET name = ? WHERE id = 1").run(value.workspace.name);
    transaction.exec("DELETE FROM daily_snapshots; DELETE FROM sprint_projects; DELETE FROM sprints; DELETE FROM projects;");

    const insertProject = transaction.prepare(
      "INSERT INTO projects (id, position, name, owner, status, last_updated, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    value.projects.forEach((project, position) => insertProject.run(
      project.id,
      position,
      project.name,
      project.owner,
      project.status,
      project.lastUpdated,
      JSON.stringify(project),
    ));

    const insertSprint = transaction.prepare(
      "INSERT INTO sprints (id, position, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertMembership = transaction.prepare(
      "INSERT INTO sprint_projects (sprint_id, project_id, position) VALUES (?, ?, ?)",
    );
    value.sprints.forEach((sprint, position) => {
      insertSprint.run(sprint.id, position, sprint.name, sprint.startDate, sprint.endDate, sprint.status);
      sprint.projectIds.forEach((projectId, membershipPosition) => {
        insertMembership.run(sprint.id, projectId, membershipPosition);
      });
    });

    const insertSnapshot = transaction.prepare(
      "INSERT INTO daily_snapshots (sprint_id, date, captured_at, data) VALUES (?, ?, ?, ?)",
    );
    Object.values(value.dailySnapshots).forEach((snapshot) => {
      insertSnapshot.run(snapshot.sprintId, snapshot.date, snapshot.capturedAt, JSON.stringify(snapshot));
    });

    transaction.exec("COMMIT");
  } catch (error) {
    transaction.exec("ROLLBACK");
    throw error;
  }
}
