---
description: "Generate a new page with data fetching, auth, and proper layout integration"
agent: "agent"
tools: [read, edit, search, execute]
argument-hint: "e.g., 'Create an appointments page with calendar view'"
---

Create a new page in the Patient Portal following these steps:

1. Read `.github/instructions/feature-scaffolding.instructions.md` and `docs/FEATURE_DEVELOPMENT_GUIDE.md` before scaffolding.
2. Create the route at `src/app/(dashboard)/<feature>/` with `layout.tsx` for metadata, `loading.tsx` for shape-matched loading UI, and `page.tsx` as the Server Component entry.
3. Keep interactive state in a small `<Feature>Client.tsx` leaf only when hooks, browser APIs, local state, or event handlers are needed.
4. If the page needs backend data, verify or add the server method in `src/lib/api.ts`, fetch initial data in `page.tsx`, and pass typed initial data to the client leaf.
5. If the page needs client-side data, create a TanStack Query hook at `src/lib/hooks/use-<feature>.ts` that calls `/api/proxy/...` and includes every query input in the query key.
6. Add any new TypeScript response and payload types to `src/types/index.ts` so they match the backend exactly.
7. Use MUI DataGrid for tabular data with `dataGridSx`, plus `PageHeader`, `FilterBar`, `StatusBadge`, and `EmptyState` where applicable.
8. Use shadcn/ui v4 components for controls (remember: no `asChild` prop; use Base UI `render` patterns where supported).
9. Check auth requirements with `requireAuth()` or helpers from `src/lib/auth.ts`. Admin-only pages should gate in the server page/layout and redirect when unauthorized; do not add `middleware.ts`.
10. Choose one filtering source of truth. Do not combine backend filtering/pagination with a second local filter over paginated rows unless documented as a local refinement.

The page auto-inherits the dashboard layout (sidebar + header) from `src/app/(dashboard)/layout.tsx`.
