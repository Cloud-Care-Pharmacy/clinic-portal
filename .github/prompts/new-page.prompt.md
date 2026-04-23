---
description: "Generate a new page with data fetching, auth, and proper layout integration"
agent: "agent"
tools: [read, edit, search, execute]
argument-hint: "e.g., 'Create an appointments page with calendar view'"
---
Create a new page in the Patient Portal following these steps:

1. Create the page component at `src/app/(dashboard)/<feature>/page.tsx`
2. If the page needs client-side data, create a TanStack Query hook at `src/lib/hooks/use-<feature>.ts`
3. If the page needs backend data, verify the endpoint exists in `src/lib/api.ts`
4. Add any new TypeScript types to `src/types/index.ts`
5. Use MUI DataGrid for any tabular data
6. Use shadcn/ui v4 components for controls (remember: no `asChild` prop)
7. Check auth requirements — admin-only pages need middleware guard

The page auto-inherits the dashboard layout (sidebar + header) from `src/app/(dashboard)/layout.tsx`.
