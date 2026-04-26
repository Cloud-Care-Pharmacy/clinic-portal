# Frontend API Handoff

Date: 2026-04-26  
Project: Prescription Gateway / Cloud Care Pharmacy clinic portal backend

This document summarizes the backend API work now available for frontend integration. It focuses on the endpoints added or expanded for the clinic/patient portal handoff and calls out the items intentionally left out of scope.

## Integration basics

### Base URL

Use the deployed Worker origin for the target environment, for example:

- Development: `https://<dev-worker>.workers.dev`
- Production: `https://<prod-worker>.workers.dev`

Keep `/api/...` paths exactly as listed below.

### Authentication headers

Most portal endpoints require API-key authentication:

```http
X-API-Key: <API_SECRET>
```

Endpoints that depend on the current staff member also require Clerk identity:

```http
X-Clerk-User-Id: <clerk_user_id>
```

Role-sensitive endpoints resolve the Clerk user against the backend `users` table. `admin` and `doctor` are required for clinical approval.

### Response envelope

Successful JSON responses use the existing envelope:

```json
{
  "success": true,
  "data": {}
}
```

Validation/auth/not-found errors use the existing error envelope:

```json
{
  "success": false,
  "error": "Validation error",
  "details": "entityId is required"
}
```

### Pagination pattern

List endpoints generally accept:

- `limit`: default usually `50`, max usually `100`
- `offset`: default `0`

Responses include:

```json
{
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 123
  }
}
```

## Newly added and expanded endpoints

### Intake submit alias

`POST /api/intake/submit`

Authenticated alias for the existing test intake submit handler.

Headers:

- `X-API-Key`
- `Content-Type: application/json`

Body:

- Same JSON payload as the existing intake form submit flow. It maps to the backend `IntakeFormData` shape.

Response:

```json
{
  "success": true,
  "patientId": "patient_123",
  "documentId": "document_123",
  "isNewPatient": true
}
```

Frontend notes:

- This endpoint is for authenticated portal/internal submission flows.
- Shopify storefront App Proxy submissions should continue to use `POST /submit` with Shopify signature verification.

### Patient search selector

`GET /api/patients/search`

Search patients within an entity for selectors/autocomplete.

Headers:

- `X-API-Key`

Query parameters:

| Name | Required | Values | Notes |
| --- | --- | --- | --- |
| `entityId` | Yes | string | Entity/tenant ID. |
| `q` | No | string | Searches name, generated email, original email, mobile, and PMS patient ID. |
| `limit` | No | number | Default `20`, max `50`. |

Example:

```http
GET /api/patients/search?entityId=entity_123&q=jane&limit=10
```

Response:

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "patients": [
      {
        "id": "patient_123",
        "entity_id": "entity_123",
        "first_name": "Jane",
        "last_name": "Citizen",
        "date_of_birth": "1988-04-10",
        "original_email": "jane@example.com",
        "generated_email": "rx-jane@example.com",
        "mobile": "0400000000",
        "pbs_patient_id": "pbs_123",
        "halaxy_patient_id": "pbs_123"
      }
    ]
  }
}
```

Frontend notes:

- The backend currently returns snake_case fields.
- `halaxy_patient_id` is an alias of `pbs_patient_id` for frontend compatibility.

### Entity patient list filters

`GET /api/entities/{entityId}/patients`

Existing endpoint expanded for CRM patient lists.

Headers:

- `X-API-Key`

Query parameters:

| Name | Required | Values | Notes |
| --- | --- | --- | --- |
| `limit` | No | number | Default `50`, max `100`. |
| `offset` | No | number | Default `0`. |
| `search` | No | string | Searches patient name/email/mobile/PMS IDs. |
| `pmsStatus` | No | `linked`, `pending` | `linked` means a PMS/Parchment patient ID is present. |
| `sort` | No | `created_at`, `first_name`, `last_name`, `date_of_birth`, `halaxy_patient_id`, `pbs_patient_id` | Default is backend-defined. |
| `order` | No | `asc`, `desc` | Sort direction. |

Response includes fuller patient demographic fields and pagination:

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "shopify_domain": "example.myshopify.com",
    "patients": [
      {
        "id": "patient_123",
        "entity_id": "entity_123",
        "generated_email": "rx-jane@example.com",
        "original_email": "jane@example.com",
        "pbs_patient_id": "pbs_123",
        "halaxy_patient_id": "pbs_123",
        "first_name": "Jane",
        "last_name": "Citizen",
        "date_of_birth": "1988-04-10",
        "mobile": "0400000000",
        "gender": "female",
        "street_address": "1 Test Street",
        "city": "Sydney",
        "state": "NSW",
        "postcode": "2000",
        "country": "AU",
        "medicare_number": null,
        "medicare_irn": null,
        "forward_email": null,
        "proof_of_age_file_name": "license.jpg",
        "proof_of_age_file_type": "image/jpeg",
        "created_at": "2026-04-26T00:00:00.000Z",
        "updated_at": "2026-04-26T00:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 1
    }
  }
}
```

