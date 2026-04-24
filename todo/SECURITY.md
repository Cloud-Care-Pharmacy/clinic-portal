# Security Guide — Cloud Care Pharmacy Patient Portal

This document covers the security architecture, recommended configuration, and operational guidelines for the Patient Portal. Since this platform handles protected health information (PHI), all contributors and operators **must** follow these requirements.

---

## Authentication

The platform uses [Clerk](https://clerk.com) for authentication (Google OAuth, session-based).

### Clerk Dashboard Settings (Required)

Configure these in the Clerk Dashboard under **Sessions**:

| Setting | Recommended Value | Rationale |
|---|---|---|
| Session lifetime | **1 hour** | Limits window of exposure for stolen tokens |
| Inactivity timeout | **15 minutes** | HIPAA standard for health data applications |
| Multi-session | **Disabled** | Prevents concurrent sessions from different devices |
| Token rotation | **Enabled** | Rotating session tokens reduce replay attack risk |

### Auth Flow

```
Browser → Clerk (Google OAuth) → Session cookie → Next.js proxy → Backend
```

- All dashboard routes are protected by `src/proxy.ts` (`auth.protect()`)
- The dashboard layout (`src/app/(dashboard)/layout.tsx`) performs a server-side auth check as a second layer
- All API route handlers independently verify `auth()` — no route relies solely on the proxy

---

## Authorization (RBAC)

Three roles exist: `admin`, `doctor`, `staff` (default fallback).

| Route / Action | Allowed Roles |
|---|---|
| `/admin/*` | `admin` |
| `/prescriptions/*` | `admin`, `doctor` |
| Create consultation | `admin`, `doctor` |
| Delete consultation | `admin` |
| Update doctor-specific profile fields | `doctor` |
| All other authenticated routes | Any authenticated user |

Roles are stored in Clerk user `publicMetadata.role` and resolved via `getUserRole()` in `src/lib/auth.ts`.

---

## API Security

### Proxy Architecture

```
Browser → /api/proxy/[...path] → prescription-gateway (Cloudflare Worker)
```

- The `API_SECRET` is injected server-side via the `X-API-Key` header — **never exposed to the browser**
- The proxy validates authentication before forwarding any request
- A path allowlist restricts which backend routes can be accessed through the proxy

### Environment Variables

| Variable | Scope | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client | Yes | Clerk publishable key (safe for browser) |
| `CLERK_SECRET_KEY` | Server | Yes | Clerk secret — **never** prefix with `NEXT_PUBLIC_` |
| `API_SECRET` | Server | Yes | Backend API key — **never** prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_API_URL` | Client | Yes | Backend URL (no secrets in this value) |

**Critical:** If `API_SECRET` is empty or missing, the proxy must return `500 Internal Server Error` (fail-closed). Never forward requests with an empty API key.

### CSRF Protection

- Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) through the API proxy validate the `Origin` header against the application's own domain
- Cross-origin mutation requests are rejected with `403 Forbidden`

### Rate Limiting

- API proxy enforces per-user rate limits:
  - **Read operations (GET):** 100 requests/minute
  - **Write operations (POST/PUT/PATCH/DELETE):** 20 requests/minute
- Exceeding the limit returns `429 Too Many Requests`
- For production at scale, migrate from in-memory to distributed rate limiting (e.g., Upstash Redis)

---

## XSS Prevention

### Content Security Policy (CSP)

A CSP header is configured in `next.config.ts`. Key directives:

- `default-src 'self'` — only load resources from the app's own origin by default
- Clerk domains are explicitly allowlisted for scripts, connections, and frames
- `img-src` allows Clerk avatar URLs and `data:` URIs
- Start with `Content-Security-Policy-Report-Only` when modifying, then promote to enforcing

### HTML Sanitization

Any user-generated HTML rendered via `dangerouslySetInnerHTML` **must** be sanitized with DOMPurify:

```tsx
import DOMPurify from "dompurify";

// Always sanitize before rendering
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(untrustedHtml) }} />
```

Affected components:
- `src/components/consultations/ConsultationDetailSheet.tsx` — consultation notes and outcomes
- `src/components/patients/NotesTab.tsx` — patient notes

---

## Security Headers

Configured in `next.config.ts` for all routes:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unused browser APIs |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS |
| `Content-Security-Policy` | *(see CSP section)* | Prevents XSS and injection |

---

## File Uploads

- **Client-side validation:** File type allowlist and 10 MB size limit
- **Server-side validation:** Enforced by the `prescription-gateway` backend (Cloudflare Worker)
- Files are stored in Cloudflare R2 — never on the Next.js server filesystem
- The API proxy forwards upload requests as raw binary (multipart/form-data)

---

## Audit Logging

Sensitive operations are logged via structured JSON (`src/lib/audit.ts`):

- Patient record access
- Prescription views and modifications
- Document uploads and downloads
- Profile changes
- Failed authentication attempts (via Clerk webhooks)

Log format:
```json
{
  "timestamp": "2026-04-24T10:30:00Z",
  "userId": "user_abc123",
  "action": "patient.view",
  "resource": "patient:pat_456",
  "ip": "203.0.113.1",
  "userAgent": "Mozilla/5.0..."
}
```

In production, these logs should be forwarded to a SIEM or log aggregation service (e.g., Vercel Logs, Datadog, or AWS CloudWatch).

---

## Session & Idle Timeout

- **Server-side:** Clerk session lifetime and inactivity timeout (configured in Clerk Dashboard)
- **Client-side:** The `AuthProvider` component implements a 15-minute idle timer that auto-signs out the user after no mouse/keyboard activity
- This ensures unattended terminals in clinical environments are not left logged in

---

## Development Checklist

Before merging any PR, verify:

- [ ] All new API routes check `auth()` and return 401 if unauthenticated
- [ ] Mutating endpoints check user role via `requireRole()` where appropriate
- [ ] No `API_SECRET`, `CLERK_SECRET_KEY`, or other secrets in `NEXT_PUBLIC_*` env vars
- [ ] No `console.log` statements that could leak PHI or credentials
- [ ] Any `dangerouslySetInnerHTML` usage sanitizes input with DOMPurify
- [ ] New server-only modules import `"server-only"` to prevent client bundling
- [ ] File uploads validate type and size on both client and backend
- [ ] `npm run build` and `npx tsc --noEmit` pass without errors

---

## Infrastructure Recommendations

| Measure | Status | Notes |
|---|---|---|
| Clerk auth on all routes | ✅ Implemented | Proxy + layout + API handler layers |
| Security headers (HSTS, X-Frame, etc.) | ✅ Implemented | `next.config.ts` |
| CSP header | 🔲 To implement | Start with report-only mode |
| DOMPurify sanitization | 🔲 To implement | 3 `dangerouslySetInnerHTML` usages |
| Fail-closed API proxy | 🔲 To implement | Return 500 if `API_SECRET` missing |
| Path allowlist on proxy | 🔲 To implement | Restrict forwarded backend paths |
| `server-only` guard on `api.ts` | 🔲 To implement | Prevent client-side secret import |
| CSRF origin checking | 🔲 To implement | Validate Origin on mutations |
| Extended RBAC | 🔲 To implement | Role gates beyond `/admin` |
| Rate limiting | 🔲 To implement | In-memory, then Upstash Redis |
| Idle timeout auto-logout | 🔲 To implement | 15-min client-side timer |
| Audit logging | 🔲 To implement | Structured JSON logs |
| Vercel WAF / Firewall | 🔲 Recommended | IP blocking, geo-restriction, bot protection |
| Penetration test | 🔲 Recommended | Before handling real patient data |
