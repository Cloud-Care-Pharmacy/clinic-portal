# Plan: Consultations Section — Full Feature Build

## TL;DR

The consultations page is currently a stub with hardcoded mock data and no backend integration. This plan builds it into a fully functional consultation management feature using the same local API pattern as Notes (in-memory store) since there's no backend endpoint yet. It covers: listing with DataGrid, scheduling new consultations, viewing/completing consultations, patient-detail tab integration, dashboard stat wiring, and a calendar view powered by MUI X Scheduler.

## What Other Patient Management Systems Typically Include

Industry-standard consultation features in pharmacy/clinical patient management systems:

1. **Scheduling & Calendar** — Book consultations with date/time picker, assign doctor, link to patient. Often shows a calendar view (day/week/month) or an agenda list.
2. **Consultation Types** — Initial assessment, follow-up, prescription renewal, urgent/ad-hoc. Each type may have different required fields.
3. **Status Workflow** — Scheduled → In Progress → Completed / Cancelled / No-Show. Status transitions with timestamps.
4. **Clinical Notes & Outcomes** — Free-text or structured notes captured during or after consultation. Outcome/summary recorded on completion.
5. **Prescription Linkage** — Consultations can result in new/renewed prescriptions. Link between consultation record and prescription(s) issued.
6. **Duration Tracking** — Start/end time, actual vs scheduled duration for billing and analytics.
7. **Patient History View** — On a patient's profile, show all past and upcoming consultations in chronological order.
8. **Notifications/Reminders** — Upcoming consultation reminders (out of scope for MVP — requires notification infra).
9. **Filtering & Search** — Filter by date range, doctor, patient, type, status. Search by patient name.
10. **Role-Based Access** — Doctors can create/complete; staff can schedule; admins see all. Read-only for non-authorized roles.

## Recommended Scope (MVP)

**In scope:**

- Consultation listing page with MUI DataGrid (replaces current card layout)
- "New Consultation" sheet/dialog to schedule a consultation
- Consultation detail view (Sheet side panel on row click, like prescriptions page)
- "Complete Consultation" action with outcome notes
- Cancel consultation action
- Status workflow: `scheduled` → `completed` | `cancelled` | `no-show`
- Patient detail page: ConsultationsTab showing that patient's consultations
- Local API routes (`/api/consultations/`) backed by in-memory store (same pattern as Notes)
- TanStack Query hook (`useConsultations`)
- Dashboard stat card wiring (pending consultations count)
- Calendar view with MUI X Scheduler (day/week/month toggle)

**Out of scope (future):**

- Notifications/reminders
- Prescription linkage (can add later)
- Duration tracking / billing
- Backend API integration (will swap local store for proxy when backend is ready)

## Steps

### Phase 1: Types & Data Layer

1. **Update `Consultation` type** in `src/types/index.ts`
   - Add `status: "scheduled" | "completed" | "cancelled" | "no-show"` field
   - Add `duration?: number` (minutes, optional)
   - Add `createdAt: string`, `updatedAt: string`
   - Keep `completedAt` for when status transitions to `completed`
   - Add `ConsultationResponse` and `ConsultationsListResponse` wrapper types (same pattern as `PatientNotesResponse`)

2. **Create consultation store** at `src/lib/consultations-store.ts` — _parallel with step 3_
   - Mirror the pattern from `src/lib/notes-store.ts`
   - In-memory Map<string, Consultation>
   - Seed with ~4 mock consultations
   - Methods: `list(filters?)`, `getById(id)`, `getByPatientId(patientId)`, `create(data)`, `update(id, data)`, `delete(id)`

3. **Create API routes** at `src/app/api/consultations/` — _depends on steps 1-2_
   - `src/app/api/consultations/route.ts` — GET (list all, with optional `?patientId=` query param), POST (create)
   - `src/app/api/consultations/[consultationId]/route.ts` — GET (single), PATCH (update status/notes/outcome), DELETE
   - Auth via Clerk `auth()` — same as notes routes
   - Return `{ success, data }` envelope