### Clinical data approval

`POST /api/patients/{patientId}/clinical-data/{recordId}/approve`

Marks a clinical data record as approved.

Headers:

- `X-API-Key`
- `X-Clerk-User-Id`
- `Content-Type: application/json`

Required role:

- `admin` or `doctor`

Body:

```json
{
  "reviewNotes": "Reviewed and approved."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "clinicalData": {
      "id": "clinical_123",
      "patient_id": "patient_123",
      "review_status": "approved",
      "reviewed_by": "user_123",
      "reviewed_by_role": "doctor",
      "reviewed_at": "2026-04-26T00:00:00.000Z",
      "review_notes": "Reviewed and approved."
    }
  }
}
```

Frontend notes:

- The route also writes audit history and a `details-updated` activity event.
- Missing latest clinical data still returns `404` on `GET /api/patients/{patientId}/clinical-data/latest`.
- New review fields are available on clinical data records after migration `0016` is applied.

### Dashboard summary

`GET /api/dashboard/summary`

Aggregate counters for dashboard cards.

Headers:

- `X-API-Key`

Query parameters:

| Name | Required | Values | Notes |
| --- | --- | --- | --- |
| `entityId` | Yes | string | Entity/tenant ID. |
| `period` | No | `7d`, `30d`, `6m`, `12m` | Default `30d`. |

Response:

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "totalPatients": 120,
    "totalPatientsDeltaPct": 8.3,
    "pendingConsultations": 5,
    "scheduledConsultations": 5,
    "activePrescriptions": 42,
    "activePrescriptionsDeltaPct": 0,
    "newPatientsThisWeek": 10,
    "newPatientsDeltaPct": 11.1,
    "documentsPendingReview": 3,
    "clinicalRecordsPendingReview": 7,
    "period": "30d"
  }
}
```

Frontend notes:

- `activePrescriptions` is calculated by querying Parchment for linked patients in the entity. This may be slower than local counters.
- `activePrescriptionsDeltaPct` is currently always `0` because historical prescription snapshots are not stored locally.
- `newPatientsThisWeek` currently reflects the selected `period`, not strictly the last seven days. Label accordingly or use `period=7d` for a literal weekly card.

### Dashboard intake overview

`GET /api/dashboard/intake-overview`

Time-series intake chart data.

Headers:

- `X-API-Key`

Query parameters:

| Name | Required | Values | Notes |
| --- | --- | --- | --- |
| `entityId` | No | string | Filters to one entity. Without it, returns tenant-wide data. |
| `range` | No | `3m`, `6m`, `12m` | Default `12m`; ignored if `from`/`to` supplied. |
| `from` | No | ISO datetime | Must be paired with `to`. |
| `to` | No | ISO datetime | Must be paired with `from`. |
| `bucket` | No | `day`, `week`, `month` | Default `month`. |

Response:

```json
{
  "success": true,
  "data": {
    "from": "2026-01-01T00:00:00.000Z",
    "to": "2026-05-01T00:00:00.000Z",
    "range": "6m",
    "entityId": "entity_123",
    "bucket": "month",
    "buckets": [
      { "month": "2026-04", "count": 14 }
    ],
    "series": [
      {
        "label": "Apr",
        "startDate": "2026-04-01",
        "endDate": "2026-04-30",
        "total": 14
      }
    ]
  }
}
```

Frontend notes:

- Prefer `series` for chart rendering.
- `buckets` is retained for backward compatibility.

### Dashboard recent activity

`GET /api/dashboard/recent-activity`

Entity-scoped recent activity feed for dashboard cards/timelines.

Headers:

- `X-API-Key`

Query parameters:

| Name | Required | Values | Notes |
| --- | --- | --- | --- |
| `entityId` | Yes | string | Entity/tenant ID. |
| `limit` | No | number | Default `5`, max `20`. |
| `category` | No | `consultations`, `notes`, `prescriptions`, `documents`, `system` | Optional category filter. |

Response:

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "items": [
      {
        "id": "activity_123",
        "patientId": "patient_123",
        "patientName": "Jane Citizen",
        "patientInitials": "JC",
        "action": "Clinical data approved",
        "by": "user_123",
        "actorRole": "doctor",
        "timestamp": "2026-04-26T00:00:00.000Z",
        "type": "details-updated",
        "category": "system"
      }
    ]
  }
}
```

