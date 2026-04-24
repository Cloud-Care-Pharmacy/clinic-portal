---
description: "Use when writing or reviewing Next.js components, pages, layouts, or route handlers. Covers RSC boundaries, async patterns, data fetching, metadata, and optimization for Next.js 16 App Router."
applyTo: "src/**/*.{ts,tsx}"
---
# Next.js Best Practices

## RSC Boundaries

- Client Components (`'use client'`) cannot be `async`
- Fetch data in a parent Server Component and pass as props
- Props crossing Server → Client boundary must be JSON-serializable (no functions, Date, Maps, Sets, class instances)
- Exception: Server Actions (`'use server'`) can be passed as function props

## Async Patterns (Next.js 15+)

- `params` and `searchParams` are async — always `await` them:
  ```tsx
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
  }
  ```
- `cookies()` and `headers()` are async — always `await`

## Data Fetching

- Server Components: use `ApiClient` from `src/lib/api.ts` directly
- Client Components: use hooks from `src/lib/hooks/` (TanStack Query wrappers calling `/api/proxy/`)
- Avoid waterfalls: `Promise.all()` for parallel fetches or Suspense boundaries
- Never call the backend API directly from client code — always go through `/api/proxy/`

## Directives

- `'use client'` — only when strictly necessary (hooks, events, browser APIs)
- `'use server'` — Server Actions for mutations
- Default to Server Components

## Error Handling

- `error.tsx` for route-level error boundaries (must be `'use client'`)
- `loading.tsx` for streaming/Suspense loading states
- `not-found.tsx` for 404 pages
- Call `notFound()` to trigger not-found boundary
- Every route group (`(auth)/`, `(dashboard)/`) must have `error.tsx` and `loading.tsx`

## Auth

- `auth()` from `@clerk/nextjs/server` for session in Server Components and Route Handlers
- `useClerk()` / `useUser()` from `@clerk/nextjs` for Client Components
- Proxy: `src/proxy.ts` with `export const proxy` (Next.js 16 — `middleware.ts` is deprecated)
- All API routes must check auth via `auth()` before processing
- Role check: `sessionClaims?.metadata?.role === "admin"` for admin-only features

## Metadata

- `"use client"` pages cannot export `metadata` — use a sibling `layout.tsx` for metadata instead
- Every feature route should have a `layout.tsx` with a `metadata` export for proper page titles
