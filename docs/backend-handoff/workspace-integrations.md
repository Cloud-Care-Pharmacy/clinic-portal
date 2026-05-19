# Backend Handoff — Workspace Integrations

**Owner (frontend):** Patient Portal — `src/components/workspace/WorkspaceIntegrationsSection.tsx`
**Target backend:** `prescription-gateway` (Cloudflare Worker, D1 + KV)
**Status:** Frontend shipped against `localStorage`. Backend persistence not yet implemented.
**Branches with current UI:** `main`, `dev` (commit `00c1c8d`)

---

## 1. What exists today

A new **Integrations** tab in `/workspace` (admin-only) shows a catalog of providers
(Shopify, Stripe, Xero, Mailchimp). Each card opens an `AppSheet` sidebar with a form
for credentials and sync settings. State is currently persisted **only in the browser**
under the localStorage key:

```
workspace-integrations:<entityId>
```

This must be replaced with real backend storage before the feature is used in production.
The localStorage code can be deleted once endpoints are live.

---

## 2. Data model

Suggested D1 table:

```sql
CREATE TABLE workspace_integrations (
  id              TEXT PRIMARY KEY,                  -- uuid
  entity_id       TEXT NOT NULL,
  provider        TEXT NOT NULL,                     -- 'shopify' | 'stripe' | 'xero' | 'mailchimp'
  connected       INTEGER NOT NULL DEFAULT 0,        -- 0/1
  account_id      TEXT,                              -- store/account identifier (plain)
  api_key_enc     TEXT,                              -- encrypted at rest
  api_secret_enc  TEXT,                              -- encrypted at rest
  webhook_secret_enc TEXT,                           -- encrypted at rest
  sync_mode       TEXT NOT NULL DEFAULT 'manual',    -- 'manual' | 'hourly' | 'daily'
  auto_sync       INTEGER NOT NULL DEFAULT 0,
  configured_at   TEXT,                              -- ISO timestamp
  last_sync_at    TEXT,
  last_sync_status TEXT,                             -- 'success' | 'failed' | 'running'
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (entity_id, provider)
);
```

**Encryption**

- Encrypt all `*_enc` columns with a key from Cloudflare secrets (e.g. AES-GCM via Workers crypto).
- Never return raw secrets in responses. Use a masked echo, e.g. `sk_live_••••1234` or just a boolean `hasApiSecret`.

---

## 3. API contract

All endpoints sit under the existing gateway pattern. Auth and role checks must match
the existing workspace endpoints (admin-only, entity scoping via `X-API-Key` + Clerk
session passed through `clerkUserId` query/header).

### 3.1 Types (must match `src/types/index.ts` after sync)

```ts
export type IntegrationProvider = "shopify" | "stripe" | "xero" | "mailchimp";
export type IntegrationSyncMode = "manual" | "hourly" | "daily";
export type IntegrationSyncStatus = "success" | "failed" | "running";

export interface WorkspaceIntegration {
  id: string;
  entityId: string;
  provider: IntegrationProvider;
  connected: boolean;
  accountId: string | null;
  // Secrets are NEVER returned in plaintext.
  hasApiKey: boolean;
  hasApiSecret: boolean;
  hasWebhookSecret: boolean;
  apiKeyMasked: string | null;       // e.g. "sk_live_••••1234"
  syncMode: IntegrationSyncMode;
  autoSync: boolean;
  configuredAt: string | null;       // ISO
  lastSyncAt: string | null;         // ISO
  lastSyncStatus: IntegrationSyncStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertWorkspaceIntegrationPayload {
  provider: IntegrationProvider;
  accountId: string;
  apiKey?: string;          // omit to keep existing
  apiSecret?: string;       // omit to keep existing
  webhookSecret?: string;   // omit to keep existing
  syncMode: IntegrationSyncMode;
  autoSync: boolean;
}
```

### 3.2 Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/entities/:entityId/integrations` | List all integrations for the entity |
| GET    | `/api/entities/:entityId/integrations/:provider` | Get one integration |
| PUT    | `/api/entities/:entityId/integrations/:provider` | Create or update (upsert) credentials + settings |
| POST   | `/api/entities/:entityId/integrations/:provider/test` | Validate credentials against the provider, no persistence |
| POST   | `/api/entities/:entityId/integrations/:provider/sync` | Trigger a manual sync |
| DELETE | `/api/entities/:entityId/integrations/:provider` | Disconnect (sets `connected=0`, optionally clears secrets) |

**Response envelope** (matches existing workspace endpoints):

