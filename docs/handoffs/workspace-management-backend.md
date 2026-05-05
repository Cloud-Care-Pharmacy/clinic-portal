# Workspace Management backend handoff

The Workspace Management UI is intentionally wired to real backend contracts only. It does not include browser-only mock persistence or client-side Clerk invitation calls.

## Auth and identifiers

Every admin request must include:

- `X-API-Key: <gateway secret>`
- `X-Clerk-User-Id: <clerk user id>`
- `Content-Type: application/json` for writes

The gateway resolves `X-Clerk-User-Id` to the internal `users.id` and enforces `role=admin`.

All `userId` and `invitationId` values exposed by these endpoints are internal `users.id` UUIDs. Do not send Clerk `user_xxx` ids back to the gateway.

## Response envelope

Success:

```json
{ "success": true, "data": { } }
```

Error:

```json
{ "success": false, "error": "Message", "details": "...", "code": "..." }
```

Common statuses: `400` validation, `401` missing auth headers, `403` non-admin/deactivated caller, `404` not found, `409` duplicate pending invite, `502` Clerk call failed, `503` Clerk not configured.

## Endpoints

### Staff list — `GET /api/users`

Use for the Workspace Management users table.

Query params: `entityId`, `role=admin|doctor|staff`, `status=pending|active|invited|revoked`, `includeDeactivated=true`, `limit`, `offset`.

Returns `{ data: { users, pagination } }`. Rows include internal `id`, nullable `authId`, nullable `role`, `status`, `entityId`, name/email/phone fields, invitation fields, timestamps, and deactivation fields.

`GET /api/staff` also exists and merges live Clerk profile data such as image and last sign-in metadata.

### Update staff profile — `PATCH /api/staff/:userId`

Partial body: `firstName`, `lastName`, `phone`, `email`. Returns `{ data: { profile } }`.

### Update role — `PATCH /api/staff/:userId/role`

Body: `{ "role": "admin" | "doctor" | "staff" }`. Returns `{ data: { profile, clerkSynced, clerkSyncError } }`.

### Deactivate or restore — `DELETE /api/staff/:userId[?restore=true]`

Soft-delete and Clerk lock are best-effort. Admins cannot deactivate themselves.

### Create invitation — `POST /api/staff/invitations`

Frontend submits `email`, `role`, and optionally `entityId`.

Backend also accepts future fields `redirectUrl` and `notify`.

Returns `{ data: { invitation, clerkInvitationUrl } }`, where `invitation.invitationId` is the internal `users.id` to use for resend/revoke.

### List invitations — `GET /api/staff/invitations`

Query params: `status` (default `invited`; accepts `pending`), `entityId`, `limit`, `offset`.

Returns `{ data: { invitations, pagination } }`.

### Resend invitation — `POST /api/staff/invitations/:invitationId/resend`

Optional body: `redirectUrl`, `notify`. Best-effort revokes the old Clerk invitation, creates a new one, and refreshes local invitation metadata.

### Revoke invitation — `DELETE /api/staff/invitations/:invitationId`

Marks the local row `status='revoked'` and best-effort revokes the Clerk invitation. A `clerkRevokeError` can be treated as a soft warning because the local revoke succeeded.

### Workspace settings — `GET /api/entities/:entityId/settings`

Returns `{ data: { settings } }` with identity, read-only `tenantDomain` and `emailPrefix`, active status, business phone/email, ABN, address, and timestamps.

### Update workspace settings — `PUT /api/entities/:entityId/settings`

Partial-friendly. Writable fields: `name`, `isActive`, `businessPhone`, `businessEmail`, `abn`, and `address`. `tenantDomain` and `emailPrefix` are ignored if posted.

Validation: ABN must be 11 digits after stripping spaces, business email must be valid, name is required and ≤200 chars, address fields are ≤200 chars.

## Out of scope

- Branding/theme settings
- Audit log UI
- Multi-workspace switching
- Hard-delete user flows
