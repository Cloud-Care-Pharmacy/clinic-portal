# Next.js Performance Optimization Plan

_Last updated: 2026-04-26_

This plan captures near-future performance work for the clinic management platform. It intentionally applies generic Next.js performance guidance selectively: patient and clinical data must stay fresh, access-controlled, and user-scoped. Do **not** introduce shared caching for protected health information (PHI) without an explicit security review.

## Guiding principles

- Keep sensitive clinical data fresh by default. Current `no-store` behavior for patient, prescription, document, note, consultation, and profile data is conservative and appropriate unless a specific endpoint is proven safe to cache.
- Prefer Server Components for route boundaries and initial shell rendering, then keep interactivity in small client leaves.
- Use dynamic imports for heavy client-only modules so the initial dashboard shell does not ship every table, chart, calendar, editor, or sheet bundle.
- Measure bundle size before and after changes. Do not optimize blindly.
- Preserve the existing API security model: server fetches use `ApiClient`; browser fetches go through `/api/proxy/`; secrets never move into client code.

## Current snapshot

- `next/font` is already used in the root layout.
- Most authenticated route pages are currently client components.
- No `next/dynamic` imports are currently used.
- No `next/image` usage is currently present; one raw profile avatar image exists.
- No bundle analyzer setup is currently present.
- The server `ApiClient` currently forces `cache: "no-store"`, which is acceptable for PHI-heavy data.
- The patient detail route already uses a good server-side parallel fetch pattern for shell data.

## Phase 1 — Add measurement before refactoring

### Tasks

- [ ] Add `@next/bundle-analyzer` as a dev dependency.
- [ ] Wrap `next.config.ts` with the analyzer only when `ANALYZE=true`.
- [ ] Add an npm script such as `analyze` that runs `ANALYZE=true npm run build`.
- [ ] Capture baseline bundle output for these routes:
  - `/dashboard`
  - `/patients`
  - `/patients/[id]`
  - `/consultations`
  - `/prescriptions`
  - `/profile`
- [ ] Record largest client chunks and their sources, especially MUI DataGrid, Recharts, Tiptap, Clerk UI, and consultation sheets.

### Why

This tells us which bundles actually hurt initial load and prevents churn on components that are not performance bottlenecks.

### Acceptance criteria

- Analyzer runs locally without affecting normal builds.
- A short before-refactor bundle summary is added to this file or a linked follow-up note.
- `npm run build`, `npm run lint`, and `npx tsc --noEmit` pass.

---

## Phase 2 — Reduce route-level client boundaries

_Progress 2026-04-26:_ All authenticated `page.tsx` route-level client boundaries found in the audit have been split into Server Component wrappers and focused `*Client.tsx` leaves. Interactive admin and new-patient intake flows now live in client leaves instead of route pages.

### Tasks

- [x] Audit each authenticated `page.tsx` with `"use client"` and split it into:
  - a default Server Component page for layout, metadata-safe route composition, and optional initial data fetching;
  - a small `*Client.tsx` leaf for state, event handlers, browser APIs, and TanStack Query hooks.
- [x] Prioritize these pages first:
  - [x] `src/app/(dashboard)/dashboard/page.tsx`
  - [x] `src/app/(dashboard)/patients/page.tsx`
  - [x] `src/app/(dashboard)/consultations/page.tsx`
  - [x] `src/app/(dashboard)/prescriptions/page.tsx`
  - [x] `src/app/(dashboard)/profile/page.tsx`
- [x] Keep route-group layouts as Server Components where possible.
- [x] Ensure any props crossing Server Component to Client Component boundaries are JSON-serializable.
- [x] Keep client-only providers as high as necessary but no higher than needed.

### Why

Every route-level client boundary increases hydration cost and ships more JavaScript. Clinic users need fast switching between patient records, consultations, and prescriptions, especially on tablets or older clinic hardware.

### Acceptance criteria

- Pages without direct browser APIs become Server Components again.
- Interactive functionality remains in small client leaves.
- No auth, API secret, or backend URL behavior changes.
- `npm run build`, `npm run lint`, and `npx tsc --noEmit` pass.

---

## Phase 3 — Dynamically import heavy interactive UI

### Tasks

- [ ] Dynamic-import chart-heavy dashboard content:
  - `src/components/dashboard/Overview.tsx` uses Recharts and should load separately from the core dashboard shell.
- [ ] Dynamic-import MUI DataGrid-heavy sections where they are not needed for the first paint:
  - patient table
  - consultation table
  - prescription grids
  - admin staff grid
  - patient tab tables for clinical, consultations, prescriptions, and documents.
- [ ] Dynamic-import rich text editor usage:
  - `src/components/shared/SimpleEditor.tsx` pulls Tiptap packages and should load only when an editor is opened or visible.
- [ ] Dynamic-import secondary sheets/dialogs that are initially closed:
  - consultation create/edit sheet
  - consultation detail sheet
  - prescription detail sheet
  - future document/note/clinical detail sheets.
