# Feature Development Guide

This guide defines the clean path for adding or changing Patient Portal features. Use it before scaffolding a new route, table, form, data hook, sheet, dialog, dashboard section, or API integration.

The goal is simple: new code should look like it was built by the same team, with the same data flow, accessibility, design-system rules, and review checklist every time.

## Required context before feature work

Before planning or editing, read the applicable guidance in this order:

1. `.github/copilot-instructions.md`
2. Matching `.github/instructions/*.instructions.md` files, especially `feature-scaffolding.instructions.md`, `nextjs.instructions.md`, `styling.instructions.md`, and `forms.instructions.md` when relevant
3. Matching `.github/skills/*/SKILL.md` files, especially `next-best-practices`, `data-fetching`, `vercel-react-best-practices`, and `intake-form` when relevant
4. Matching `.github/prompts/*.prompt.md` files when using a repeatable workflow such as a new page or backend sync
5. `.github/design/README.md`, `.github/design/NON_NEGOTIABLES.md`, and the relevant design-system reference files for any UI, layout, table, card, state, or visual-copy change

If guidance conflicts, follow the most specific source. If it is still unclear, stop and ask before coding.

## Golden-path feature anatomy

Use this structure for a dashboard feature unless there is a clear reason not to:

```text
src/app/(dashboard)/<feature>/
  layout.tsx          # Metadata only; keeps pages server-renderable
  loading.tsx         # Shape-matched loading UI
  page.tsx            # Server Component: auth, initial data, composition
  <Feature>Client.tsx # Client leaf only when hooks/state/events are needed

src/components/<feature>/
  <Feature>Table.tsx
  <Feature>DetailSheet.tsx
  <Feature>Form.tsx
  ...domain components

src/lib/hooks/use-<feature>.ts
src/types/index.ts
```

Keep shared, reusable product primitives in `src/components/shared/`. Keep generated or shadcn primitives in `src/components/ui/` and do not manually fork them unless the design-system work explicitly requires it.

## Current clean patterns to copy

- Server route with initial data: `src/app/(dashboard)/patients/page.tsx`
- Client screen shell: `src/app/(dashboard)/patients/PatientsClient.tsx`
- Parallel server fetches for a detail shell: `src/app/(dashboard)/patients/[id]/layout.tsx`
- Admin-only server guard: `src/app/(dashboard)/workspace/page.tsx`
- Typed TanStack Query hooks: `src/lib/hooks/use-patients.ts` and `src/lib/hooks/use-tasks.ts`
- Shared list/table primitives: `src/components/shared/PageHeader.tsx`, `src/components/shared/FilterBar.tsx`, `src/components/shared/StatusBadge.tsx`, `src/components/shared/EmptyState.tsx`, and `src/lib/datagrid-theme.ts`
- Right-side detail surface: `src/components/shared/AppSheet.tsx`
- Route-level skeletons: `src/app/(dashboard)/patients/loading.tsx` and `src/app/(dashboard)/dashboard/loading.tsx`

## Route and Server Component rules

1. Default to Server Components. Add `"use client"` only to the smallest component that needs hooks, browser APIs, local state, or event handlers.
2. `page.tsx` should normally authenticate, fetch initial data, and render a client leaf or server-composed children.
3. Use `requireAuth()`, `getMeState()`, `getEntityId()`, or `getUserRole()` from `src/lib/auth.ts`; do not duplicate Clerk/session handling per screen.
4. Admin-only routes must gate in the server page or layout and redirect away when unauthorized. Do not add `middleware.ts`; the app uses Next.js 16 `src/proxy.ts`.
5. Fetch server data with `api` from `src/lib/api.ts`. Never call the backend URL directly from a browser component.
6. Start independent requests together and await them with `Promise.all()` or `Promise.allSettled()` when partial fallback is intentional.
7. Await Next.js async APIs: `params`, `searchParams`, `cookies()`, and `headers()`.
8. Keep props passed from Server Components to Client Components JSON-serializable.
9. Every feature route needs a sibling `layout.tsx` with `metadata`. Use a sibling layout when the page itself must be a Client Component.
10. Every new route needs shape-matched loading UI. Prefer skeleton rows/cards over full-page spinners.

## Client shell rules

