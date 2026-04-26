# Patient Portal Follow-up TODOs

_Last updated: 2026-04-26_

This file expands the requested items into actionable tasks that another AI/coding agent can pick up later. Follow the project guidelines in `.github/copilot-instructions.md`, the Next.js/App Router instructions, data-fetching skill, forms instructions, and the design system in `.github/design/` before implementing UI changes.

## Recommended implementation order

1. Unify sheet/sidebar styling first, so every later feature reuses one consistent pattern.
2. Fix patient profile data loading and tab navigation performance.
3. Wire overview cards/rows to correct actions and deep links.
4. Add document detail/action sidebar.
5. Add editable note sidebar.
6. Add clinical red-flag approval flow.
7. Replace dashboard mock data with real API-backed data.
8. Connect the main consultations section fully to the backend API.

---

## 1. Patient profile feels slow: App Router preloading and faster tab movement

### Status

Done

### Problem

Opening a patient profile and moving between patient tabs can feel slow. Current patient profile tabs are implemented as App Router child routes, but the tab navigation uses buttons with `router.push(...)`, which does not get the same automatic route prefetch benefits as `Link`. The patient shell also fetches data in multiple client components:

- `src/app/(dashboard)/patients/[id]/PatientLayoutClient.tsx` fetches patient, latest clinical data, counts, and prescriptions.
- `src/app/(dashboard)/patients/[id]/components/PatientHeader.tsx` renders `PatientStatStrip`.
- `PatientStatStrip` fetches consultations, prescriptions, and latest clinical data again.
- `src/app/(dashboard)/patients/[id]/page.tsx` fetches patient again for the overview tab.
- `OverviewTab` fetches consultations, prescriptions, notes, and latest clinical data again.

React Query can dedupe/cache some of this, but the current structure still causes repeated subscriptions, repeated loading states, and possible invalidation-driven header refreshes.

### Best-practice target

Use App Router for the route shell and TanStack Query for client cache, with explicit prefetching:

- Use Server Components for route boundaries where possible.
- Fetch critical shell data early and in parallel.
- Use `Link` navigation for tabs so Next.js can prefetch route code/data.
- Prefetch tab data on hover/focus and optionally during idle time after the patient shell loads.
- Keep the patient header mounted across tab route changes.
- Avoid duplicate network requests and broad query invalidations.

### Tasks

- [ ] Convert patient tab navigation in `PatientLayoutClient` from `<button onClick={router.push}>` to `next/link` links styled as pills.
  - Keep `scroll={false}` behavior if needed.
  - Rely on default Next.js prefetch for links in/near viewport.
  - Keep accessibility: active tab should expose `aria-current="page"` or equivalent.
- [ ] Add patient-tab query prefetching using TanStack Query.
  - Create a helper such as `prefetchPatientTab(queryClient, patientId, tab)` in `src/lib/hooks/` or a patient-specific utility.
  - On tab hover/focus, prefetch the data required by that tab:
    - Overview: consultations, prescriptions, notes, latest clinical data.
    - Consultations: consultations.
    - Prescriptions: prescriptions.
    - Documents: documents.
    - Clinical: clinical data list and/or latest clinical data.
    - Notes: patient notes.
    - Activity: patient activity.
  - After the patient header/shell is interactive, use an idle callback or a guarded effect to prefetch likely tabs without blocking initial render.
- [ ] Consider React Query hydration for patient shell data.
  - Add a server-side prefetch path using `ApiClient` and TanStack Query `dehydrate`/`HydrationBoundary` if the page should load with cached patient/header data immediately.
  - Fetch independent patient profile data with `Promise.all()`.
  - Do not expose `API_SECRET` to client code; server fetches must use `ApiClient`, client fetches must use `/api/proxy/`.
- [ ] Keep the patient header and tab nav stable across tab changes.
  - Ensure the shared layout under `src/app/(dashboard)/patients/[id]/layout.tsx` remains the persistent shell.
  - Do not move header logic into individual tab pages.
- [ ] Remove duplicate patient fetch in `src/app/(dashboard)/patients/[id]/page.tsx`.
  - Either pass patient data from the shell/provider or read the cached query with `useQueryClient`/`usePatient` without triggering loading flashes.
- [ ] Review query keys and invalidations.
  - Mutations should invalidate the narrowest key possible: e.g. `['patient-documents', patientId]`, `['patient-notes', patientId]`, `['consultations', patientId]`, `['patient-counts', patientId]`.
  - Avoid invalidating all patient header dependencies on unrelated tab actions.