- [ ] Provide lightweight skeletons or `null` loading states to avoid layout shift.
- [ ] Use `ssr: false` only for components that truly require browser APIs and cannot safely render server-side.

### Why

Tables, charts, editors, calendars, and modal/sheet flows are valuable but expensive. Loading them on demand should reduce initial JavaScript and improve time-to-interactive for the clinical dashboard.

### Acceptance criteria

- Initial route bundles shrink versus the Phase 1 baseline.
- Heavy components still show sensible loading UI.
- No hydration mismatch warnings appear in development.
- `npm run build`, `npm run lint`, and `npx tsc --noEmit` pass.

---

## Phase 4 — Keep PHI caching conservative, cache only safe reference data

### Tasks

- [ ] Keep `cache: "no-store"` for patient-specific and user-specific data unless explicitly reviewed.
- [ ] Create a cache classification table for backend endpoints:
  - PHI/user-scoped: always dynamic/no-store.
  - Tenant-scoped but non-PHI: review case by case.
  - Public/static reference data: candidate for `revalidate` or tag-based cache.
- [ ] Identify safe cache candidates, such as static lookup values or non-sensitive configuration if such endpoints exist.
- [ ] If cached server fetches are introduced, add endpoint-specific methods rather than changing the global `ApiClient` default.
- [ ] Document cache invalidation rules next to any cached method.
- [ ] Continue using TanStack Query invalidation for user-scoped client data after mutations.

### Why

Generic Next.js advice encourages caching aggressively, but stale or cross-user clinical data is a safety and privacy risk. The right clinic-platform approach is conservative server caching plus well-scoped client cache invalidation.

### Acceptance criteria

- No PHI endpoint is accidentally shared-cached.
- Any cached endpoint has a documented reason, lifetime, and invalidation strategy.
- Mutation flows still show current data after updates.

---

## Phase 5 — Improve image handling

### Tasks

- [ ] Replace safe raw images with `next/image` where dimensions are known.
- [ ] Start with the profile avatar image if Clerk image domains/patterns are configured in `next.config.ts`.
- [ ] Add remote image patterns only for trusted providers that are actually used.
- [ ] Always include `alt`, `width`, `height`, and `sizes` where applicable.
- [ ] Use `priority` only for above-the-fold images that affect LCP.

### Why

Optimized images reduce payload and avoid layout shift. This will matter more as the platform adds provider photos, clinic branding, document thumbnails, or richer patient profile media.

### Acceptance criteria

- No avoidable raw `<img>` usage remains for app-controlled images.
- Remote image configuration is minimal and trusted.
- No image-related build warnings appear.

---

## Phase 6 — Review re-renders and client-state patterns

### Tasks

- [ ] Run a focused review of client components that render large lists or grids.
- [ ] Keep expensive derived data in `useMemo` only when it is actually expensive or passed to memoized children.
- [ ] Use primitive dependencies in effects and memo hooks where possible.
- [ ] Avoid defining components inside components.
- [ ] Use functional state updates for stable callbacks.
- [ ] Consider `useDeferredValue` or `startTransition` for search/filter interactions over large client datasets.
- [ ] Keep patient header and tab navigation stable across tab route changes.

### Why

Once bundle size is under control, unnecessary re-renders become the next source of sluggish interactions in large patient tables and tabbed clinical views.

### Acceptance criteria

- Filtering/search interactions remain responsive on realistic patient counts.
- Patient shell does not flash or reload when switching patient tabs.
- No broad invalidations cause unrelated header or shell refetches.

---

## Phase 7 — Third-party scripts and analytics policy

### Tasks

- [ ] If analytics or monitoring scripts are added, load them through `next/script`.
- [ ] Prefer `lazyOnload` for analytics and non-critical scripts.
- [ ] Avoid `beforeInteractive` unless a script is required for security or critical app boot.
- [ ] Confirm analytics does not capture PHI, patient identifiers, notes, prescriptions, document names, or search text.
- [ ] Document any third-party script in the security guide before production use.

### Why

Third-party scripts can hurt performance and create privacy exposure. Clinic platforms must treat observability tools as potential PHI processors.

### Acceptance criteria

- No unmanaged raw script tags are introduced.
- Any analytics script has a PHI-safe configuration and documented purpose.

---

## Recommended implementation order

1. Add bundle analyzer and baseline measurements.
2. Split the highest-traffic route pages into Server Component pages plus small client leaves.
3. Dynamic-import Recharts, Tiptap, and initially closed sheets.
4. Dynamic-import DataGrid-heavy page sections after measuring bundle impact.
5. Add endpoint cache classification; keep PHI as `no-store`.
6. Convert safe images to `next/image`.
7. Review re-renders for large list/table interactions.

## Done when

- Initial client bundles are measurably smaller for dashboard and patient routes.
- Authenticated navigation feels faster on mid-range laptop/tablet hardware.
- No patient/clinical data freshness or privacy guarantees are weakened.
- All validation commands pass:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`
