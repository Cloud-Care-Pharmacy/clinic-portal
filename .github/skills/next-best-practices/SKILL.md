---
name: next-best-practices
description: "Next.js best practices for this Patient Portal. Use when writing or reviewing Next.js 16 App Router code, RSC boundaries, and data patterns."
---

# Next.js Best Practices

## File Conventions

- Pages: `src/app/(dashboard)/<feature>/page.tsx`
- Auth pages: `src/app/(auth)/<feature>/page.tsx`
- Layouts: `layout.tsx` wraps child routes; also used for per-route `metadata` exports
- Route groups: `(name)/` organize without URL segments
- Proxy: `src/proxy.ts` with `export const proxy` (Next.js 16 — `middleware.ts` is deprecated)
- Error boundary: `error.tsx` per route group (must be `'use client'`)
- Loading UI: `loading.tsx` per route group for streaming/Suspense
- Not found: `not-found.tsx` per route group and at app root

## RSC Boundaries

Client Components cannot be async. Only Server Components can be async.

```tsx
// Bad
'use client'
export default async function Profile() { /* ... */ }

// Good: fetch in Server Component, pass as props
export default async function Page() {
  const data = await api.getPatient(id)
  return <ProfileClient data={data} />
}
```

## Async Patterns (Next.js 15+)

- `params` and `searchParams` are Promises — always await
- `cookies()` and `headers()` are async — always await

## Data Patterns

| Context | Method |
|---------|--------|
| Server Component | `ApiClient` from `src/lib/api.ts` |
| Client Component | TanStack Query hooks from `src/lib/hooks/` |
| Mutation | Server Action or `POST` to proxy |
| API route handler | `auth()` check + forward to backend |

## Auth Patterns

- Server: `const { userId } = await auth()` from `@clerk/nextjs/server`
- Client: `useClerk()` / `useUser()` from `@clerk/nextjs`
- Proxy: `src/proxy.ts` auto-redirects unauthenticated to `/sign-in`
- Admin routes: proxy checks `sessionClaims?.metadata?.role === "admin"`

## Metadata

- `"use client"` pages cannot export `metadata` — add a `layout.tsx` sibling instead
- Each feature route should have `layout.tsx` with `export const metadata: Metadata`