```json
{ "success": true, "data": { "integration": WorkspaceIntegration } }
{ "success": true, "data": { "integrations": WorkspaceIntegration[] } }
```

**Error envelope:**

```json
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }
```

Common error codes the UI should be ready for: `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND`, `INVALID_CREDENTIALS`, `PROVIDER_UNREACHABLE`, `RATE_LIMITED`.

### 3.3 Validation rules

- `provider` ∈ enum above.
- `syncMode` ∈ enum above.
- `accountId` required when `connected=true`.
- `apiKey` + `apiSecret` required on first connect; optional on subsequent updates (omit = keep).
- Reject `PUT` if entity doesn't exist or caller role ≠ `admin`.

---

## 4. Auth & RBAC

- All routes admin-only. Mirror the check used by `GET /api/users` and the existing entity settings endpoints.
- Audit log entries on `PUT`, `DELETE`, `test`, `sync`. Use the existing audit table; action names suggested: `integration.connected`, `integration.updated`, `integration.disconnected`, `integration.tested`, `integration.synced`.

---

## 5. Frontend wiring once endpoints exist

The frontend changes will be small. Order of work:

1. **Types** — add the interfaces above to `src/types/index.ts`.
2. **ApiClient** — add server methods in `src/lib/api.ts`:
   - `listIntegrations(entityId, clerkUserId)`
   - `upsertIntegration(entityId, provider, payload, clerkUserId)`
   - `deleteIntegration(entityId, provider, clerkUserId)`
   - `testIntegration(entityId, provider, payload, clerkUserId)`
   - `triggerIntegrationSync(entityId, provider, clerkUserId)`
3. **Hooks** — add `src/lib/hooks/use-workspace-integrations.ts` with TanStack Query
   wrappers calling `/api/proxy/api/entities/:entityId/integrations/...`. Invalidate
   `["workspace-integrations", entityId]` on every mutation.
4. **Server page** — `src/app/(dashboard)/workspace/page.tsx` already does parallel
   `Promise.all` fetches. Add `api.listIntegrations(entityId, userId)` to that block
   and pass `initialIntegrations` down to `WorkspaceClient` → `WorkspaceIntegrationsSection`.
5. **Component** — replace the `localStorage` logic in
   `src/components/workspace/WorkspaceIntegrationsSection.tsx`:
   - Drop `getStoredIntegrationsState`, `getStorageKey`, the `localStorage`
     `useEffect`, and the in-memory `state` reducer.
   - Use the new hooks for read + mutate.
   - Keep the catalog, AppSheet, and form structure as-is.
6. **Secret handling** — on edit, pre-fill `apiKey` / `apiSecret` / `webhookSecret`
   as **empty** with a placeholder like `"Leave blank to keep existing"`. Only send
   fields the user changes.

---

## 6. Out of scope for v1 (note for backend planning)

These are likely follow-ups; not blocking the first ship but worth designing for:

- **OAuth flows** for Shopify/Stripe/Xero/Mailchimp instead of pasted keys. Will need
  a callback route (`/api/integrations/:provider/oauth/callback`) and per-provider
  token refresh.
- **Sync runs table** with per-run status, counts, and errors. The UI already shows
  `lastSyncAt` / `lastSyncStatus` and can add a history pane later.
- **Webhook receiver** route per provider (e.g. `/webhooks/shopify`) with HMAC
  verification using `webhookSecret`.

---

## 7. Acceptance checklist

- [ ] D1 migration applied; `UNIQUE (entity_id, provider)` enforced.
- [ ] All five endpoints implemented and admin-gated.
- [ ] Secrets encrypted at rest; never returned in plaintext.
- [ ] `test` endpoint calls the provider and returns a typed error on failure.
- [ ] Audit log entries emitted for connect / update / disconnect / sync.
- [ ] OpenAPI / gateway types updated so the frontend `backend-sync` agent can pull them.
- [ ] Sample `curl` for each endpoint shared with frontend so we can wire `ApiClient`.

---

## 8. Contact / artefacts

- Current UI commit: `00c1c8d` on `main` and `dev`.
- Current file: [src/components/workspace/WorkspaceIntegrationsSection.tsx](../../src/components/workspace/WorkspaceIntegrationsSection.tsx)
- Mount point: [src/app/(dashboard)/workspace/WorkspaceClient.tsx](../../src/app/(dashboard)/workspace/WorkspaceClient.tsx)
- Existing workspace endpoints to mirror (auth + envelope shape):
  `GET /api/users`, `GET /api/users/invitations`, `GET /api/entities/:entityId/settings`.
