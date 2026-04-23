---
description: "Add a new shadcn/ui component and create a feature component using it"
agent: "agent"
tools: [read, edit, search, execute]
argument-hint: "e.g., 'Add a confirmation dialog for patient deletion'"
---
Add a shadcn/ui component to the project:

1. Install via `npx shadcn@latest add <component-name>`
2. Verify it was added to `src/components/ui/`
3. Create the feature component using it
4. Remember: shadcn/ui v4 uses `@base-ui/react` — NO `asChild` prop available
5. Use `cn()` from `@/lib/utils` for conditional classes
6. Use Lucide icons for any icons needed
