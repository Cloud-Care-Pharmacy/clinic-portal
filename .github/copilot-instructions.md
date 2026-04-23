# Project Guidelines

## Overview

Patient Management System for Cloud Care Pharmacy. Next.js 16 frontend connecting to the `prescription-gateway` Cloudflare Worker API via a server-side auth proxy.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **UI:** shadcn/ui v4 (`@base-ui/react`, NOT Radix — no `asChild` prop), Tailwind CSS v4, Lucide icons
- **Tables:** MUI DataGrid (`@mui/x-data-grid`)
- **Auth:** NextAuth.js v5 (Auth.js) — Google OAuth, JWT strategy
- **Data fetching:** TanStack React Query v5 (client), `ApiClient` class (server)
- **Forms:** React Hook Form v7 + Zod v4 (manual `safeParse` — no `@hookform/resolvers`)
- **Toasts:** Sonner

## Architecture

```
Browser → Next.js → /api/proxy/[...path] → prescription-gateway (Cloudflare Worker)
```

- Auth proxy at `src/app/api/proxy/[...path]/route.ts` injects `X-API-Key` server-side
- `API_SECRET` must NEVER appear in client code or `NEXT_PUBLIC_` env vars
- Server Components fetch via `ApiClient` in `src/lib/api.ts`
- Client Components fetch via TanStack Query hooks in `src/lib/hooks/` calling `/api/proxy/`
- Roles: `admin` | `doctor` | `staff` — resolved from `ADMIN_EMAILS` / `DOCTOR_EMAILS` env vars

### Directory Structure

```
src/
├── app/                    # App Router pages and layouts
│   ├── (auth)/             # Unauthenticated routes (login)
│   ├── (dashboard)/        # Authenticated routes (all main pages)
│   └── api/                # API routes (auth, proxy)
├── components/
│   ├── ui/                 # shadcn/ui primitives (do not edit manually)
│   ├── layout/             # Sidebar, Header
│   ├── patients/           # Patient-specific components
│   ├── providers/          # React context providers
│   └── shared/             # Reusable (PageHeader, StatusBadge, EmptyState)
├── lib/
│   ├── api.ts              # Server-side ApiClient
│   ├── auth.ts             # NextAuth config
│   ├── utils.ts            # cn() utility
│   └── hooks/              # TanStack Query hooks
├── middleware.ts            # Auth + role middleware
└── types/                  # TypeScript interfaces
```

## Code Style

- Use `@/` path alias for all imports (maps to `src/`)
- Prefer named exports (except page/layout components)
- Use `"use client"` only when component needs hooks, event handlers, or browser APIs
- Keep Server Components as default — push `"use client"` to the smallest leaf
- Use `cn()` from `@/lib/utils` for conditional class merging

## Key Gotchas

- **shadcn/ui v4:** Built on `@base-ui/react`. NO `asChild` prop. Use `render` prop or wrap with native elements.
- **Zod v4:** `z.literal()` syntax differs from v3. Use `z.string().min(1)` for required, `z.string().refine()` for patterns.
- **MUI DataGrid:** Apply styles via `sx` prop on instances, not theme overrides (`MuiDataGrid` not typed in `createTheme`).
- **Select `onValueChange`:** Can receive `null` — guard: `if (v) setValue(v)`
- **Next.js 16:** Read `node_modules/next/dist/docs/` before using unfamiliar APIs.

## Build and Test

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

## Conventions

- All env vars documented in `.env.local.example`
- Backend types in `src/types/index.ts` must match `prescription-gateway` exactly
- New pages under `src/app/(dashboard)/` with their own `page.tsx`
- New API endpoints under `src/app/api/` — always check auth via `auth()`
- Never store secrets in client code or `NEXT_PUBLIC_` env vars
# Patient Portal — Project Guidelines

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, TypeScript strict)
- **UI:** shadcn/ui v4 (uses `@base-ui/react`, NOT Radix — no `asChild` prop), Tailwind CSS v4, Lucide icons
- **Tables:** MUI DataGrid (`@mui/x-data-grid`) — use for all tabular data
- **Auth:** NextAuth.js v5 (Auth.js) with Google OAuth, JWT strategy
- **Data fetching:** TanStack Query (React Query) for client-side, server-side `ApiClient` for RSC
- **Forms:** React Hook Form + Zod v4 (manual `safeParse` — no `@hookform/resolvers` due to v4 compat)
- **Toasts:** Sonner
- **Deploy:** Vercel
- **Backend:** Cloudflare Worker (`prescription-gateway`) — D1 database, R2 storage, KV

## Architecture

```
Browser → Next.js App → /api/proxy/[...path] → prescription-gateway (Cloudflare Worker)
```

- **Auth proxy pattern:** `/api/proxy/[...path]/route.ts` injects `X-API-Key` header server-side. The API key (`API_SECRET`) must NEVER be exposed to the browser.
- **Server Components** fetch data via the `ApiClient` class in `src/lib/api.ts`
- **Client Components** fetch via TanStack Query hooks in `src/lib/hooks/` which call `/api/proxy/`
- **Role-based access:** `admin`, `doctor`, `staff` — resolved from `ADMIN_EMAILS` / `DOCTOR_EMAILS` env vars

## Code Style

- Use `@/` path alias for all imports (maps to `src/`)
- Prefer named exports over default exports (except page/layout components)
- Use `"use client"` directive only when component needs browser APIs, hooks, or interactivity
- Keep Server Components as the default — push `"use client"` to the leaf
- Use `cn()` utility from `@/lib/utils` for conditional class merging

## Key Gotchas

- **shadcn/ui v4:** Components use `@base-ui/react`. There is NO `asChild` prop. Use `render` prop or wrap with native elements instead.
- **Zod v4:** `z.literal()` syntax changed from v3. Use `z.string().min(1)` for required fields, `z.string().refine()` for pattern matching.
- **Select component:** `onValueChange` can receive `null` — always guard: `if (v) setValue(v)`
- **MUI theme overrides:** `MuiDataGrid` component overrides not typed in `createTheme`. Apply styles via `sx` prop on instances.
- **Next.js 16 breaking changes:** Read `node_modules/next/dist/docs/` before using unfamiliar APIs.

## File Organization

```
src/
├── app/              # Next.js App Router pages and layouts
│   ├── (auth)/       # Unauthenticated routes (login)
│   ├── (dashboard)/  # Authenticated routes (all main pages)
│   └── api/          # API routes (auth, proxy)
├── components/
│   ├── ui/           # shadcn/ui primitives (do not edit manually)
│   ├── layout/       # Sidebar, Header
│   ├── patients/     # Patient-specific components
│   ├── providers/    # React context providers
│   └── shared/       # Reusable components (PageHeader, StatusBadge, etc.)
├── lib/
│   ├── api.ts        # Server-side ApiClient
│   ├── auth.ts       # NextAuth config
│   ├── utils.ts      # cn() utility
│   └── hooks/        # TanStack Query hooks
├── middleware.ts      # Auth + role middleware
└── types/            # TypeScript interfaces
```

## Build & Test

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

## Conventions

- All env vars must be documented in `.env.local.example`
- Backend API types in `src/types/index.ts` must match `prescription-gateway` types exactly
- New pages go under `src/app/(dashboard)/` with their own `page.tsx`
- New API endpoints go under `src/app/api/` — always check auth via `auth()` call
- Never store secrets in client-side code or `NEXT_PUBLIC_` env vars
