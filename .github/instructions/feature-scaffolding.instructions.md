---
description: "Use when creating, reviewing, or refactoring Patient Portal features, feature routes, client shells, hooks, tables, forms, sheets, dialogs, page scaffolding, or new dashboard sections. Enforces clean feature patterns and anti-pattern guardrails."
applyTo: "src/**/*.{ts,tsx}"
---

# Feature Scaffolding Instructions

- Before creating or changing a feature, read `docs/FEATURE_DEVELOPMENT_GUIDE.md` and apply its checklist.
- New dashboard features follow the golden path: `src/app/(dashboard)/<feature>/layout.tsx`, `loading.tsx`, `page.tsx`, optional `<Feature>Client.tsx`, domain components in `src/components/<feature>/`, hooks in `src/lib/hooks/use-<feature>.ts`, and backend-shaped types in `src/types/index.ts`.
- Keep `page.tsx` as a Server Component for auth, role checks, and initial data. Use `requireAuth()`, `getMeState()`, `getEntityId()`, or `getUserRole()` from `@/lib/auth`; do not duplicate auth flows.
- Put `"use client"` only on the smallest interactive leaf. Client leaves use TanStack Query hooks from `@/lib/hooks/` and never call the backend directly.
- Server fetches use `api` from `@/lib/api`; client fetches go through `/api/proxy/...`; `API_SECRET` stays server-only.
- Every feature route needs explicit metadata in a sibling `layout.tsx` and a shape-matched `loading.tsx` unless an exception is documented.
- For record lists, use `PageHeader`, `FilterBar`, MUI `DataGrid` with `dataGridSx`, `StatusBadge`, and `EmptyState` before creating one-off UI.
- Choose one filtering source of truth. Do not combine backend filtering/pagination with a second local filter over paginated rows unless it is intentionally labelled as a local refinement.
- Use `AppSheet` for row details or edit flows that should preserve list context. Use dialogs only for focused blocking decisions or destructive confirmations.
- Forms use React Hook Form + Zod v4 with manual `safeParse()`; do not use `@hookform/resolvers`.
- Follow the design non-negotiables: no new hardcoded hexes, no Tailwind palette utilities, no emoji in product UI, no `asChild`, no per-page DataGrid styling, no color-only status, no clinical data in toasts, no stripped focus rings, and explicit verb labels for destructive actions.
