---
name: next-best-practices
description: "Next.js best practices for this Patient Portal. Use when writing or reviewing Next.js 16 App Router code, RSC boundaries, and data patterns."
---

# Next.js Best Practices

## File Conventions

- Pages: `src/app/(dashboard)/<feature>/page.tsx`
- Auth pages: `src/app/(auth)/<feature>/page.tsx`
- Layouts: `layout.tsx` wraps child routes
- Route groups: `(name)/` organize without URL segments
- Middleware: `src/middleware.ts` — auth + role checks
- Error boundary: `error.tsx` per route
- Not found: `not-found.tsx` per route

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

- Server: `const session = await auth()` from `src/lib/auth.ts`
- Client: `useSession()` from `next-auth/react`
- Middleware: auto-redirects unauthenticated to `/login`
- Admin routes: middleware checks `session.user.role === "admin"`
