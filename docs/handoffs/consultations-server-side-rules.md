# Backend Handoff: Consultations — Move Business Logic Server-Side

**Project:** Cloud Care Pharmacy Clinic Portal
**Frontend repository:** `clinic-portal`
**Backend repository:** `prescription-gateway` (Cloudflare Worker)
**Section:** Consultations (`/api/consultations`)
**Date:** 2026-05-02
**Prepared for:** Backend team

## 1. Context

The clinic portal Consultations section is feature-complete from a UX standpoint. While auditing the code we found that several pieces of **business logic and data-integrity rules currently live in the React client**. They need to move to the backend before we close out the section.

This document lists each rule, the problem it creates, the proposed backend behavior, and the request/response contract changes needed.

The frontend will be updated to match in a follow-up PR (see §6 for sequencing). All changes should be **backwards-compatible**: the server starts ignoring/overriding fields, then the frontend stops sending them.

## 2. Conventions assumed

- Same envelope as existing consultation endpoints: `{ success, data, error? }`
- All timestamps are ISO-8601 UTC strings
- Caller identity from `X-Clerk-User-Id` (mapped to a `users` row with a role: `admin | doctor | staff`)
- New error codes follow the existing pattern: `{ success: false, error: { code, message, details? } }`

## 3. Required changes

Each item is independently shippable. Items 1–7 can land in a single PR; item 8 (conflict detection) is the largest and may be its own PR.

---

### 3.1 `completedAt` must be server-generated

**Problem.** Today the client sends `completedAt: new Date().toISOString()` when marking a consultation completed. That uses the browser clock and timezone — bad for an audit field.

**Backend rule.**

- On `PATCH /api/consultations/:id`, when the request transitions `status` to `completed`:
  - Set `completedAt = <server now, UTC>`.
  - **Ignore** any `completedAt` value sent by the client.
- When `status` transitions away from `completed` (admin only — see §3.2), clear `completedAt`.
- For all other status changes, leave `completedAt` untouched.

**Contract change.** `completedAt` becomes a read-only, server-managed field.

---

### 3.2 Status state machine enforcement

**Problem.** The form lets users set any status, and the client clears `completedAt` when status is not `completed`. There is no transition guard, so a buggy or malicious client can move a `completed` consultation back to `scheduled` and silently null its `completedAt`.

**Backend rule.** Allowed transitions:

| From → To   | `scheduled` | `completed` | `cancelled` | `no-show`  |
| ----------- | ----------- | ----------- | ----------- | ---------- |
| `scheduled` | —           | ✅          | ✅          | ✅         |
| `completed` | admin only  | —           | admin only  | admin only |
| `cancelled` | admin only  | admin only  | —           | admin only |
| `no-show`   | admin only  | admin only  | admin only  | —          |

- Non-admin callers attempting an illegal transition get `409 Conflict`:
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_STATUS_TRANSITION",
      "message": "Cannot move consultation from completed to scheduled.",
      "details": { "from": "completed", "to": "scheduled", "allowed": [] }
    }
  }
  ```
- On creation (`POST`), `status` is always forced to `scheduled` regardless of payload.

---

### 3.3 Server defaults `doctorId` and authorizes assignment

**Problem.** The client does `doctorId = consultation?.doctorId || currentUserId`. Any client can put any user id in `doctorId`.

**Backend rule.** On `POST /api/consultations`:

- If `doctorId` is omitted → default to the caller (`X-Clerk-User-Id`).
- If `doctorId` is provided:
  - Caller is `admin` → allow any active doctor.
  - Caller is `doctor` → must equal caller's own id.
  - Caller is `staff` → must reference a doctor in the same clinic/entity.
- Reject with `403 FORBIDDEN_DOCTOR_ASSIGNMENT` otherwise.

Same rules apply on `PATCH` when `doctorId` is being changed.

---

### 3.4 `doctorName` and `patientName` are server-derived

**Problem.** Both names are sent in the create/update payload as free text. A client can write "Dr. House" against an unrelated user id, and stored names drift if a user later renames themselves.

**Backend rule.**

- Drop `doctorName` and `patientName` from accepted request bodies (or accept-and-ignore for one release).
- On every write, look up the names from `doctorId` / `patientId` and store the snapshot on the consultation row.
- Continue returning both fields on read (no response shape change).

---

### 3.5 Default `duration` from `type`

**Problem.** "Initial = 45 min, follow-up = 30 min, renewal = 15 min" exists only in the client.

**Backend rule.**

- Define server-side defaults:
  - `initial` → 45
  - `follow-up` → 30
  - `renewal` → 15
- On `POST` when `duration` is omitted, fill from this map.
- On `PATCH` when `type` changes and `duration` is not explicitly provided, leave existing `duration` alone (do not auto-resize).

**Optional but nice.** New endpoint:

```http
GET /api/consultation-types
```

```json
{
  "success": true,
  "data": {
    "types": [
      { "value": "initial", "label": "Initial", "defaultDurationMinutes": 45 },
      { "value": "follow-up", "label": "Follow-up", "defaultDurationMinutes": 30 },
      { "value": "renewal", "label": "Renewal", "defaultDurationMinutes": 15 }
    ]
  }
}
```

---

### 3.6 Empty-string normalization for `notes` / `outcome`

**Backend rule.** Treat `""` (empty string after trim) as `null` on write for `notes` and `outcome`. No response change.

---

### 3.7 Doctor facets endpoint

**Problem.** The client builds the doctor filter dropdown from whatever consultations are on the current page, so doctors with no recent consultations are missing.

**Backend rule.** New endpoint:

```http
GET /api/consultations/facets?from=<iso>&to=<iso>
```

Response:

```json
{
  "success": true,
  "data": {
    "doctors": [
      { "id": "user_xxx", "name": "Dr. Jane Smith", "consultationCount": 12 }
    ],
    "statuses": [
      { "value": "scheduled", "count": 30 },
      { "value": "completed", "count": 120 }
    ],
    "types": [
      { "value": "initial", "count": 10 },
      { "value": "follow-up", "count": 80 },
      { "value": "renewal", "count": 60 }
    ]
  }
}
```

`from`/`to` are optional and scope counts; the doctor list should always include all active doctors the caller can see, regardless of whether they have consultations in the window.

---

### 3.8 Conflict / double-booking detection (largest change)

**Problem.** The client filters the doctor's day in JS to warn about overlaps. It is advisory only, race-prone, and capped at 100 results.

**Backend rule.** Two pieces:

#### 3.8.1 Conflict-check endpoint (used for live UX feedback)

```http
GET /api/consultations/conflicts
  ?doctorId=<id>
  &scheduledAt=<iso>
  &duration=<minutes>
  &excludeId=<consultation_id>      # optional, when editing
