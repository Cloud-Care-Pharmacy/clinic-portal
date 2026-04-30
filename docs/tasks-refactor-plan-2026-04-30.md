# Tasks Refactor Plan — 2026-04-30

## Audit summary

The current task section is functional-looking but not cleanly aligned with the project guidelines or the documented backend contract.

### Current frontend surfaces

- `/tasks` work queue page: `src/app/(dashboard)/tasks/page.tsx` + `TasksClient.tsx`.
- Patient task page/tab: `src/app/(dashboard)/patients/[id]/tasks/page.tsx`, `TasksPageClient.tsx`, and `components/tabs/TasksTab.tsx`.
- Shared task UI: `src/components/tasks/TaskTable.tsx`, `TaskDetailSheet.tsx`, `NewTaskSheet.tsx`, `TaskCallWorkflow.tsx`, `PatientTasksOverviewCard.tsx`, `task-format.ts`.
- Task data hooks: `src/lib/hooks/use-tasks.ts`.
- Server API client methods: `src/lib/api.ts`.
- Task types: `src/types/index.ts`.

### Current task API usage

The frontend currently expects these backend paths through `/api/proxy/*`:

- `GET /api/tasks`
- `GET /api/tasks/summary`
- `GET /api/tasks/{taskId}`
- `POST /api/tasks`
- `PATCH /api/tasks/{taskId}`
- `POST /api/tasks/{taskId}/complete`
- `POST /api/tasks/bulk-claim`
- `GET /api/patients/{patientId}/tasks`

### Backend contract status

The FastMeds OpenAPI spec fetched on 2026-04-30 does not contain task routes. Because the spec states that every implemented route is documented and parity-tested, the task section must be treated as depending on an undocumented/unconfirmed backend API until prescription-gateway publishes the task endpoints.

## Issues found

1. The task hooks silently return an empty success response for `404`, `500`, `501`, `502`, `503`, and `504`, which makes missing/broken task APIs look like an empty queue.
2. The work queue uses `DataGridPro` and pinned columns, but the project guideline says to use `@mui/x-data-grid` DataGrid.
3. `MuiThemeProvider` globally overrides `MuiDataGrid`, which conflicts with the guideline to style DataGrid instances via shared `sx`.
4. The top-level queue does client-side assignment filtering after fetching only 50 tasks, so unassigned/my-task views can be incomplete if the backend returns a mixed first page.
5. Queue counts are computed from the first 200 list records rather than the summary endpoint or stable server totals.
6. `useCompleteTask()` uses `PATCH /api/tasks/{id}` while the server `ApiClient` has `POST /api/tasks/{id}/complete`.
7. Task detail cancellation closes the sheet before the mutation succeeds.
8. The task call workflow claims Aircall behavior but only starts a `tel:` URL; there is no true Aircall integration or persisted draft saving.
9. `TaskQueueTabs` and `TaskSummaryStrip` are unused task components.
10. The global new-task flow depends on a default entity ID. If it is missing, patient search cannot work.

## Target architecture

### API contract to confirm with backend

The task section should be rebuilt around a published task API with these minimum capabilities:

- List tasks with server-side filters for status, priority, task type, assigned user, assigned role, unassigned, patient, search, sort, limit, and offset.
- Return stable pagination totals and optional summary counts for queue presets.
- Get task detail with audit/events.
- Create manual tasks.
- Update task status, assignment, priority, due date, and note.
- Bulk-claim and claim-and-start tasks with partial-success results.
- Complete/cancel task with actor/audit event.

### Frontend refactor principles

- Server Components fetch initial data with `ApiClient`; Client Components use TanStack Query hooks via `/api/proxy/` only.
- Do not hide missing backend APIs as empty data.
- Keep table rendering in `TaskTable`; keep workflow orchestration out of the table.
- Use `@mui/x-data-grid` DataGrid, shared `dataGridSx`, and no pinned-column Pro features.
- Keep forms on React Hook Form + Zod v4 manual `safeParse()`.
- Use design-system tokens, shared `StatusBadge`, `EmptyState`, `FilterBar`, `AppSheet`, and skeleton-shaped loading states.
- Avoid false product claims; label the current phone flow as browser dialer until Aircall integration exists.

### Meaningful component boundaries

- `TasksClient` owns queue state and workflow orchestration only. Until the backend publishes assignment filters, it uses an all-pages task query so local preset filtering does not hide tasks outside the first page.
- `TaskQueuePresetBar` owns the preset buttons and preset counts.
- `TaskQueueBulkActions` owns selected-row claim/clear controls.
- `TaskTable` owns table composition, filters, columns, and empty states.
- `TaskActionsCell` owns row-level task actions.
- `TaskAssigneeCell` owns assignee display and shared assignment labels.
- `TaskDetailSheet`, `NewTaskSheet`, and `TaskCallWorkflow` each own one user workflow.

## Implementation phases

### Phase 1 — Stabilize and align dependencies

- Replace `DataGridPro` usage in `TaskTable` with community `DataGrid`.
- Remove pinned-column config and Pro-specific comments/styles.
- Remove `@mui/x-data-grid-pro` dependency.
- Remove global `MuiDataGrid` theme overrides and keep DataGrid styling in `dataGridSx`.
- Stop treating server errors as empty task lists; reserve empty fallbacks only for an explicitly unavailable `404`/`501` feature if needed.

### Phase 2 — Clean API layer

- Centralize task query-string building and error parsing.
- Align `useCompleteTask()` with the server `ApiClient` complete endpoint or remove the duplicate complete path if backend confirms `PATCH` is canonical.
- Add explicit task endpoint-unavailable messaging for missing backend.
- Add task API notes to the handoff/request docs once the backend contract is confirmed.

### Phase 3 — Refactor queue state and presets

- Replace the temporary all-pages local assignment filtering with server-backed query state.
- Add an `assignment` query concept for `mine`, `unassigned`, and role queues once supported by backend.
- Use `useTaskSummary()` or backend totals for preset counts instead of counting an arbitrary first page.
- Keep selected rows scoped to visible active unassigned tasks.

### Phase 4 — Refactor workflows

- Split work-queue orchestration from `TasksClient` into focused components/hooks.
- Rename the current call flow to browser dialer/manual outcome flow unless real Aircall APIs are added.
- Persist draft/outcome notes only when the backend supports draft writes; otherwise remove "every keystroke saves" copy.
- Await cancel/complete mutation success before closing sheets.

### Phase 5 — Forms and patient task surfaces

- Add unsaved-change confirmation for `NewTaskSheet` before closing dirty forms.
- Improve global patient search fallback when no default entity ID is configured.
- Keep patient task tab and top-level queue sharing the same table and task action primitives.

### Phase 6 — Validation

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build` when the task API contract is stable or the backend mock is available.