- [ ] Add loading UX at tab-content level only.
  - The patient header should not skeleton/flash when only the selected tab changes.
  - Use tab-specific skeletons and Suspense/streaming where server components are introduced.

### Acceptance criteria

- Moving between patient tabs does not reload or visually refresh the patient header summary.
- Tab route code is prefetched by App Router.
- Most tab data is prefetched before the user clicks, either on hover/focus or idle.
- React Query Devtools/network panel shows no duplicate patient/header requests on simple tab navigation.
- `npm run build`, `npm run lint`, and `npx tsc --noEmit` pass.

---

## 2. Overview tab: connect all links/rows to the right actions and sections

### Status

Done

### Problem

The overview tab shows cards for recent consultations, conditions, latest prescription, demographics, care team, and latest notes. Some actions work, some are incomplete, and list rows do not consistently open the relevant detail/sidebar.

Current examples:

- `Recent consultations` has a `View all` action but individual consultation rows are clickable-looking without an action.
- `Conditions` uses `Edit` and navigates to clinical, but should open the relevant clinical/medical section if possible.
- `Latest prescription` opens a prescription detail sheet, which is good.
- `Demographics` has `Edit` with an empty handler.
- `Latest notes` has `+ Add note`, but recent note rows do not open/edit the note.

### Tasks

- [ ] Audit every overview card action and row click.
- [ ] Define a deep-link convention using `searchParams`, for example:
  - `/patients/:id/consultations?selected=:consultationId`
  - `/patients/:id/prescriptions?selected=:prescriptionId`
  - `/patients/:id/documents?selected=:documentId`
  - `/patients/:id/clinical?selected=:clinicalRecordId&action=review`
  - `/patients/:id/notes?selected=:noteId`
  - `/patients/:id/notes?action=new`
  - `/patients/:id/documents?action=upload`
- [ ] Implement overview actions:
  - `View all` recent consultations -> consultations tab.
  - Consultation row click -> consultations tab with selected consultation sidebar open.
  - `Conditions Edit` -> clinical tab with latest clinical record/sidebar open if possible.
  - `Demographics Edit` -> open existing `PatientEditSheet` or route to profile/details edit action.
  - Latest note row click -> notes tab with selected note edit/view sidebar open.
  - `+ Add note` -> notes tab with add note sidebar open.
  - Care team entries -> if no detail page exists, make them non-clickable or document future destination.
- [ ] Update each target tab to read `searchParams` and open the appropriate sheet.
- [ ] Make clickable rows actual `<button>`/`Link` elements with accessible labels, focus states, and keyboard support.
- [ ] Keep URL state in sync when sidebars close by replacing/removing the query parameter without full reload.

### Acceptance criteria

- Every visible overview action either performs the right action or is intentionally non-clickable.
- Clicking a row opens the matching tab and the relevant sidebar/detail.
- Closing a sidebar cleans the URL query parameter.
- No dead `onAction={() => {}}` handlers remain in overview.

---

## 3. Documents tab: add a sidebar for status updates and document actions

### Status

Done

### Problem

Documents currently use a DataGrid plus row action menu. Verify/reject/delete are available via dropdown/dialogs, but there is no document detail sidebar where staff can review metadata, update status/category/expiry/description, download the file, verify, reject, or delete from one consistent place.

### Tasks

- [ ] Create a document detail/action sheet component, for example `DocumentDetailSheet` in `src/components/patients/` or `src/components/documents/`.
- [ ] Open the sheet when a document row is clicked.
- [ ] Move or mirror document actions into the sheet:
  - Download document.
  - Verify uploaded document.
  - Reject uploaded document with required reason.
  - Update editable metadata: category, description, expiry date, maybe status if backend supports it.
  - Delete document with confirmation.
- [ ] Reuse existing hooks in `src/lib/hooks/use-documents.ts`:
  - `useUpdateDocument(patientId)`
  - `useVerifyDocument(patientId)`
  - `useDeleteDocument(patientId)`
- [ ] Use React Hook Form + Zod manual `safeParse` for editable metadata if a form is added.
- [ ] Support deep link selection with `?selected=:documentId` and close cleanup.
- [ ] Keep upload flow working with `?action=upload`.
- [ ] Avoid duplicate confirmation UX: if actions are in the sheet, decide whether the row dropdown remains as quick actions or only opens the detail sheet.

