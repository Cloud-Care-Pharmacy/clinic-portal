# Developer TODO — Impact Sorted

This is one prioritized execution list, sorted from highest development impact to lowest.

## Impact-ordered TODO list

1. [ ] Replace mock and in-memory production paths with real backend-backed flows.
   - Fix consultations so list, create, update, and delete all use the same backend source through `/api/proxy/consultations`.
   - Remove or dev-gate `src/lib/consultations-store.ts` and the local consultations route.
   - Remove, dev-gate, or clearly document the temporary profile mock route.
   - Replace admin local mock staff state with backend-backed endpoints or hide the admin workflow until available.
   - Acceptance: no clinical or admin production workflow depends on process memory, seeded mock data, or browser-only state.

2. [ ] Harden backend environment and security boundaries.
   - Require `API_SECRET`; do not silently default to an empty string.
   - Use a private server-only backend URL such as `API_URL` instead of relying on `NEXT_PUBLIC_API_URL` in server/proxy code.
   - Update `.env.local.example` with the correct required variables.
   - Align role lookup on one authoritative Clerk claim source.
   - Confirm tenant/entity scope is enforced by the backend, not only by `NEXT_PUBLIC_DEFAULT_ENTITY_ID`.
   - Acceptance: missing required backend configuration fails loudly, secrets remain server-only, and role/entity access rules are consistent.

3. [ ] Add production-grade security headers.
   - Set `poweredByHeader: false` in Next.js config.
   - Add a Clerk- and Vercel-compatible Content Security Policy.
   - Review required `script-src`, `connect-src`, `img-src`, and `frame-src` entries for Clerk, Vercel, and app assets.
   - Add or verify rate limiting / abuse controls at the proxy or backend boundary.
   - Acceptance: security headers are explicit, compatible with Clerk sign-in, and verified in production-like builds.

4. [ ] Fix lint warnings, then make warnings fail CI.
   - Replace React Hook Form `watch()` render-time usage with `useWatch()` where warned.
   - Replace profile avatar `<img>` usage with `next/image` where applicable.
   - Remove the unused import in `Header.tsx`.
   - Fix the unnecessary `useMemo` dependency in `MuiThemeProvider.tsx`.
   - Add `lint --max-warnings=0` once warnings are fixed.
   - Acceptance: lint passes with zero warnings.

5. [ ] Add quality scripts and CI checks.
   - Add scripts for `typecheck`, `format`, `test`, and `test:e2e` as appropriate.
   - Add a GitHub Actions workflow for pull requests that runs lint, typecheck, and build.
   - Add test commands to CI once the test foundation exists.
   - Acceptance: every PR validates formatting/linting, TypeScript, and production build before merge.

6. [ ] Add the first testing foundation.
   - Unit test normalization utilities, red-flag logic, document utilities, and API response handling.
   - Component test form validation, profile sections, table empty/loading/error states, and important clinical UI branches.
   - Add Playwright smoke tests for sign-in redirect, patients list, patient detail tabs, and intake submission happy path.
   - Add API route tests for auth enforcement and proxy behavior.
   - Acceptance: CI has meaningful coverage for core clinical, auth, and proxy behavior.

7. [ ] Convert top-level pages to server-first data loading.
   - Prioritize dashboard, patients, consultations, prescriptions, profile, and admin pages.
   - Fetch initial data in Server Components through `ApiClient` where possible.
   - Pass serializable initial data into client leaves or hydrate TanStack Query.
   - Acceptance: primary page content no longer waits for client hydration before starting initial data fetches.

8. [ ] Replace global infinite React Query freshness with bounded policies.
   - Remove risky global `staleTime: Infinity` defaults for clinical data.
   - Use safer global defaults such as 30–60 seconds.
   - Override individual static/read-mostly queries intentionally.
   - Ensure mutations invalidate every affected query.
   - Acceptance: patient/clinical data refreshes predictably across tabs, sessions, focus, and reconnect events.

9. [ ] Add explicit 404 and normalized error handling.
   - Use `notFound()` when patient detail data is missing or a backend 404 is returned.
   - Extend the pattern to missing documents and other detail routes.
   - Normalize API error display across list, detail, tab, and sheet UIs.
   - Acceptance: missing records render proper 404 pages, and recoverable API errors show consistent user-facing states.

10. [ ] Optimize heavy client bundles.
    - Dynamically load heavy UI that is not needed for the first paint: Recharts charts, MUI DataGrid-heavy tables, Tiptap editor, calendar UI, and rarely opened sheets/dialogs.
    - Verify whether `optimizePackageImports` helps large packages before enabling broadly.
    - Acceptance: route-level JavaScript is reduced without delaying primary content or breaking interactions.

11. [ ] Add selective server-side deduplication and safe caching.
    - Use `React.cache()` for per-request deduplication of repeated server fetches.
    - Keep sensitive or fast-changing clinical data dynamic unless explicitly safe to cache.
    - Use tag-based revalidation only for safe read-mostly data such as entities, profile metadata, or lookup data.
    - Acceptance: repeated server reads are deduplicated without introducing stale clinical data risks.

12. [ ] Add Suspense boundaries for slower sections.
    - Split slower dashboard chart/activity sections into Suspense boundaries.
    - Consider Suspense for patient detail secondary tabs, prescriptions, and consultations.
    - Acceptance: shells and primary content render quickly while slower sections stream or load progressively.

13. [ ] Clean up design-system drift.
    - Remove or justify hardcoded hex fallbacks in `src/lib/mui-tokens.ts` by moving values to token sources or documenting an allowed exception.
    - Make empty states and filter-bar patterns consistent on main list pages.
    - Acceptance: design audit rules pass and main lists use consistent shared UI patterns.

14. [ ] Consolidate or document bespoke API routes.
    - Decide which routes must remain outside `/api/proxy/[...path]`.
    - Document each bespoke route’s responsibility and auth expectations.
    - Consolidate routes that do not need special server-side behavior.
    - Acceptance: future devs can tell when to add a proxy-backed endpoint versus a bespoke route handler.

15. [ ] Refresh project documentation.
    - Update README references from NextAuth to Clerk.
    - Replace old auth environment variables with current Clerk and backend variables.
    - Correct route documentation such as `/login` versus `/sign-in`.
    - Document production readiness caveats that still remain after the above work.
    - Acceptance: onboarding and deployment docs match the actual app.

16. [ ] Verify dependency and audit caveats.
   - Check `lucide-react` against the lockfile and current npm metadata before changing it.
   - Track the moderate Next/PostCSS audit advisories and update when a safe fix is available.
   - Keep React Compiler optional until the codebase is tested against it.
   - Acceptance: dependency changes are evidence-based and do not introduce unnecessary churn.