# Doctor Rosters backend handoff

The Doctor Rosters page (`/rosters` in `clinic-portal`) is currently rendered from a typed frontend mock at `src/lib/rosters-mock.ts`. The data model and React Query hooks (`src/lib/hooks/use-rosters.ts`) are stable; only the data source needs to flip. This document describes exactly what the frontend needs from the gateway.

Spec source of truth: [`ROSTERS_SPEC.md`](../../ROSTERS_SPEC.md) (especially §10 data model and §15 acceptance checklist).

---

## TL;DR

We need **two new gateway endpoints** that join existing practitioner / availability / consultation data into a single roster payload. We also need **one new resource** for leave/time-off because the existing availability schema only carries recurring office hours.

| Endpoint                                 | Purpose                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/rosters/week?start=YYYY-MM-DD` | Weekly grid for all active doctors in the entity                        |
| `GET /api/rosters/month?month=YYYY-MM`   | Month calendar — one row per calendar day with per-doctor shift summary |

Both should return wall-clock times in `Australia/Sydney` and use the standard `{ success, data }` envelope.

---

## Auth and identifiers

Same conventions as other gateway endpoints. Every request includes:

- `X-API-Key: <gateway secret>` (injected by the Next.js proxy)
- `X-Clerk-User-Id: <clerk user id>` (injected by the proxy after Clerk `auth()`)
- `Content-Type: application/json` for writes

The gateway resolves `X-Clerk-User-Id` to the internal `users.id`, scopes the response to that user's `entityId`, and marks the same user's row with `isMe: true` so the frontend can pin and badge it.

All `doctorId` values returned **must be internal `users.id` UUIDs** — same identifier already used on `consultations.doctorId` and `practitioners.userId`. The frontend will not translate Clerk ids.

---

## What we already have on the gateway

These exist today and the new roster endpoints should join over them rather than introducing a parallel schema:

- `GET /api/practitioners` — directory (id, displayName, role, active, email).
- `GET /api/practitioners/me/availability` — recurring weekly schedule (`AvailabilitySchedule`, Mon–Sun, slot-based, with `timezone` and `consultationTypes`).
- `GET /api/practitioners/:userId/free-slots?date=...` — open booking windows for one doctor on one day.
- `GET /api/consultations?from=&to=&doctorId=` — booked consultations in a date range, including `status` (`scheduled`, `in_progress`, `completed`, etc.) and `doctorId`/`patientName`/`scheduledAt`/`duration`.

**Gaps that require new schema or routes:**

1. **No leave / time-off model.** Availability is recurring office hours; there is no row that says "Dr Okonkwo is on Annual leave Mon–Fri this week." The roster grid needs a `leave` shift kind. **Please add a `practitioner_leave` resource** (see §"New resource" below) and join it into the roster response.
2. **No "read another practitioner's availability" route.** `/api/practitioners/me/availability` is `me`-only. The roster needs every active doctor's schedule. Either expose `GET /api/practitioners/:userId/availability` (admin/staff only) or — preferred — return availability inlined inside the roster response so the frontend never needs the per-user route.
3. **No clinic / location field on `practitioner_profiles`.** The spec models `clinic` as one of `Surry Hills | Newtown | Telehealth`. If clinics aren't in the schema yet, return `clinic: null` on each row and we will hide the line in the UI; but please confirm the canonical list and where it will live (`practitioner_profiles.primary_clinic`?).

---

## Endpoint 1 — `GET /api/rosters/week`

### Request

| Param             | Required | Notes                                                                                                                       |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `start`           | yes      | ISO date `YYYY-MM-DD`. **Must be a Monday** (en-AU week start). Gateway should 400 otherwise rather than silently snapping. |
| `entityId`        | no       | Defaults to the caller's entity. Reject if caller has no membership.                                                        |
| `includeInactive` | no       | Boolean, default `false`.                                                                                                   |

### Response

```json
{
  "success": true,
  "data": {
    "weekStart": "2026-05-04",
    "weekEnd": "2026-05-10",
    "timezone": "Australia/Sydney",
    "doctors": [
      {
        "id": "usr_…",
        "name": "Dr Amelia Choi",
        "specialty": "GP",
        "clinic": "Surry Hills",
        "phone": "+61 2 9000 1001",
        "joined": "Mar 2023",
        "isMe": true,
        "week": [
          {
            "kind": "available",
            "start": "08:00",
            "end": "16:00",
            "booked": 8,
            "capacity": 12
          },
          {
            "kind": "available",
            "start": "09:00",
            "end": "17:00",
            "booked": 6,
            "capacity": 12
          },
          {
            "kind": "busy",
            "start": "09:00",
            "end": "17:00",
            "booked": 9,
            "capacity": 12,
            "consultations": [
              {
                "id": "cons_…",
                "start": "14:00",
                "end": "14:30",
                "patientName": "Anika Patel",
                "patientShortName": "A. Patel",
                "type": "Follow-up",
                "status": "in_progress"
              }
            ]
          },
          {
            "kind": "available",
            "start": "09:00",
            "end": "17:00",
            "booked": 4,
            "capacity": 12
          },
          {
            "kind": "available",
            "start": "08:00",
            "end": "13:00",
            "booked": 5,
            "capacity": 7
          },
          { "kind": "off" },
          { "kind": "off" }
        ]
      }
    ]
  }
}
```

### Hard rules

- `doctors[].week` is **always length 7**, ordered Mon → Sun, regardless of how many shifts the doctor actually has.
- Times are wall-clock `HH:mm` 24h in `Australia/Sydney`. No ISO timestamps inside `week`.
- A day with no shift → `{ "kind": "off" }`. Do not omit the entry.
- A day fully covered by a leave entry → `{ "kind": "leave", "note": "Annual leave" }`. Note string is what the spec's drawer renders; keep it short.
- A day with a working shift → `{ "kind": "available", start, end, booked, capacity }`. **Multi-segment shifts are out of scope for v1** — collapse to one block (earliest `start`, latest `end`). If you can't, raise it before build and we'll widen the schema to `segments[]`.
- Promote the kind to `"busy"` **only for the day equal to "today" in `Australia/Sydney`**, and only if there is a consultation with `status === "in_progress"` for that doctor right now. Other days stay `"available"`. (Reason: pulse + live-slot UI is a "right now" affordance, not historical state.)
- Include the `consultations` array **only on today's busy entry**. Each consultation needs `id`, `start`, `end` (wall-clock), `patientName`, `patientShortName` (frontend can compute, but please return it so screen-reader output stays consistent across surfaces), `type`, and `status` ∈ `done | in_progress | upcoming`. Sort by `start` ascending.
- `isMe` is `true` on the doctor row that matches the resolved Clerk user, `false` (or omitted) otherwise. Exactly one row may have `isMe: true`.
- `doctors[]` should include every active practitioner in the entity with `role === "doctor"`. Sort: `isMe` first, then `displayName` ascending. (Frontend will respect server order.)

### Derivation hints

- `start`/`end` per day comes from the doctor's `availability.schedule[<weekday>].slots[0]` (collapsed if multiple).
- `capacity` per day = `floor((end - start) / consultDuration)` where `consultDuration` is whatever the entity already uses to compute free-slots (typically 30 min). If you have a per-doctor default, use that.
- `booked` per day = count of `consultations` for that doctor whose `scheduledAt` falls inside the day in `Australia/Sydney`, excluding cancelled/no-show.
- `leave` overrides `available` when a `practitioner_leave` row covers that calendar day.
- "Today" for the busy promotion = `now()` truncated to date in `Australia/Sydney`.

---

## Endpoint 2 — `GET /api/rosters/month`

### Request

| Param      | Required | Notes                                             |
| ---------- | -------- | ------------------------------------------------- |
| `month`    | yes      | `YYYY-MM`. Gateway should 400 on malformed input. |
| `entityId` | no       | Same scoping rule as above.                       |

### Response

```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "monthStart": "2026-05-01",
    "monthEnd": "2026-05-31",
    "timezone": "Australia/Sydney",
    "days": [
      {
        "date": "2026-04-27",
        "inMonth": false,
        "shifts": [
          {
            "doctorId": "usr_…",
            "initials": "AC",
            "shift": {
              "kind": "available",
              "start": "08:00",
              "end": "16:00",
              "booked": 8,
              "capacity": 12
            }
          }
        ]
      },
      {
        "date": "2026-05-06",
        "inMonth": true,
        "shifts": [
          {
            "doctorId": "usr_…",
            "initials": "AC",
            "shift": {
              "kind": "busy",
              "start": "09:00",
              "end": "17:00",
              "booked": 9,
              "capacity": 12
            }
          },
          {
            "doctorId": "usr_…",
            "initials": "JO",
            "shift": { "kind": "leave", "note": "Annual leave" }
          }
        ]
      }
    ]
  }
}
```

### Hard rules

- Return a **6-row grid** (42 entries) starting from the Monday on/before `monthStart` and ending on the Sunday on/after `monthEnd`. Spill cells get `inMonth: false`.
- `shifts[]` only includes doctors who have a non-`off` shift that day. Off doctors are omitted to keep payload tight.
- The frontend caps the visible chips at 5 per cell and renders a `+N more` badge for the remainder; please don't truncate server-side — return the full list.
- `initials` is the rendered avatar label. Compute from `displayName` (first letter of first part + first letter of last part, uppercase). We need it for the chips in the month grid; computing client-side is fine but server-side keeps it consistent with the week grid avatars.
- Same `kind` rules as the week endpoint (`available | busy | leave | off`), with `busy` only on today's row.

---

## New resource — `practitioner_leave`

This is the unblocker for the `leave` shift kind. Suggested shape — confirm before build:

```sql
CREATE TABLE practitioner_leave (
  id           TEXT PRIMARY KEY,
  practitioner_id TEXT NOT NULL REFERENCES users(id),
  entity_id    TEXT NOT NULL REFERENCES entities(id),
  start_date   TEXT NOT NULL,           -- 'YYYY-MM-DD'  (inclusive)
  end_date     TEXT NOT NULL,           -- 'YYYY-MM-DD'  (inclusive)
  kind         TEXT NOT NULL,           -- 'annual' | 'sick' | 'personal' | 'other'
  note         TEXT,                    -- short label, e.g. "Annual leave"
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT
);
```

**For v1 we don't need a UI to manage these** — a manual insert path or an admin-only `POST /api/practitioner-leave` is enough. The roster endpoints just need to read from this table and turn matching days into `{ kind: "leave", note }`.

If the gateway can't add this resource in v1, we will **drop the `leave` shift kind from the UI** and ship with `available | busy | off` only. Please confirm either way.

---

## Things that don't need to change

- The frontend already has `RosterDoctor`, `Shift`, `RosterWeekResponse`, `RosterMonthResponse` types in [`src/types/index.ts`](../../src/types/index.ts) matching the shapes above. **Please match field names and casing exactly.**
- The Next.js proxy (`/api/proxy/[...path]`) will inject auth headers — no separate proxy route needed for `/api/rosters/*`.
- React Query keys are `["roster-week", weekStartISO]` and `["roster-month", monthISO]` and that won't change.
- The frontend computes range labels, today highlighting, and density on the client. No need to return formatted strings.

---

## Open questions for backend

1. **Clinic field** — is this already on `practitioner_profiles` (or somewhere) under a different name? If not, where should it land? Returning `clinic: null` is acceptable for v1; the UI hides the spec line gracefully.
2. **Multi-segment shifts** — do we ever have a doctor working `09–12` then `14–18` on the same day? If yes, the v1 collapse rule loses information; we should add `Shift.segments[]` from day one.
3. **`capacity` per day** — confirm the slot-duration source. Per-doctor default? Per-entity default? Hardcoded 30 min?
4. **Booked-count rules** — confirm which consultation statuses count toward `booked`. Recommendation: count `scheduled` and `in_progress`; exclude `cancelled`, `no_show`, `completed_without_visit` (or equivalent).
5. **"Today" timezone** — confirm the gateway can resolve "now in `Australia/Sydney`" for the busy-promotion rule. If not, return `today` as a top-level field on the week response and we'll do the promotion client-side.
6. **Leave resource scope** — green-light the `practitioner_leave` table, or tell us to ship without `leave` and we'll drop the kind from the frontend.

Once these are confirmed, the frontend swap is just:

1. Add `getRosterWeek(weekStartISO)` and `getRosterMonth(monthISO)` to `src/lib/api.ts`.
2. Replace the mock calls in `src/app/(dashboard)/rosters/page.tsx`.
3. Replace the mock calls in `src/lib/hooks/use-rosters.ts` with `fetch('/api/proxy/rosters/...')`.
4. Delete `src/lib/rosters-mock.ts`.