### Acceptance criteria

- Row click opens document sidebar.
- Document status and metadata actions happen from the sidebar.
- Successful mutations update the table without refreshing unrelated patient header data.
- Verify/reject/delete still show toasts and handle errors.

---

## 4. Notes tab: make notes editable from a sidebar

### Problem

Notes can currently be added, pinned/unpinned, and deleted. Clicking a note does not open an editor, and `use-notes.ts` only has create/toggle-pin/delete support. Toggle pin currently sends a `PATCH` without a body, so the backend contract for general note edits needs confirming.

### Tasks

- [ ] Confirm backend API supports note update via `PATCH /patients/:patientId/notes/:noteId` with title/content/category/isPinned, or add support in `prescription-gateway` first.
- [ ] Add `updateNote` fetch helper and `useUpdateNote(patientId)` mutation to `src/lib/hooks/use-notes.ts`.
- [ ] Preserve pin behavior.
  - If the backend uses bodyless `PATCH` only for toggle pin, add a separate update endpoint/hook or extend payload carefully without breaking existing toggle behavior.
- [ ] Create a reusable `NoteSheet` that supports both add and edit modes.
  - For edit mode, prefill title, category, content, and pinned state from the selected note.
  - Use `SimpleEditor` for content.
  - Use React Hook Form + Zod manual `safeParse`.
- [ ] Update `NoteCard` so the card itself opens the edit sidebar.
  - Keep pin/delete icon buttons from triggering the card click.
  - Add keyboard support and clear labels.
- [ ] Support deep links:
  - `?action=new` opens add mode.
  - `?selected=:noteId` opens edit mode.
- [ ] Invalidate only `['patient-notes', patientId]` after note update.

### Acceptance criteria

- Clicking a note opens a right-side sheet with editable fields.
- Saving updates the note in the list and shows a success toast.
- Pin/delete controls still work independently.
- URL query state is cleaned when the sheet closes.

---

## 5. Clinical notes/red flags: approvable clinical review flow

### Problem

Red flags are currently computed locally from clinical data. Some review state exists in `MedicalHistoryTab` using `localStorage`, but this is not a real clinical approval workflow and is not persisted server-side. The patient layout red-flag alert has optional `onReview`, but no actual review action is wired.

### Tasks

- [ ] Define the backend contract for clinical review/approval.
  - Preferred: persist review status server-side with fields like `reviewStatus`, `reviewedBy`, `reviewedAt`, `reviewNotes`, and `redFlagTriggers`.
  - If backend does not support this yet, add a TODO/dependency for `prescription-gateway` before UI implementation.
- [ ] Add frontend types in `src/types/index.ts` once backend fields are confirmed.
- [ ] Add hooks/mutations in `src/lib/hooks/use-patients.ts`, for example `useApproveClinicalRecord(patientId)`.
- [ ] Update `ClinicalHistoryTab` / `ClinicalDetailSheet` so a clinical record can be opened in a side sheet and approved.
- [ ] Connect `RedFlagAlert` `Review now` action:
  - Navigate to `/patients/:id/clinical?selected=:latestClinicalRecordId&action=review`.
  - Open clinical detail sheet automatically.
- [ ] Replace localStorage-only reviewed state with persisted status.
  - LocalStorage may be used only for temporary UI dismissal, not clinical approval.
- [ ] Show approval state in the clinical tab table and patient red-flag summary.
- [ ] Add audit-friendly UI details:
  - Who approved.
  - When approved.
  - Optional approval note.
  - Trigger list that was approved.

### Acceptance criteria

- Red-flag clinical record can be opened from alert or clinical tab.
- Doctor/admin can approve it from a sidebar.
- Approval persists after refresh and across sessions.
- Approved red flags no longer appear as unresolved alerts, but remain visible in history.

---

## 6. All sidebars/sheets need the same style and motion

### Status

Done

### Problem

The app uses several sheets with slightly different width, padding, overflow, footer, and action styles. This makes the UI feel inconsistent.

Examples to normalize:

- `NewConsultationSheet`
- `ConsultationDetailSheet`
- `PrescriptionDetailSheet`
- `PatientEditSheet`
- `AddNoteSheet`
- `IntakeFormSheet` / clinical detail sheets
- Future `DocumentDetailSheet` and edit `NoteSheet`