### Consultation list filters

`GET /api/consultations`

Global consultation queue with filtering/sorting.

Headers:

- `X-API-Key`

Query parameters:

| Name | Required | Values | Notes |
| --- | --- | --- | --- |
| `status` | No | `scheduled`, `completed`, `cancelled`, `no-show` | Existing filter. |
| `type` | No | `initial`, `follow-up`, `renewal` | New filter. |
| `patientId` | No | string | Existing filter. |
| `doctorId` | No | string | New filter. |
| `from` | No | ISO datetime | Filters scheduled date from. |
| `to` | No | ISO datetime | Filters scheduled date to. |
| `search` | No | string | Searches patient/doctor/context fields. |
| `sort` | No | `scheduledAt`, `createdAt`, `status`, `type` | Default `scheduledAt`. |
| `order` | No | `asc`, `desc` | Default `desc`. |
| `limit` | No | number | Default `50`, max `100`. |
| `offset` | No | number | Default `0`. |

Response includes `consultations`, `pagination`, and normalized `filters`.

`GET /api/patients/{patientId}/consultations` supports the same new filters except `patientId` is taken from the path.

### Entity prescription summary

`GET /api/entities/{entityId}/prescriptions/summary`

Counts prescriptions for linked patients in an entity using Parchment.

Headers:

- `X-API-Key`

Query parameters:

| Name | Required | Values | Notes |
| --- | --- | --- | --- |
| `from` | No | ISO datetime | Optional prescription created-date lower bound. |
| `to` | No | ISO datetime | Optional prescription created-date upper bound. |