4. **Create TanStack Query hook** at `src/lib/hooks/use-consultations.ts` — _depends on step 3_
   - `useConsultations(patientId?: string)` — list, optionally filtered by patient
   - `useConsultation(id: string)` — single consultation
   - `useCreateConsultation()` — mutation
   - `useUpdateConsultation()` — mutation (for complete/cancel/no-show)
   - `useDeleteConsultation()` — mutation
   - Query keys: `["consultations"]`, `["consultations", patientId]`, `["consultation", id]`
   - Invalidation: mutations invalidate `["consultations"]`

### Phase 2: Consultations Page (Main Listing)

5. **Create `ConsultationTable` component** at `src/components/consultations/ConsultationTable.tsx` — _depends on step 4_
   - MUI DataGrid following `PatientTable.tsx` patterns
   - Columns: Patient Name, Doctor, Type (badge), Status (StatusBadge), Scheduled Date, Actions
   - FilterBar: search input (patient/doctor name), status filter dropdown, type filter dropdown
   - Row click → opens detail Sheet (side panel)
   - Use `dataGridSx` from utils, same styling conventions
   - Empty state via `<EmptyState>` with "Schedule Consultation" action

6. **Create `NewConsultationSheet` component** at `src/components/consultations/NewConsultationSheet.tsx` — _parallel with step 5_
   - Sheet side panel (same dimensions as NotesTab AddNoteSheet)
   - React Hook Form + Zod v4 manual safeParse
   - Fields: Patient (Select from patients list via `usePatients`), Doctor (Select/Input), Type (Select: initial/follow-up/renewal), Date & Time (native datetime-local input), Notes (textarea)
   - On submit: `useCreateConsultation` mutation → toast success → close sheet → invalidate queries

7. **Create `ConsultationDetailSheet` component** at `src/components/consultations/ConsultationDetailSheet.tsx` — _parallel with step 6_
   - Sheet side panel showing full consultation details
   - If status is `scheduled`: show "Complete", "Cancel", "No-Show" action buttons
   - "Complete" prompts for outcome text (inline textarea that appears)
   - If status is `completed`: show outcome, completedAt timestamp
   - Read-only view of all fields

8. **Rewrite `consultations/page.tsx`** — _depends on steps 5-7_
   - Replace mock data with `useConsultations()` hook
   - `PageHeader` with "Schedule Consultation" button → opens `NewConsultationSheet`
   - `ConsultationTable` as main content
   - Remove yellow placeholder banner
   - Loading skeleton while fetching
   - `ErrorBoundary` wrapper around DataGrid

### Phase 3: Patient Detail Integration

9. **Rewrite `ConsultationsTab` in patient detail page** — _depends on step 4_
   - Replace `EmptyState` stub with real implementation
   - `useConsultations(patientId)` to fetch that patient's consultations
   - Simpler card-based layout (not full DataGrid — too heavy for a tab)
   - Show upcoming and past sections (similar to current mock layout but with real data)
   - "Schedule Consultation" button that opens `NewConsultationSheet` pre-filled with patient
   - Click a consultation card → opens `ConsultationDetailSheet`

### Phase 4: Dashboard Integration

10. **Wire dashboard stat** — _depends on step 4, parallel with Phase 3_
    - In `src/app/(dashboard)/dashboard/page.tsx`, replace hardcoded "Pending Consultations" stat
    - Fetch consultation count via `useConsultations()` and filter by `status === "scheduled"`
    - Or create a dedicated `useConsultationStats()` if preferred

### Phase 5: StatusBadge Extension

11. **Add consultation statuses to `StatusBadge`** — _parallel, can do anytime_
    - Add mappings for `scheduled` (blue), `completed` (green), `cancelled` (gray), `no-show` (red)
    - These may already partially overlap with existing status colors

### Phase 6: Calendar View (MUI X Scheduler)

12. **Install `@mui/x-scheduler`** — _depends on Phase 1 (data layer must exist)_
    - `npm install @mui/x-scheduler` — stays consistent with existing `@mui/x-data-grid` usage
    - Already have `MuiThemeProvider` set up so theme integration is straightforward

13. **Create `ConsultationCalendar` component** at `src/components/consultations/ConsultationCalendar.tsx`
    - MUI X Scheduler with day/week/month views
    - Map `Consultation` records to scheduler events: `scheduledAt` → start, `duration` → end (default 30min if missing)
    - Color-code events by type (initial=blue, follow-up=purple, renewal=green) or status
    - Click event → opens `ConsultationDetailSheet`
    - Style via `sx` prop using existing CSS variables — same approach as DataGrid