```

Returns consultations that overlap the proposed window for that doctor:

```json
{
  "success": true,
  "data": {
    "conflicts": [
      {
        "id": "...",
        "patientId": "...",
        "patientName": "...",
        "scheduledAt": "...",
        "duration": 30,
        "status": "scheduled"
      }
    ]
  }
}
```

Only consultations with status `scheduled` should be considered conflicts.

#### 3.8.2 Hard enforcement at write time

`POST` and `PATCH` must re-run the same overlap check inside the same transaction as the write. On conflict, return:

```json
HTTP/1.1 409 Conflict
{
  "success": false,
  "error": {
    "code": "CONSULTATION_CONFLICT",
    "message": "This time slot conflicts with an existing scheduled consultation.",
    "details": { "conflicts": [ /* same shape as 3.8.1 */ ] }
  }
}
```

#### 3.8.3 Admin override

Accept an optional query parameter `?force=true` on `POST`/`PATCH`. When present **and** caller is `admin`, skip the conflict check. Any other caller passing `force=true` should be ignored (treat as not present), not rejected.

---

### 3.9 (Optional) Timezone-aware date filters

Today the client sends `from`/`to` as ISO instants computed from `startOfDay`/`endOfDay` in the **browser's local TZ**. Two users in different TZs see different result sets for the "same" day filter.

**Proposed.** Either:

- Document that `from`/`to` are exact UTC instants (no change), and the frontend will surface the active TZ to the user, **or**
- Accept `?date=YYYY-MM-DD&tz=Australia/Sydney` as an alternative to `from`/`to` and resolve the day window server-side.

Either is fine; please pick one and confirm so the frontend can match.

## 4. Out of scope

The following are **explicitly not** part of this handoff (deferred to v2):

- Recurring/series appointments
- Drag-to-reschedule conflict re-validation
- Email/SMS reminders, ICS export, telehealth links
- Waitlist, billing, insurance metadata
- Audit log of status changes (nice-to-have; can be added later without API changes)

## 5. Summary of request/response changes

| Endpoint                           | Change                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/consultations`          | Force `status=scheduled`; default `doctorId` and `duration`; derive `doctorName`/`patientName`; reject if conflict (3.8.2). Stop trusting `completedAt`. |
| `PATCH /api/consultations/:id`     | Enforce status state machine (3.2); manage `completedAt` (3.1); re-derive names; re-check conflicts; authorize `doctorId` change.                        |
| `GET /api/consultations`           | No request change. Optionally accept `?date=&tz=` (3.9).                                                                                                 |
| `GET /api/consultations/conflicts` | **New.** See 3.8.1.                                                                                                                                      |
| `GET /api/consultations/facets`    | **New.** See 3.7.                                                                                                                                        |
| `GET /api/consultation-types`      | **New, optional.** See 3.5.                                                                                                                              |

## 6. Rollout sequencing

1. **Backend PR 1** — items 3.1, 3.2, 3.3, 3.4, 3.5, 3.6. All backwards-compatible (server starts ignoring/overriding client fields).
2. **Frontend PR 1** — stop sending `completedAt`, `doctorName`, `patientName`, `status` on create, etc. Land any time after Backend PR 1 ships.
3. **Backend PR 2** — items 3.7 (facets) and 3.8 (conflicts).
4. **Frontend PR 2** — replace `findConflicts` with the new endpoint + handle `409 CONSULTATION_CONFLICT` from writes. Replace doctor-filter `useMemo` with the facets endpoint.
5. **Optional follow-up** — 3.9 timezone handling.

## 7. Open questions for the backend team

1. Confirm the role names used in `users` (`admin | doctor | staff`?) and which one should be allowed to use `?force=true`.
2. Confirm whether transitioning _out_ of `completed`/`cancelled`/`no-show` should be allowed at all (currently proposed: admin only). If never, simplify 3.2.
3. Confirm whether `doctorId` is a Clerk user id or an internal `users.id` — the frontend currently uses the Clerk id.
4. For 3.9, which option do you prefer (UTC-only vs `?date=&tz=`)?
5. Should the facets endpoint scope by clinic/entity automatically based on caller, or accept an `entityId` query param?

Please reply on this doc (or in a backend ticket linking to it) with answers and a target ETA. The frontend changes are small and ready to follow within a day of each backend PR landing.