Response:

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "activePrescriptions": 42,
    "expiredPrescriptions": 12,
    "pendingPrescriptions": 4,
    "newThisWeek": 8
  }
}
```

Frontend notes:

- This fans out to Parchment per linked patient, so use sparingly and cache UI state where possible.
- Patients without `pbs_patient_id` are skipped.
- Individual patient prescription reads remain available at `GET /api/patients/{patientId}/prescriptions`.

### Entity document worklist patient search

`GET /api/entities/{entityId}/documents`

Existing entity document list now supports patient search.

Headers:

- `X-API-Key`

Query parameters:

| Name | Required | Values | Notes |
| --- | --- | --- | --- |
| `patientSearch` | No | string | Searches patient name/email/PMS IDs for document worklists. |
| `category` | No | existing document category values | Existing filter. |
| `status` | No | existing document status values | Existing filter. |
| `source` | No | string | Existing filter. |
| `sort` | No | string | Existing sort support. |
| `order` | No | `asc`, `desc` | Existing sort direction. |
| `limit` | No | number | Default `50`. |
| `offset` | No | number | Default `0`. |

Response shape is unchanged: `documents` plus `pagination`.

### Patient note updates

`PATCH /api/patients/{patientId}/notes/{noteId}`

Existing note patch endpoint now supports full updates.

Headers:

- `X-API-Key`
- `Content-Type: application/json` when sending updates

Body fields are optional, but at least one field is required if a JSON body is sent:

```json
{
  "title": "Updated title",
  "content": "<p>Updated safe HTML content</p>",
  "category": "clinical",
  "isPinned": true
}
```

Allowed `category` values:

- `clinical`
- `pharmacy`
- `follow-up`
- `general`

Response:

```json
{
  "success": true,
  "data": {
    "id": "note_123",
    "patientId": "patient_123",
    "title": "Updated title",
    "content": "<p>Updated safe HTML content</p>",
    "category": "clinical",
    "isPinned": true
  }
}
```

Backward compatibility:

- Sending an empty body still toggles the pin state.

Frontend notes:

- Backend strips `<script>` tags and inline event-handler attributes from `content`.
- Continue frontend-side sanitization before rendering HTML.

### Current user availability

`PUT /api/users/me/availability`

Stores the current staff member's structured availability.

Headers:

- `X-API-Key`
- `X-Clerk-User-Id`
- `Content-Type: application/json`

Body:

```json
{
  "timezone": "Australia/Sydney",
  "availability": {
    "monday": [
      { "start": "09:00", "end": "17:00" }
    ],
    "tuesday": [],
    "wednesday": [],
    "thursday": [],
    "friday": [],
    "saturday": [],
    "sunday": []
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "availability": {
      "userId": "user_123",
      "timezone": "Australia/Sydney",
      "availability": {
        "monday": [
          { "start": "09:00", "end": "17:00" }
        ]
      },
      "createdAt": "2026-04-26T00:00:00.000Z",
      "updatedAt": "2026-04-26T00:00:00.000Z"
    }
  }
}
```

Frontend notes:

- Backend only requires `availability` to be an object. The UI should enforce the day/time schema for consistency.
- There is not yet a dedicated `GET /api/users/me/availability`; availability is stored for backend use and future scheduling screens.

## Schema and migration notes

Apply migration `0016_add_clinical_review_and_availability.sql` before using approval and availability in a deployed environment.

It adds:

- `patient_clinical_data.review_status`
- `patient_clinical_data.reviewed_by`
- `patient_clinical_data.reviewed_by_role`
- `patient_clinical_data.reviewed_at`
- `patient_clinical_data.review_notes`
- `user_availability` table

Existing clinical rows default to `review_status = "pending"` after migration.

## Out of scope / intentionally not implemented

The following were explicitly excluded from this implementation pass:

- `GET /api/users` admin staff list enhancements requested in the handoff.
- `POST /api/users/invite`.
- `PATCH /api/users/{userId}`.
- Patient counts endpoint enhancement to include Parchment prescription counts.

Related existing endpoints still available:

- Staff management exists under `/api/staff`, `/api/staff/invite`, `/api/staff/{userId}/role`, and `/api/staff/{userId}`.
- Existing `GET /api/users` remains available with current behavior.

## Validation status

Backend validation after implementation:

- `npm run typecheck` passed.
- `npm run routes:parity:strict` passed.
  - Implemented routes: `80`
  - OpenAPI paths: `68`
  - Missing OpenAPI operations: `0`
- `npm test -- --run` passed.
  - Test files: `42 passed`
  - Tests: `584 passed`
- Source error check reported no errors.

## Frontend implementation checklist

- Add `X-API-Key` to all portal API calls.
- Add `X-Clerk-User-Id` for current-user and role-sensitive flows.
- Use `entityId` as the primary tenant filter for dashboard, patient search, and entity worklists.
- Prefer `GET /api/patients/search` for autocomplete and `GET /api/entities/{entityId}/patients` for table pages.
- Use `series` from `/api/dashboard/intake-overview` for charts.
- Expect snake_case fields in many backend responses and normalize in the frontend API client if needed.
- Treat Parchment-backed prescription summary calls as potentially slower than local D1 reads.
- Keep the four out-of-scope user-management gaps hidden or wired to existing `/api/staff/*` endpoints until the backend paths are implemented.