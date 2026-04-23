---
name: data-fetching
description: "Data fetching patterns for the Patient Portal. Use when creating API integrations, TanStack Query hooks, or server-side data access."
---

# Data Fetching Patterns

## Architecture

```
src/lib/api.ts                  → Server-side ApiClient (injects X-API-Key)
src/app/api/proxy/[...path]/    → Auth proxy (browser → backend)
src/lib/hooks/                  → Client-side TanStack Query hooks
src/types/index.ts              → TypeScript interfaces for all API responses
```

## Server-Side (Server Components / API Routes)

Use `ApiClient` from `src/lib/api.ts`:

```tsx
import { api } from '@/lib/api'

export default async function PatientsPage() {
  const patients = await api.getPatients('entity-id')
  return <PatientList patients={patients} />
}
```

## Client-Side (Client Components)

Create hooks in `src/lib/hooks/`:

```tsx
// src/lib/hooks/use-feature.ts
'use client'
import { useQuery } from '@tanstack/react-query'

async function fetchFeature(id: string) {
  const res = await fetch(`/api/proxy/feature/${id}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useFeature(id: string) {
  return useQuery({
    queryKey: ['feature', id],
    queryFn: () => fetchFeature(id),
    enabled: Boolean(id),
  })
}
```

## Rules

- Server Components → `ApiClient` directly (has API key)
- Client Components → `/api/proxy/` via TanStack Query hooks
- Never call the backend URL directly from client code
- Always type responses in `src/types/index.ts`
- Use `Promise.all()` for independent parallel requests
- `enabled: Boolean(id)` to skip queries when params are missing