### Tasks

- [ ] Review `.github/design/` before making UI changes.
- [ ] Create a shared sheet layout component, for example `AppSheet` or `ActionSheetLayout`, outside `components/ui/` so shadcn primitives remain untouched.
- [ ] Standardize:
  - Right-side placement.
  - Width: mobile full width, desktop consistent min/max width.
  - Header padding and title/description styles.
  - Scroll body behavior: fixed header/footer, scrollable body.
  - Footer/action bar with consistent border/background.
  - Close button position.
  - Motion duration/easing using existing `SheetContent` Base UI data attributes.
- [ ] Do not use `asChild`; shadcn/ui v4 uses `@base-ui/react` and `render` prop patterns.
- [ ] Migrate existing sheets gradually to the shared layout.
- [ ] Keep destructive actions visually consistent and confirmation-protected.

### Acceptance criteria

- All right-side sheets use the same dimensions and motion behavior.
- Header/body/footer spacing is visually consistent.
- Existing sheet functionality remains unchanged after migration.
- No edits are made directly to generated primitives in `src/components/ui/` unless absolutely necessary.

---

## 7. Patient header summary refreshes when tabs open: stop unnecessary refetch/re-render

### Status

Done

### Problem

The patient header summary appears to refresh when opening some tabs. This should not happen for basic tab navigation. The shared layout should stay mounted, and the header should use stable cached data.

### Likely causes to investigate

- Duplicate queries between shell, stat strip, overview, and tabs.
- Broad invalidations such as `invalidateQueries({ queryKey: ['patient-counts'] })` or `invalidateQueries({ queryKey: ['consultations'] })` affecting header queries.
- Tab content using the same queries as the header but showing loading states after invalidation.
- Header summary data computed in components that re-render on route changes.
- Possible route/link behavior causing layout remounts if navigation does not stay inside the same dynamic patient layout.

### Tasks

- [ ] Verify with React Query Devtools and browser Network panel which request fires when each tab opens.
- [ ] Keep `PatientHeader` and `PatientStatStrip` mounted only in `src/app/(dashboard)/patients/[id]/layout.tsx` / `PatientLayoutClient`.
- [ ] Consolidate header summary data fetching.
  - Option A: create `usePatientSummary(patientId)` that fetches exactly what the header needs.
  - Option B: pass summary data from a hydrated patient shell query.
- [ ] Remove duplicate query ownership where possible.
  - Overview and tabs can read existing cached data with the same keys, but should not cause header skeleton flashes.
- [ ] Tune React Query invalidation after mutations.
  - Use exact patient-scoped keys.
  - Consider optimistic cache updates for counts/status where safe.
- [ ] Use `placeholderData`/`keepPreviousData` patterns if a query can refetch but should not blank the UI.
- [ ] Add lightweight render logging temporarily during debugging, then remove before final commit.

### Acceptance criteria

- Header does not skeleton or visually refresh when moving between tabs.
- Header summary only refetches after relevant mutations or explicit refresh.
- Mutating notes does not refetch prescriptions; mutating documents does not refetch consultations; etc.

---

## 8. Dashboard data needs to use real data

### Problem

The dashboard currently mixes real and hardcoded data:

- Pending consultations count uses `useConsultations()`.
- Total Patients is hardcoded as `127`.
- Active Prescriptions is hardcoded as `43`.
- New This Week is hardcoded as `5`.
- `Overview` chart uses static monthly data.
- `RecentActivity` uses static names/actions.

### Tasks

- [ ] Define the dashboard API strategy.
  - Preferred: backend endpoint like `/api/dashboard/summary` returning all dashboard stats and chart/activity data in one request.
  - Alternative MVP: compose existing patient, consultation, prescription, document, and activity endpoints carefully.
- [ ] Add types in `src/types/index.ts`, for example `DashboardSummaryResponse`.
- [ ] Add `ApiClient` server method and/or TanStack hook, for example `useDashboardSummary()`.
- [ ] Replace hardcoded stat cards with real values:
  - Total patients.
  - Pending/scheduled consultations.
  - Active prescriptions.
  - New patients this week.
  - Any red-flag/needs-review count if useful.
- [ ] Replace `Overview` static chart data with backend/derived monthly totals.
- [ ] Replace `RecentActivity` static array with real activity events.
- [ ] Make dashboard page a Server Component if possible and pass initial data to smaller client chart/table components.
  - If client-side dashboard remains necessary, fetch through `/api/proxy/` only.
