# QALens — DSR Operations

QALens is a shared sprint and project reporting workspace for QA teams. Create sprints and projects from a fresh workspace, track execution, and generate daily sprint pulse reports.

## Features

- Create sprints with a date range, then create projects within a sprint and view their execution overview.
- Update project stages, preparation items, execution metrics, defects, risk summaries, and notes.
- Review sprint pulse reports by sprint and date, and use the browser's print dialog to save them as PDF.
- Save the workspace name, project data, sprint assignments, and daily report snapshots in SQLite.

The app starts with an empty workspace named **My Workspace**. No example sprints or projects are preloaded. Create a sprint before adding a project. Removing a project from a sprint removes its assignment, not the project itself.

## Workspace pages

- **Sprints** (`/`): Create sprints and projects, and review execution and stage status.
- **Projects** (`/projects`): Search and filter projects, and open a project's DSR to update its details.
- **Reports** (`/reports`): Review a sprint's daily pulse and print it or save it as PDF.
- **Settings** (`/settings`): Change the workspace name.

Sprint and project execution statuses in the sprint overview and reports are derived from project execution stages; sprint status is not directly editable. The Projects page filters by the status set when a project was created, which does not automatically update when its stages change. Structured blocker and risk management is not currently available in the interface; project risk summaries can be edited as free text.

## Stack

- React, TypeScript, and Vite for the client.
- Express for the API and production server.
- SQLite through Node.js's built-in `node:sqlite` module.
- Zod validation for workspace updates.

The built-in SQLite module is experimental in Node.js 22. Use Node.js 22.13 or later in the Node 22 series to run SQLite without an experimental flag and satisfy Vite's requirements. The project configuration specifies Node.js 22.22.3 and pnpm 10.14.0.

## Data and persistence

The database file defaults to `.data/dsr.sqlite` in the project directory. The directory is created automatically and ignored by Git. The workspace, project records, sprint records and memberships, and daily snapshots are stored in SQLite. Project details, including their stages, blockers, execution items, and risks, are stored with each project record.

Set `DSR_DATABASE_PATH` to choose a different database file location. For example:

```bash
DSR_DATABASE_PATH=/path/to/persistent-storage/dsr.sqlite pnpm dev
```

Snapshots are captured for each sprint when the workspace opens and when project or sprint data changes. The current day's snapshot is refreshed rather than kept as a separate version for every edit; snapshots are not generated on a schedule while the workspace is closed. If no snapshot exists for a selected date, the report uses current project data and warns that the historical state is unavailable.

Keep the database file on persistent storage and include it in your backup plan. Deployments with an ephemeral filesystem will lose database contents when that filesystem is reset. The API saves the entire workspace at once, so changes from concurrent sessions can overwrite one another.

## API

- `GET /api/workspace` returns the workspace, projects, sprints, and daily snapshots.
- `PUT /api/workspace` validates and saves the complete workspace state in a SQLite transaction.

## Getting started

Requirements: Node.js 22.13 or later in the Node 22 series and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite to use the app. The development server serves the client and API together on port `8080` by default.

`pnpm build` builds the client and server. The configured `pnpm start` command currently fails during startup because the production server's catch-all route is incompatible with Express 5. This must be fixed before using the production server. Once fixed, the server is configured to use `PORT` when set, or port `3000` by default.

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server and Express API. |
| `pnpm build` | Build the client and server. |
| `pnpm start` | Start the built production server (currently blocked by the route issue above). |
| `pnpm typecheck` | Run TypeScript validation. |
| `pnpm test` | Run the Vitest test suite. |

## Security note

Authentication is not implemented. Anyone who can reach the app can read and change the workspace, so do not expose it publicly without adding authentication or restricting network access.
