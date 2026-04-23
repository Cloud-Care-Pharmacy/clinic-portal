---
description: "Use when writing or modifying Tailwind CSS classes, shadcn/ui components, MUI DataGrid, or styling. Covers Tailwind v4, shadcn/ui v4 (@base-ui/react), and MUI conventions."
applyTo: "src/components/**/*.tsx, src/app/**/*.tsx"
---
# Styling Conventions

## Tailwind CSS v4

- Uses `@tailwindcss/postcss` — Tailwind v4 syntax
- CSS variables in `src/app/globals.css`
- Use `cn()` from `@/lib/utils` for conditional class merging

## shadcn/ui v4 (CRITICAL)

- Built on `@base-ui/react`, NOT Radix UI
- **NO `asChild` prop** — it does not exist
- Use `render` prop for custom rendering where needed
- Install: `npx shadcn@latest add <component>`
- Components in `src/components/ui/` — do not edit manually
- Icons: Lucide React

## MUI DataGrid

- Use for all tabular data (patients, prescriptions, admin staff, dashboard activity)
- Import from `@mui/x-data-grid`
- Style via `sx` prop directly on DataGrid instances
- Do NOT use `MuiDataGrid` in `createTheme` component overrides (not typed)
- Wrap in `MuiThemeProvider` from `src/components/providers/MuiThemeProvider.tsx`

## Rules

- Apply Tailwind classes directly in JSX — no CSS modules
- Use shadcn/ui for controls (buttons, dialogs, forms, tabs)
- Use MUI DataGrid for data tables
- Never mix MUI components with shadcn equivalents for the same purpose