14. **Add calendar/table view toggle to `consultations/page.tsx`**
    - Toggle button group (table icon / calendar icon) in the `PageHeader` actions area
    - Default to table view (DataGrid), toggle to calendar view
    - Both views share the same `useConsultations()` data and `NewConsultationSheet`/`ConsultationDetailSheet`
    - Persist view preference in `localStorage`

## Relevant Files

### Modify

- `src/types/index.ts` — Extend `Consultation` type, add response wrapper types
- `src/app/(dashboard)/consultations/page.tsx` — Full rewrite from mock to real, add calendar/table toggle
- `src/app/(dashboard)/patients/[id]/page.tsx` — Rewrite `ConsultationsTab` function
- `src/components/shared/StatusBadge.tsx` — Add consultation status colors
- `src/app/(dashboard)/dashboard/page.tsx` — Wire pending consultations stat

### Create

- `src/lib/consultations-store.ts` — In-memory store (reference: `src/lib/notes-store.ts`)
- `src/app/api/consultations/route.ts` — List + Create endpoints (reference: `src/app/api/notes/[patientId]/route.ts`)
- `src/app/api/consultations/[consultationId]/route.ts` — Get + Update + Delete endpoints
- `src/lib/hooks/use-consultations.ts` — TanStack Query hooks (reference: `src/lib/hooks/use-notes.ts`, `src/lib/hooks/use-patients.ts`)
- `src/components/consultations/ConsultationTable.tsx` — DataGrid listing (reference: `src/components/patients/PatientTable.tsx`)
- `src/components/consultations/NewConsultationSheet.tsx` — Create form (reference: `src/components/patients/NotesTab.tsx` AddNoteSheet)
- `src/components/consultations/ConsultationDetailSheet.tsx` — Detail/actions panel
- `src/components/consultations/ConsultationCalendar.tsx` — MUI X Scheduler calendar view

### Reference Only (patterns to follow)

- `src/lib/notes-store.ts` — In-memory store pattern
- `src/app/api/notes/[patientId]/route.ts` — Local API route pattern with Clerk auth
- `src/lib/hooks/use-notes.ts` — TanStack Query hook pattern with mutations
- `src/components/patients/PatientTable.tsx` — DataGrid with FilterBar pattern
- `src/components/patients/NotesTab.tsx` — Sheet form + card layout pattern
- `src/app/(dashboard)/prescriptions/page.tsx` — Listing page with Sheet detail panel

## Verification

1. `npx tsc --noEmit` — no type errors after all changes
2. `npm run lint` — passes ESLint
3. `npm run build` — successful production build
4. Manual: Navigate to `/consultations` → see empty state → schedule a consultation → see it in DataGrid
5. Manual: Click consultation row → detail sheet opens → complete it with outcome → status updates
6. Manual: Navigate to `/patients/[id]` → Consultations tab shows that patient's consultations
7. Manual: Cancel a consultation → verify status badge shows "cancelled" in gray
8. Manual: Dashboard → verify pending consultations count matches scheduled consultations
9. Manual: Toggle to calendar view → consultations appear as events on correct dates
10. Manual: Click a calendar event → `ConsultationDetailSheet` opens
11. Manual: Switch between day/week/month views in calendar

## Decisions

- **Local API (not proxy):** No backend endpoint exists for consultations yet. Use the same in-memory store pattern as Notes. When backend adds a consultations endpoint, swap the store for proxy calls.
- **DataGrid over Cards:** The current card layout doesn't scale. DataGrid provides sorting, filtering, pagination — consistent with the patients and prescriptions pages.
- **Sheet panels (not full pages):** Consultation detail and creation use side sheets, consistent with prescriptions page and notes tab.
- **MUI X Scheduler for calendar:** Chose `@mui/x-scheduler` over FullCalendar/React Big Calendar/Schedule-X because the project already uses `@mui/x-data-grid`, `MuiThemeProvider` is already configured, and staying in the MUI X ecosystem keeps theming and bundle consistency. Calendar is Phase 6, built after the core DataGrid listing is working.
- **Status field addition:** Current `Consultation` type uses the absence of `completedAt` to determine upcoming/past. Adding explicit `status` enables cancelled/no-show tracking.
