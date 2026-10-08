# QALens — DSR Operations

QALens is a single-user sprint and project reporting workspace for QA teams. Create sprints and projects from a fresh workspace, track execution, and generate daily sprint pulse reports.

## Features

- Create projects and sprints, assign projects to sprints, and update sprint status.
- Track project stages, execution progress, bugs, owners, blockers, risks, and notes.
- Review project and sprint status and export sprint reports as PDF or PNG.
- Save the workspace name, project data, sprint assignments, and daily report snapshots in SQLite.

The app starts with an empty workspace named **My Workspace**. No example sprints or projects are preloaded. Blockers and risks can be managed within project details; the cross-project Blockers and Risks pages are placeholders.

## Stack

- React, TypeScript, and Vite for the client.
- Express for the API and production server.
- SQLite through Node.js's built-in `node:sqlite` module.
- Zod validation for workspace updates.

The built-in SQLite module is experimental in Node.js 22. Use a recent Node.js 22 release (22.5 or later) to run the app.

## Data and persistence

The database file defaults to `.data/dsr.sqlite` in the project directory. The directory is created automatically and ignored by Git. The workspace, project records, sprint records and memberships, and daily snapshots are stored in SQLite. Project details, including their stages, blockers, execution items, and risks, are stored with each project record.

Set `DSR_DATABASE_PATH` to choose a different database file location. For example:

```bash
DSR_DATABASE_PATH=/path/to/persistent-storage/dsr.sqlite pnpm start
```

Keep the database file on persistent storage and include it in your backup plan. Deployments with an ephemeral filesystem will lose database contents when that filesystem is reset.

## API

- `GET /api/workspace` returns the workspace, projects, sprints, and daily snapshots.
- `PUT /api/workspace` validates and saves the complete workspace state in a SQLite transaction.

## Getting started

Requirements: Node.js 22.5 or later and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite to use the app. For production, build and start the Express server:

```bash
pnpm build
pnpm start
```

The production server uses `PORT` when set, or port `3000` by default.

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server and Express API. |
| `pnpm build` | Build the client and server. |
| `pnpm start` | Start the production server after building. |
| `pnpm typecheck` | Run TypeScript validation. |
| `pnpm test` | Run the Vitest test suite. |

## Security note

Authentication is not implemented. Anyone who can reach the app can read and change the workspace, so do not expose it publicly without adding authentication or restricting network access.
