# Workspace Management backend handoff

The Workspace Management UI is intentionally wired to real backend contracts only. It does not include browser-only mock persistence or client-side Clerk invitation calls.

## Needed endpoints

- `GET /api/staff` or `GET /api/users?entityId=...`
- `PATCH /api/staff/:userId/role`
- `PATCH /api/staff/:userId`
- `POST /api/staff/invitations`
- `GET /api/staff/invitations?status=pending`
- `POST /api/staff/invitations/:invitationId/resend`
- `DELETE` or `PATCH` revoke for `/api/staff/invitations/:invitationId`
- `GET /api/entities/:entityId/settings`
- `PUT /api/entities/:entityId/settings`

## Frontend expectations

- User ids are internal `users.id` UUIDs, not Clerk auth ids.
- Invitations currently submit only `email` and `role` until the backend defines optional fields.
- Entity settings MVP includes identity, active status, business contact, ABN, and address fields only.
- Branding, theme toggles, audit logs, multi-workspace switching, and hard-delete user flows are excluded for now.