Use a client shell when the screen needs state, filters, DataGrid events, local storage, sheet/dialog state, mutations, or browser APIs.

Client shells should:

- Receive only stable primitives and typed initial data from the server page.
- Own view state such as selected row, sheet open state, active tab, pagination, sort model, and filter inputs.
- Call TanStack Query hooks from `src/lib/hooks/` rather than calling `fetch()` inline.
- Compose feature components and shared primitives. Avoid embedding large tables, forms, and detail panels directly in the route file.
- Keep `useMemo()` and `useCallback()` intentional. Do not memoize every value by default; memoize expensive derived rows, stable column definitions, and props passed to memoized/heavy children.

## Data fetching and API integration

### Server-side data

- Use `api` from `src/lib/api.ts` in Server Components and route handlers.
- Keep `API_SECRET` server-only. It must never appear in client code or `NEXT_PUBLIC_` variables.
- Add typed `ApiClient` methods when a server route needs a backend endpoint.
- Use `cache: "no-store"` for per-user clinical data unless a documented cache strategy is approved.

### Client-side data

- Create hooks in `src/lib/hooks/use-<feature>.ts`.
- Fetch through `/api/proxy/...` only.
- Type every response and payload in `src/types/index.ts`.
- Include every query-affecting input in the query key.
- Use `enabled: Boolean(id)` for ID-dependent queries.
- Use `placeholderData` or `initialData` only when it matches the query key.
- Mutations must invalidate or update every affected query key.
- Parse structured backend errors where users need actionable messages.

### Backend sync

Before adding fields, payloads, or endpoints, verify the gateway contract and then update in this order:

1. Types in `src/types/index.ts`
2. `ApiClient` methods in `src/lib/api.ts` when server fetches are needed
3. TanStack Query hooks in `src/lib/hooks/`
4. UI components and forms
5. Validation commands: `npx tsc --noEmit`, `npm run lint`, and `npm run build` when practical

## List and table scaffold

For record lists, use the same anatomy every time:

1. `PageHeader` with title, description, breadcrumbs, and one primary action.
2. `FilterBar` below the header for search, filters, active filter count, and result count.
3. MUI `DataGrid` wrapped in a card-like border surface.
4. `sx={dataGridSx}` from `src/lib/datagrid-theme.ts` on every DataGrid.
5. `StatusBadge` for statuses; never use color-only status.
6. `EmptyState` when there are no records or no filter matches.
7. `AppSheet` for row details when the list context should remain visible.
8. Dialog or alert-dialog only for blocking confirmations or focused decisions.

### Filtering source of truth

Pick one filtering model per table:

- Server-side filtering/pagination/sorting: send search, filters, sort, limit, and offset through the query hook. The table displays returned rows and uses backend totals.
- Client-side filtering: fetch a bounded local dataset, derive visible rows locally, and label counts as local results.

Do not combine backend filtering with a second client-side filter over the already paginated rows unless the UI explicitly labels it as a local refinement. This can hide valid records and make totals wrong.

## Forms and mutations

- Use React Hook Form v7 and Zod v4.
- Validate with manual `schema.safeParse()`; do not use `@hookform/resolvers`.
- Use `z.string().min(1, "Required")` for required strings.
- Guard shadcn/Base UI Select `onValueChange` values because they can be `null`.
- For multi-step forms, keep one form state object and validate the current step before advancing.
- Prevent data loss on browser back or route changes when a form has unsaved clinical work.
- Keep clinical identifiers, medication names, appointment times, and other clinical data out of short-lived toasts.

## UI and design-system rules

New UI must follow `.github/design/NON_NEGOTIABLES.md`. The most common guardrails are:

- No hardcoded hex colors in new code; use tokens from `globals.css`.
- No Tailwind palette utilities such as `bg-blue-500`, `text-slate-600`, or `border-gray-200`.
- No emoji in product UI; use Lucide icons.
- No `asChild` prop; shadcn/ui v4 uses Base UI. Use `render` where the primitive supports it.
- No per-page DataGrid styling. Add a documented variant to `src/lib/datagrid-theme.ts` if a real exception is needed.
- No uppercase/tracked table headers.
- No alternating row fills on record tables.
- No truncation without a tooltip for names, MRNs, medication names, dates, or other clinical values.
- No focus rings stripped without an accessible replacement.
- Motion for UI feedback must stay under 200ms.
- Text left-aligns, dates left-align, and numbers right-align with tabular numerals.
- Empty states must explain why the state exists and offer the next action.

