# QALens — DSR Operations

QALens is a sprint and project reporting workspace for QA teams. It lets you organize sprints, track project execution, manage blockers and risks, and generate daily sprint pulse reports.

## Features

- Create sprints and assign projects to them.
- Track project stages, execution progress, bugs, owners, blockers, risks, and notes.
- Review project and sprint status from the workspace.
- Export sprint reports as PDF or PNG.
- Automatically save workspace data and daily report snapshots in the browser's `localStorage`.

> Data is currently stored only in the same browser profile and origin. It is not backed up to a server or synchronized across devices.

## Requirements

- Node.js
- pnpm

## Getting started

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite to use the app.

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server. |
| `pnpm build` | Build the client and server. |
| `pnpm start` | Start the production server after building. |
| `pnpm typecheck` | Run TypeScript validation. |
| `pnpm test` | Run the Vitest test suite. |