- [ ] Add loading, empty, and error states.
- [ ] Ensure dashboard queries do not request every patient record unnecessarily if a summary endpoint can be added.

### Acceptance criteria

- No hardcoded production dashboard counts remain.
- Chart and activity list use real backend data or a clearly documented temporary endpoint.
- Dashboard load uses minimal requests and avoids waterfalls.
- Empty/error/loading states are implemented.

---

## 9. Main consultations section: connect fully to API for update/add consultations

### Problem

The main consultations section is partially connected but inconsistent:

- Patient-specific consultations use `/api/proxy/patients/:patientId/consultations?limit=50`.
- Creating/updating/deleting uses `/api/proxy/consultations` and `/api/proxy/consultations/:id`.
- Main all-consultations list currently uses local `/api/consultations`, backed by `src/lib/consultations-store.ts` in-memory mock data.
- Existing local routes under `src/app/api/consultations/` are not the intended final backend integration if `prescription-gateway` supports consultations.

### Tasks

- [ ] Confirm backend `prescription-gateway` consultation endpoints:
  - `GET /api/consultations` for all consultations.
  - `GET /api/patients/:patientId/consultations` for patient-specific consultations.
  - `POST /api/consultations` for create.
  - `PATCH /api/consultations/:id` for update/status transitions.
  - `DELETE /api/consultations/:id` if delete is supported.
- [ ] Sync frontend types in `src/types/index.ts` to backend response exactly.
- [ ] Update `src/lib/hooks/use-consultations.ts` so all list/create/update/delete calls go through `/api/proxy/`, not local `/api/consultations`.
  - Main list should call `/api/proxy/consultations`.
  - Patient list should continue using `/api/proxy/patients/:patientId/consultations` if that is the backend route.
- [ ] Remove or deprecate local in-memory consultation routes/store once backend integration works:
  - `src/lib/consultations-store.ts`
  - `src/app/api/consultations/route.ts`
  - `src/app/api/consultations/[consultationId]/route.ts`
- [ ] Verify `NewConsultationSheet` creates records against real API.
  - Remove fallback generated patient id for main app if backend requires a real patient.
  - In main consultations page, patient selection may be needed when scheduling without a default patient.
- [ ] Add patient selector/autocomplete to `NewConsultationSheet` when opened from `/consultations`.
  - Use real patient search/list endpoint.
  - Do not allow creating a consultation with a fake/generated patient id.
- [ ] Verify update actions:
  - Edit consultation details.
  - Complete with outcome.
  - Cancel.
  - Mark no-show.
  - Delete if supported.
- [ ] Ensure cache invalidation updates:
  - Main consultations page.
  - Patient consultations tab.
  - Patient header stat strip.
  - Patient activity.
  - Dashboard pending consultations.
- [ ] Add API error handling with backend error messages.

### Acceptance criteria

- `/consultations` lists real backend consultations.
- Scheduling from `/consultations` requires/selects a real patient and creates a real backend consultation.
- Scheduling from a patient profile pre-fills the patient and creates a real backend consultation.
- Updating consultation status/details persists after refresh.
- Local in-memory mock consultation source is removed or clearly marked dev-only.

---

## Cross-cutting verification checklist

Run these after implementing each related set of changes:

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] Manual: open a patient profile and switch through every tab.
- [ ] Manual: confirm patient header does not refresh on tab navigation.
- [ ] Manual: click every overview action and row.
- [ ] Manual: open/create/edit notes via sidebar.
- [ ] Manual: open/update/verify/reject documents via sidebar.
- [ ] Manual: open/approve clinical red-flag record via sidebar.
- [ ] Manual: dashboard stats/chart/activity use real data.
- [ ] Manual: `/consultations` list/create/update uses backend API and persists after refresh.

## Notes for future AI agent

- Do not use `asChild`; this project uses shadcn/ui v4 with `@base-ui/react`.
- Use `render` props or native wrappers for custom trigger rendering.
- Client components must fetch through `/api/proxy/`; server components must use `ApiClient`.
- Keep `API_SECRET` server-only.
- Use MUI DataGrid for tabular data and style with `sx={dataGridSx}`.
- Use React Hook Form + Zod v4 with manual `safeParse`; do not add `@hookform/resolvers`.
- Prefer narrow query invalidation and cache updates to avoid patient header refreshes.
