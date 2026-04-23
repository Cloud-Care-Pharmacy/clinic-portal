---
description: "Sync frontend types with prescription-gateway backend API changes"
agent: "agent"
tools: [read, edit, search, web]
argument-hint: "e.g., 'Backend added a new consultations endpoint'"
---
Sync frontend types and API client with backend changes:

1. Check the prescription-gateway source for updated types and endpoints
2. Update `src/types/index.ts` to match new backend response shapes
3. Update `src/lib/api.ts` with new ApiClient methods
4. Create or update TanStack Query hooks in `src/lib/hooks/`
5. Verify the proxy at `src/app/api/proxy/[...path]/route.ts` handles the new endpoints
6. Run `npx tsc --noEmit` to verify type safety