## Surface selection

- Use `PageHeader` for page title, description, breadcrumbs, and top-level actions.
- Use `StatusBadge` for compact state labels.
- Use `Alert`, `AlertTitle`, and `AlertBody` for inline notices.
- Use `AppSheet` for details, editing, previews, or workflows that benefit from keeping the list behind visible.
- Use dialog/alert-dialog for destructive confirmations and short blocking decisions.
- Use `EmptyState` for first-use and no-results states.
- Use `Skeleton` or feature skeletons that match the final layout shape.

## Anti-patterns to block in review

- Backend API calls from client components that skip `/api/proxy/`.
- API secrets or backend secrets in client code or `NEXT_PUBLIC_` env vars.
- Feature pages marked `"use client"` just to support a single interactive child.
- Missing feature `layout.tsx` metadata.
- Missing loading state or spinner-only loading for known page layouts.
- Local auth/role logic copied into every screen instead of using `src/lib/auth.ts`.
- Double filtering or sorting when server pagination is active.
- Inline `fetch()` calls inside components instead of hooks.
- One-off colored pills instead of `StatusBadge`.
- One-off filter rows instead of `FilterBar`.
- One-off right drawers instead of `AppSheet`.
- One-off DataGrid `sx` objects.
- Broad barrel imports that pull unnecessary client bundles.
- Clinical details in toasts.
- Destructive buttons labelled only “Confirm” or “OK”. Use the action verb, such as “Delete patient”.

## Current audit notes

Checked on 2026-05-09 before creating this guide:

- Dashboard features already follow the server-page plus client-shell pattern in patients, consultations, tasks, rosters, products, orders, prescriptions, profile, and workspace.
- `DataGrid` instances found in app and feature components use `dataGridSx`.
- No `asChild` usages were found in `src/`.
- No Tailwind palette utilities were found in `src/`.
- Existing hardcoded hex values remain in `src/lib/rosters-utils.ts` and `src/lib/mui-tokens.ts`. Treat these as legacy exceptions to migrate deliberately; do not add new ones.
- Existing patient and consultation tables have a double-filtering risk because query filters and local `matchesSearchQuery()` filtering both exist. New features must choose one filtering source of truth.
- Some existing routes rely on group-level loading or metadata. New routes should include explicit feature-level `layout.tsx` and `loading.tsx` unless intentionally documented otherwise.

## New-feature checklist

Use this before opening a PR:

- [ ] Required guidance files were read and any conflicts resolved.
- [ ] Feature route has `page.tsx`, `layout.tsx`, and shape-matched `loading.tsx`.
- [ ] Server page handles auth/role checks and initial data.
- [ ] Client shell is the smallest interactive leaf.
- [ ] Data hooks live in `src/lib/hooks/` and call `/api/proxy/`.
- [ ] Backend response and payload types are in `src/types/index.ts`.
- [ ] Tables use `FilterBar`, `DataGrid`, `dataGridSx`, `StatusBadge`, and `EmptyState`.
- [ ] Filtering, pagination, and result counts have one clear source of truth.
- [ ] Forms use React Hook Form + Zod manual `safeParse()`.
- [ ] No hardcoded colors, Tailwind palette utilities, emoji, `asChild`, or one-off DataGrid styling were added.
- [ ] Destructive actions use explicit verb labels.
- [ ] Clinical data is not placed in short-lived toasts.
- [ ] Screenshots are attached for UI changes.
- [ ] `npx tsc --noEmit`, `npm run lint`, and `npm run build` were run or documented as not run.

## Useful validation commands

```bash
npx tsc --noEmit
npm run lint
npm run build

# Hardcoded hex colors outside globals.css
grep -rE '#[0-9a-fA-F]{6}' src/ --include='*.tsx' --include='*.ts' --include='*.css' | grep -v 'globals.css'

# Tailwind palette utilities
grep -rE '\b(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+\b' src/

# Base UI compatibility guard
grep -RIn 'asChild' src --include='*.tsx' --include='*.ts'

# Check for one-off grid styling
grep -RIn 'sx=' src/app src/components --include='*.tsx'
```
