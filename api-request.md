# Backend API Handoff Request

**Project:** Cloud Care Pharmacy Clinic Portal / Patient Portal  
**Frontend repository:** `clinic-portal`  
**Backend:** `prescription-gateway` Cloudflare Worker  
**Date:** 2026-04-26  
**Prepared for:** Backend handoff / API implementation planning

## 1. Goal

This document describes the backend APIs the clinic portal needs based on the current UI, existing frontend types, and expected clinic workflows.

The frontend is a Next.js app that calls the backend through a server-side proxy:

```text
Browser -> Next.js /api/proxy/[...path] -> prescription-gateway /api/*
```

The browser never receives the backend API key. Next.js injects:

- `X-API-Key: <API_SECRET>`
- `X-Clerk-User-Id: <current Clerk user id>`
- `Content-Type: application/json` unless forwarding multipart uploads/downloads

Backend responses should be stable, typed, and consistent because the portal hydrates Server Components and TanStack Query from the same response shapes.

## 2. Global API conventions requested

### 2.1 Base path

Backend endpoints should live under `/api/*`. The frontend proxy maps:

```text
/api/proxy/patients/{id} -> {BACKEND_URL}/api/patients/{id}
```

### 2.2 Authentication and actor context

Every protected backend route should require `X-API-Key` and should read `X-Clerk-User-Id` when supplied.

For mutations, backend should store the actor in audit/activity records:

```http
X-API-Key: server-secret
X-Clerk-User-Id: user_...
X-Request-Id: optional-request-id
```

### 2.3 Response wrapper

All JSON endpoints should use one of these wrappers.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": "Human readable message",
  "details": "Optional technical details or validation summary",
  "code": "OPTIONAL_MACHINE_CODE"
}
```

Expected status codes:

- `200` successful read/update/delete
- `201` successful create/upload
- `400` validation error
- `401` missing/invalid API key
- `403` authenticated but insufficient role
- `404` resource not found
- `409` conflict/duplicate
- `422` domain validation failure
- `500` unexpected backend error

### 2.4 Pagination

For D1-backed lists, use limit/offset.

Request query:

```text
?limit=50&offset=0
```

Response:

```json
{
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 123
  }
}
```

For Parchment passthrough APIs that use cursors, return both the raw cursor fields and a frontend-friendly count where possible.

### 2.5 Field naming

Current frontend expectations are mixed because existing backend responses are mixed:

- Patient, document, clinical data, and user profile read models currently use `snake_case` fields.
- Consultation, notes, activity, and many mutation payloads currently use `camelCase` fields.

For this handoff, keep the response field names shown in this document unless the frontend is updated at the same time.

### 2.6 Date/time formats

- Dates: ISO date string, `YYYY-MM-DD`.
- Date-times: ISO 8601 UTC string, e.g. `2026-04-26T12:30:00.000Z`.
- The frontend displays values in Australian locale/time zone.

### 2.7 Roles

Supported roles:

```ts
type UserRole = "admin" | "doctor" | "staff";
```

Recommended permissions:

| Feature                         | Admin               | Doctor | Staff                                         |
| ------------------------------- | ------------------- | ------ | --------------------------------------------- |
| View patients                   | yes                 | yes    | yes                                           |
| Edit patient demographics       | yes                 | yes    | yes                                           |
| Delete patient                  | yes                 | no     | no                                            |
| View clinical data              | yes                 | yes    | yes                                           |
| Approve clinical data           | yes                 | yes    | no                                            |
| Manage consultations            | yes                 | yes    | staff can schedule/update non-clinical fields |
| Manage notes                    | yes                 | yes    | yes                                           |
| Verify/reject documents         | yes                 | yes    | staff can upload only                         |
| Manage staff/users              | yes                 | no     | no                                            |
| Update own profile              | yes                 | yes    | yes                                           |
| Update doctor/prescriber fields | doctors/admins only | yes    | no                                            |

## 3. Core data models

### 3.1 Pagination

```ts
interface Pagination {
  limit: number;
  offset: number;
  total: number;
}
```

### 3.2 Entity

```ts
interface Entity {
  id: string;
  shopify_domain: string;
  name: string | null;
  email_prefix: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}
```

### 3.3 Patient

```ts
interface PatientMapping {
  id: string;
  entity_id: string | null;
  generated_email: string;
  original_email: string;
  halaxy_patient_id: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  mobile: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  medicare_number: string | null;
  medicare_irn: string | null;
  forward_email: string | null;
  proof_of_age_file_name: string | null;
  proof_of_age_file_type: string | null;
  created_at: string;
  updated_at: string | null;
}
```

### 3.4 Clinical data record

```ts
interface ClinicalDataRecord {
  id: string;
  patient_id: string;
  smoking_status: string;
  cigarettes_per_day: string | null;
  years_smoked: string | null;
  times_tried_quitting: string | null;
  quit_motivation: string[];
  quit_methods: string[];
  quit_method_explanation: string | null;
  last_cigarette: string | null;
  vaping_status: string;
  vaping_method: string | null;
  vaping_strength: string | null;
  vaping_volume: string | null;
  vaping_notes: string | null;
  has_medical_conditions: string;
  medical_conditions: string[];
  medical_conditions_other: string | null;
  takes_medication: string;
  high_risk_medications: string[];
  medications_list: string | null;
  cardiovascular: string;
  pregnancy: string;
  additional_notes: string | null;
  safety_acknowledgment: string;
  submitted_at: string;
  review_status: "pending" | "approved";
  reviewed_by: string | null;
  reviewed_by_role: "admin" | "doctor" | null;
  reviewed_at: string | null;
  review_notes: string | null;
}
```

### 3.5 Consultation

```ts
type ConsultationStatus = "scheduled" | "completed" | "cancelled" | "no-show";
type ConsultationType = "initial" | "follow-up" | "renewal";

interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: string;
  completedAt?: string | null;
  type: ConsultationType;
  status: ConsultationStatus;
  duration?: number | null;
  notes?: string | null;
  outcome?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 3.6 Prescription

The UI is read-only for prescriptions and expects the backend to fetch Parchment prescriptions for an internal patient.

Raw backend/Parchment-style response may include:

```ts
interface PatientPrescriptionsApiResponse {
  success: boolean;
  data: {
    patient?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
    };
    prescriber?: {
      firstName?: string;
      lastName?: string;
    };
    prescriptions: Prescription[];
    pagination?: {
      count?: number;
      hasNext?: boolean;
      limit?: number;
      lastKey?: string | null;
    };
  };
}
```

The frontend normalizes this into:

```ts
interface ParchmentPrescription {
  id: string;
  patientId: string;
  prescriberId: string;
  prescriberName?: string;
  product: string;
  dosage: string;
  quantity?: number;
  repeats?: number;
  issuedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "pending";
  notes?: string;
  medications: PrescriptionMedication[];
}

interface PrescriptionMedication {
  id: string;
  name: string;
  dosage?: string;
  quantity?: number;
  repeats?: number;
  schedule?: string;
  pbsCode?: string;
  notes?: string;
}
```

### 3.7 Document

```ts
type DocumentCategory =
  | "proof_of_identity"
  | "proof_of_age"
  | "prescription"
  | "lab_result"
  | "referral"
  | "consent_form"
  | "insurance"
  | "clinical_report"
  | "imaging"
  | "correspondence"
  | "other";

type DocumentStatus = "uploaded" | "verified" | "rejected";
type DocumentSource = "upload" | "email_attachment";

interface PatientDocument {
  id: string;
  patient_id: string;
  entity_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  category: DocumentCategory;
  description: string | null;
  expiry_date: string | null;
  source: DocumentSource;
  source_email_id: string | null;
  status: DocumentStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}
```

### 3.8 Note

```ts
type NoteCategory = "clinical" | "pharmacy" | "follow-up" | "general";

interface PatientNote {
  id: string;
  patientId: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPinned: boolean;
  authorName: string;
  authorRole: "admin" | "doctor" | "staff";
  createdAt: string;
  updatedAt: string;
}
```

### 3.9 Activity event

```ts
type ActivityEventType =
  | "consultation-scheduled"
  | "consultation-completed"
  | "consultation-updated"
  | "note-added"
  | "note-updated"
  | "note-deleted"
  | "prescription-issued"
  | "document-uploaded"
  | "document-verified"
  | "document-rejected"
  | "flag-raised"
  | "flag-resolved"
  | "patient-created"
  | "details-updated";

type ActivityEventCategory =
  | "consultations"
  | "notes"
  | "prescriptions"
  | "documents"
  | "system";
type ActivityEntityType =
  | "consultation"
  | "note"
  | "prescription"
  | "document"
  | "patient"
  | "flag"
  | "system";

interface PatientActivityEvent {
  id: string;
  patientId: string;
  type: ActivityEventType;
  category: ActivityEventCategory;
  title: string;
  description: string | null;
  actorId?: string | null;
  actorName: string;
  actorRole: "admin" | "doctor" | "staff" | "system";
  entityType: ActivityEntityType;
  entityId: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}
```

### 3.10 User profile

```ts
interface UserProfile {
  id: string;
  hpii: string | null;
  prescriber_number: string | null;
  qualifications: string | null;
  phone: string | null;
  role: "admin" | "doctor" | "staff";
  availability_days: string[] | null;
  title: string | null;
  specialty: string | null;
  ahpra_number: string | null;
  hospital_provider_number: string | null;
  business_phone: string | null;
  business_email: string | null;
  provider_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  business_street_number: string | null;
  business_street_name: string | null;
  business_suburb: string | null;
  business_state: string | null;
  business_postcode: string | null;
  created_at: string;
  updated_at: string;
}
```

## 4. Endpoint requirements by UI area

## 4.1 Entities and patient directory

### GET `/api/entities`

**Purpose:** Load available pharmacy/shop entities.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "entity_123",
      "shopify_domain": "cloudcare.myshopify.com",
      "name": "Cloud Care Pharmacy",
      "email_prefix": "cloudcare",
      "is_active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET `/api/entities/{entityId}`

**Purpose:** Retrieve one entity.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "entity_123",
    "shopify_domain": "cloudcare.myshopify.com",
    "name": "Cloud Care Pharmacy",
    "email_prefix": "cloudcare",
    "is_active": 1,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

### GET `/api/entities/{entityId}/patients`

**Purpose:** Patient directory table and patient selector for prescriptions/consultations.

**Current UI uses:** `limit`, `offset`.

**Requested query support:**

| Query       | Type                                                                          | Notes                                                        |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `limit`     | number                                                                        | default `50`, max `100`                                      |
| `offset`    | number                                                                        | default `0`                                                  |
| `search`    | string                                                                        | Search name, original email, generated email, PMS ID, mobile |
| `pmsStatus` | `linked` or `pending`                                                         | Derived from presence of `halaxy_patient_id`                 |
| `sort`      | `created_at`, `first_name`, `last_name`, `date_of_birth`, `halaxy_patient_id` | For server-side DataGrid support                             |
| `order`     | `asc` or `desc`                                                               | default `desc`                                               |

**Response:**

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "patients": [
      {
        "id": "patient_123",
        "entity_id": "entity_123",
        "generated_email": "cloudcare+abc123@example.com",
        "original_email": "patient@example.com",
        "halaxy_patient_id": "halaxy_123",
        "first_name": "Jane",
        "last_name": "Smith",
        "date_of_birth": "1988-03-20",
        "gender": "Female",
        "mobile": "+61400000000",
        "street_address": "1 Example St",
        "city": "Sydney",
        "state": "NSW",
        "postcode": "2000",
        "country": "Australia",
        "medicare_number": "1234567890",
        "medicare_irn": "1",
        "forward_email": "clinic@example.com",
        "proof_of_age_file_name": "license.pdf",
        "proof_of_age_file_type": "application/pdf",
        "created_at": "2026-04-26T10:00:00.000Z",
        "updated_at": "2026-04-26T10:00:00.000Z"
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

### GET `/api/patients/search`

**Priority:** P0 gap.

**Purpose:** Global consultation scheduling needs a reliable patient lookup. The current UI can open “Schedule Consultation” without a patient context, but a consultation must be created with a real `patientId`.

**Requested query:**

| Query      | Type   | Notes                                            |
| ---------- | ------ | ------------------------------------------------ |
| `entityId` | string | Required unless backend can infer default entity |
| `q`        | string | Name/email/mobile/PMS ID                         |
| `limit`    | number | default `20`, max `50`                           |

**Response:**

```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "patient_123",
        "displayName": "Jane Smith",
        "originalEmail": "patient@example.com",
        "mobile": "+61400000000",
        "dateOfBirth": "1988-03-20",
        "halaxyPatientId": "halaxy_123"
      }
    ]
  }
}
```

## 4.2 Patient detail and demographics

### GET `/api/patients/{patientId}`

**Purpose:** Patient detail shell/header/profile tab.

**Response:**

```json
{
  "success": true,
  "data": {
    "patient": "PatientMapping"
  }
}
```

`patient` should be the full `PatientMapping` object from section 3.3.

### PUT `/api/patients/{patientId}`

**Purpose:** Update demographics from the patient profile edit sheet.

**Request:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "dobDay": "20",
  "dobMonth": "03",
  "dobYear": "1988",
  "gender": "Female",
  "streetAddress": "1 Example St",
  "city": "Sydney",
  "postcode": "2000",
  "mobile": "+61400000000",
  "proofOfAgeFileName": "license.pdf",
  "proofOfAgeFileType": "application/pdf",
  "state": "NSW",
  "country": "Australia",
  "medicareNumber": "1234567890",
  "medicareIRN": "1",
  "forwardEmail": "clinic@example.com"
}
```

**Validation expectations:**

- Required fields should match the request above.
- Convert DOB parts into `date_of_birth = YYYY-MM-DD`.
- Preserve fields not included when optional fields are omitted.
- Return `400` with field-level `details` for validation failures.

**Response:**

```json
{
  "success": true,
  "data": {
    "patient": "PatientMapping"
  }
}
```

### DELETE `/api/patients/{patientId}`

**Purpose:** Delete a patient from the table/header action.

**Expected behavior:**

- Must delete or safely cascade all related records: consultations, notes, documents metadata/files where appropriate, clinical records, prescriptions mappings, activity entries, and email mappings.
- If physical delete is not acceptable for compliance, implement soft-delete but hide records from normal lists.
- Must create an audit entry.

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### GET `/api/patients/{patientId}/counts`

**Purpose:** Patient detail tab badges and header stat strip.

**Response:**

```json
{
  "success": true,
  "data": {
    "patientId": "patient_123",
    "consultations": 4,
    "prescriptions": 2,
    "clinicalRecords": 3,
    "documents": 5,
    "notes": 8,
    "activity": 20,
    "activePrescriptions": 1,
    "scheduledConsultations": 1,
    "completedConsultations": 3,
    "pendingDocuments": 2
  }
}
```

Important: `prescriptions` and `activePrescriptions` should include Parchment-derived prescriptions when the patient is linked, not only local D1 rows.

## 4.3 Intake submission and clinical data

### POST `/api/test/submit`

**Purpose:** Patient intake wizard submission from the portal.

Current route name is test-oriented. For production, also provide:

### POST `/api/intake/submit`

**Priority:** P0 recommended replacement.

**Request:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "patient@example.com",
  "dobDay": "20",
  "dobMonth": "03",
  "dobYear": "1988",
  "gender": "Female",
  "streetAddress": "1 Example St",
  "city": "Sydney",
  "state": "NSW",
  "postcode": "2000",
  "country": "Australia",
  "mobile": "+61400000000",
  "medicareNumber": "1234567890",
  "medicareIRN": "1",
  "smokingStatus": "current-smoker",
  "cigarettesPerDay": "10",
  "yearsSmoked": "5",
  "timesTriedQuitting": "2",
  "quitMotivation": ["health", "family"],
  "quitMethods": ["patches"],
  "quitMethodExplanation": "Tried patches previously",
  "lastCigarette": "today",
  "vapingStatus": "yes",
  "vapingMethod": "pod",
  "vapingStrength": "20mg",
  "vapingVolume": "2ml/day",
  "vapingNotes": "Uses daily",
  "proofOfAge": "base64-or-r2-reference",
  "proofOfAgeFileName": "license.pdf",
  "proofOfAgeFileType": "application/pdf",
  "hasMedicalConditions": "yes",
  "medicalConditions": ["asthma"],
  "medicalConditionsOther": "",
  "takesMedication": "yes",
  "highRiskMedications": ["warfarin"],
  "medicationsList": "Warfarin 5mg",
  "cardiovascular": "no",
  "pregnancy": "na",
  "forwardEmail": "clinic@example.com",
  "additionalNotes": "Patient prefers afternoon calls",
  "safetyAcknowledgment": "yes"
}
```

**Expected backend behavior:**

- Create or update patient mapping.
- Generate patient email address.
- Store clinical data snapshot as immutable clinical record.
- Store proof-of-age file as a document if file content/reference is provided.
- Set `review_status = "pending"` for the clinical record.
- Create activity events: `patient-created`, `document-uploaded`, and `flag-raised` when red flags are present.
- Optionally submit/sync with Halaxy/Parchment as currently supported.

**Response:**

```json
{
  "success": true,
  "patientId": "patient_123",
  "email": "cloudcare+abc123@example.com"
}
```

### GET `/api/patients/{patientId}/clinical-data`

**Purpose:** Clinical history table and clinical detail/review sheet.

**Query:** `limit`, `offset`.

**Response:**

```json
{
  "success": true,
  "data": {
    "patientId": "patient_123",
    "records": ["ClinicalDataRecord"],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 1
    }
  }
}
```

### GET `/api/patients/{patientId}/clinical-data/latest`

**Purpose:** Patient header red flag alert, overview summary, medical history summary.

**Response:**

```json
{
  "success": true,
  "data": {
    "clinicalData": "ClinicalDataRecord"
  }
}
```

If no clinical record exists, return `404` or:

```json
{
  "success": true,
  "data": {
    "clinicalData": null
  }
}
```

The frontend can handle either with a small adapter, but `null` is preferred for empty state consistency.

### POST `/api/patients/{patientId}/clinical-data/{recordId}/approve`

**Priority:** P0 gap.

**Purpose:** Doctor/admin approves an intake clinical record from the clinical tab.

**Request:**

```json
{
  "reviewNotes": "Reviewed. Suitable to proceed."
}
```

**Behavior:**

- Require `admin` or `doctor`.
- Set `review_status = "approved"`.
- Set `reviewed_by`, `reviewed_by_role`, `reviewed_at`, `review_notes`.
- Create activity event `details-updated` or `flag-resolved` if approval resolves a red flag workflow.

**Response:**

```json
{
  "success": true,
  "data": {
    "record": "ClinicalDataRecord"
  }
}
```

## 4.4 Consultations

### GET `/api/consultations`

**Priority:** P0 gap if not already implemented.

**Purpose:** Global consultations page table/calendar and dashboard pending count.

**Requested query support:**

| Query       | Type                                             | Notes                                          |
| ----------- | ------------------------------------------------ | ---------------------------------------------- |
| `limit`     | number                                           | default `50`, max `100`                        |
| `offset`    | number                                           | default `0`                                    |
| `status`    | `scheduled`, `completed`, `cancelled`, `no-show` | Optional                                       |
| `type`      | `initial`, `follow-up`, `renewal`                | Optional                                       |
| `patientId` | string                                           | Optional alternative to patient-specific route |
| `doctorId`  | string                                           | Optional                                       |
| `from`      | ISO date-time                                    | Start date for calendar/server filtering       |
| `to`        | ISO date-time                                    | End date for calendar/server filtering         |
| `search`    | string                                           | Patient name, doctor name, notes               |
| `sort`      | `scheduledAt`, `createdAt`, `status`, `type`     | default `scheduledAt`                          |
| `order`     | `asc`, `desc`                                    | default `desc`                                 |

**Response:**

```json
{
  "success": true,
  "data": {
    "consultations": ["Consultation"],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 10
    }
  }
}
```

### GET `/api/patients/{patientId}/consultations`

**Purpose:** Patient consultation tab and patient overview.

**Query:** same as global list but scoped to one patient.

**Response:**

```json
{
  "success": true,
  "data": {
    "patientId": "patient_123",
    "consultations": ["Consultation"],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 4
    }
  }
}
```

### GET `/api/consultations/{consultationId}`

**Purpose:** Direct consultation detail retrieval for URL selected states.

**Response:**

```json
{
  "success": true,
  "data": {
    "consultation": "Consultation"
  }
}
```

### POST `/api/consultations`

**Purpose:** Schedule a consultation.

**Request:**

```json
{
  "patientId": "patient_123",
  "patientName": "Jane Smith",
  "doctorId": "user_doctor_123",
  "doctorName": "Dr Sarah Chen",
  "scheduledAt": "2026-04-27T02:00:00.000Z",
  "type": "initial",
  "duration": 30,
  "notes": "Optional HTML notes"
}
```

**Behavior:**

- Default `status` to `scheduled`.
- Validate patient exists.
- Validate doctor exists when `doctorId` is supplied.
- If `doctorId` is omitted, backend can resolve from `doctorName` or current user if they are a doctor.
- Create activity event `consultation-scheduled`.

**Response:**

```json
{
  "success": true,
  "data": {
    "consultation": "Consultation"
  }
}
```

`201` is preferred for new consultation creation.

### PATCH `/api/consultations/{consultationId}`

**Purpose:** Update appointment details, cancel, mark no-show, complete, or add outcome.

**Request:**

```json
{
  "status": "completed",
  "outcome": "Consultation completed successfully.",
  "notes": "Updated notes",
  "completedAt": "2026-04-27T02:30:00.000Z",
  "scheduledAt": "2026-04-27T02:00:00.000Z",
  "duration": 30,
  "type": "follow-up",
  "doctorId": "user_doctor_123",
  "doctorName": "Dr Sarah Chen"
}
```

All fields are optional; only supplied fields should change.

**Behavior:**

- Create `consultation-completed` when status changes to `completed`.
- Create `consultation-updated` for other changes.
- `completedAt` should be auto-filled if status becomes `completed` and no value is supplied.
- `completedAt` should be cleared when status moves away from `completed` unless explicitly supplied.

**Response:**

```json
{
  "success": true,
  "data": {
    "consultation": "Consultation"
  }
}
```

### DELETE `/api/consultations/{consultationId}`

**Purpose:** Remove an incorrect consultation.

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

## 4.5 Prescriptions

### GET `/api/patients/{patientId}/prescriptions`

**Purpose:** Patient prescriptions tab, prescriptions page for a selected patient, patient header stat strip, dashboard active prescription count.

**Query:**

| Query     | Type                           | Notes                             |
| --------- | ------------------------------ | --------------------------------- |
| `limit`   | number                         | default `50`, max `100`           |
| `lastKey` | string                         | Parchment cursor                  |
| `status`  | `active`, `expired`, `pending` | Optional frontend-friendly filter |

**Behavior:**

- Look up internal patient.
- Require linked Parchment/PBS/Halaxy patient identifier.
- Fetch from Parchment.
- Return `404` when patient is not linked or not found. Frontend currently treats `404` as empty prescriptions.
- Prefer including medication item details in each prescription.

**Response:**

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "parchment_patient_123",
      "firstName": "Jane",
      "lastName": "Smith",
      "dateOfBirth": "1988-03-20"
    },
    "prescriber": {
      "firstName": "Sarah",
      "lastName": "Chen"
    },
    "prescriptions": [
      {
        "id": "rx_123",
        "status": "active",
        "createdDate": "2026-04-01T00:00:00.000Z",
        "issuedAt": "2026-04-01T00:00:00.000Z",
        "expiresAt": "2026-10-01T00:00:00.000Z",
        "prescriberName": "Dr Sarah Chen",
        "product": "Nicotine Replacement Therapy",
        "medications": [
          {
            "id": "med_123",
            "name": "Nicotine patch",
            "dosage": "21mg",
            "quantity": 28,
            "repeats": 2,
            "schedule": "Daily",
            "pbsCode": "PBS123",
            "notes": "Apply one patch daily"
          }
        ]
      }
    ],
    "pagination": {
      "count": 1,
      "hasNext": false,
      "limit": 50,
      "lastKey": null
    }
  }
}
```

### GET `/api/parchment/validate`

**Purpose:** Integration health check.

**Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "message": "Parchment credentials valid"
  }
}
```

Current frontend only requires `{ "success": true }`, but `data.valid` is requested for better diagnostics.

### GET `/api/entities/{entityId}/prescriptions/summary`

**Priority:** P1 gap.

**Purpose:** Dashboard active prescriptions count without requiring frontend to load all patients and all Parchment prescriptions.

**Query:**

| Query  | Type          | Notes    |
| ------ | ------------- | -------- |
| `from` | ISO date-time | Optional |
| `to`   | ISO date-time | Optional |

**Response:**

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "activePrescriptions": 43,
    "expiredPrescriptions": 10,
    "pendingPrescriptions": 2,
    "newThisWeek": 5
  }
}
```

## 4.6 Documents and email attachments

### GET `/api/patients/{patientId}/documents`

**Purpose:** Patient documents table and document detail sheet.

**Requested query support:**

| Query      | Type                                 | Notes                   |
| ---------- | ------------------------------------ | ----------------------- |
| `category` | `DocumentCategory`                   | Optional                |
| `status`   | `uploaded`, `verified`, `rejected`   | Optional                |
| `source`   | `upload`, `email_attachment`         | Optional                |
| `limit`    | number                               | default `50`, max `100` |
| `offset`   | number                               | default `0`             |
| `sort`     | `created_at`, `filename`, `category` | Optional                |
| `order`    | `asc`, `desc`                        | Optional                |

**Response:**

```json
{
  "success": true,
  "data": {
    "patientId": "patient_123",
    "documents": ["PatientDocument"],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 5
    }
  }
}
```

### POST `/api/patients/{patientId}/documents`

**Purpose:** Upload a patient document.

**Content type:** `multipart/form-data`

**Form fields:**

| Field         | Type               | Required | Notes                                                                |
| ------------- | ------------------ | -------- | -------------------------------------------------------------------- |
| `file`        | File               | yes      | Allowed UI types: PDF, JPG, PNG, HEIC, HEIF, WEBP. Max UI size: 10MB |
| `category`    | `DocumentCategory` | yes      |                                                                      |
| `description` | string             | no       | Max 500 chars recommended                                            |
| `expiry_date` | `YYYY-MM-DD`       | no       |                                                                      |
| `uploaded_by` | string             | no       | Prefer backend actor from Clerk header                               |

**Behavior:**

- Store file in R2.
- Store metadata in D1.
- Default `status = "uploaded"`.
- Default `source = "upload"`.
- Create activity event `document-uploaded`.

**Response:**

```json
{
  "success": true,
  "data": {
    "document": "PatientDocument"
  }
}
```

`201` is preferred for upload creation.

### GET `/api/patients/{patientId}/documents/{documentId}`

**Purpose:** Fetch one document metadata record.

**Response:**

```json
{
  "success": true,
  "data": {
    "document": "PatientDocument"
  }
}
```

### PATCH `/api/patients/{patientId}/documents/{documentId}`

**Purpose:** Update document metadata from document detail sheet.

**Request:**

```json
{
  "category": "clinical_report",
  "description": "Updated description",
  "expiry_date": "2027-04-26"
}
```

`expiry_date` can be `null` to clear it.

**Response:**

```json
{
  "success": true,
  "data": {
    "document": "PatientDocument"
  }
}
```

### POST `/api/patients/{patientId}/documents/{documentId}/verify`

**Purpose:** Verify or reject uploaded documents.

**Verify request:**

```json
{
  "action": "verify"
}
```

**Reject request:**

```json
{
  "action": "reject",
  "reason": "Document is unreadable"
}
```

**Behavior:**

- `verify`: set `status = "verified"`, set `verified_by`, `verified_at`, clear `rejection_reason`.
- `reject`: set `status = "rejected"`, set `rejection_reason`, optionally set `verified_by` and `verified_at` as reviewer metadata.
- Create activity event `document-verified` or `document-rejected`.

**Response:**

```json
{
  "success": true,
  "data": {
    "document": "PatientDocument"
  }
}
```

### DELETE `/api/patients/{patientId}/documents/{documentId}`

**Purpose:** Delete or soft-delete document.

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### GET `/api/patients/{patientId}/documents/{documentId}/download`

**Purpose:** Download/open file in a new browser tab.

**Response:** Binary stream.

Required headers:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="license.pdf"
```

### POST `/api/patients/{patientId}/documents/sync-email-attachments`

**Purpose:** Link historical email attachments as patient documents.

**Behavior:**

- Find email attachments for patient.
- Create document records for unsynced attachments.
- Do not duplicate existing records.
- Set `source = "email_attachment"` and `source_email_id`.

**Response:**

```json
{
  "success": true,
  "data": {
    "synced": 2,
    "skipped": 3,
    "documents": ["PatientDocument"]
  }
}
```

### GET `/api/entities/{entityId}/documents`

**Priority:** P1 for future global document worklist.

**Purpose:** List all documents requiring review across the clinic.

**Query:** same filters as patient document list plus optional `patientSearch`.

**Response:**

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "documents": [
      {
        "document": "PatientDocument",
        "patient": {
          "id": "patient_123",
          "displayName": "Jane Smith",
          "originalEmail": "patient@example.com"
        }
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 10
    }
  }
}
```

### GET `/api/patients/{patientId}/emails`

**Purpose:** Email/attachment traceability and document sync support.

**Query:** `limit`, `offset`.

**Response:**

```json
{
  "success": true,
  "data": {
    "patientId": "patient_123",
    "emails": [
      {
        "id": "email_123",
        "patient_id": "patient_123",
        "from_address": "patient@example.com",
        "subject": "Proof of age",
        "message_id": "message-id",
        "attachment_count": 1,
        "received_at": "2026-04-26T10:00:00.000Z",
        "status": "processed"
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

### GET `/api/patients/{patientId}/emails/{emailId}`

**Response:**

```json
{
  "success": true,
  "data": {
    "email": {
      "id": "email_123",
      "patient_id": "patient_123",
      "from_address": "patient@example.com",
      "subject": "Proof of age",
      "message_id": "message-id",
      "attachment_count": 1,
      "received_at": "2026-04-26T10:00:00.000Z",
      "status": "processed"
    },
    "metadata": {
      "id": "email_123",
      "from": "patient@example.com",
      "subject": "Proof of age",
      "date": "2026-04-26T10:00:00.000Z",
      "messageId": "message-id",
      "receivedAt": "2026-04-26T10:00:00.000Z",
      "attachments": [
        {
          "filename": "license.pdf",
          "contentType": "application/pdf",
          "size": 123456
        }
      ]
    }
  }
}
```

### GET `/api/patients/{patientId}/emails/{emailId}/attachments/{filename}`

**Purpose:** Download email attachment.

**Response:** Binary stream with correct `Content-Type` and `Content-Disposition`.

## 4.7 Notes

### GET `/api/patients/{patientId}/notes`

**Purpose:** Patient notes tab and overview recent notes.

**Requested behavior:**

- Return pinned notes first, then newest first.
- HTML content is supported because the frontend editor stores HTML.

**Response:**

```json
{
  "success": true,
  "data": {
    "patientId": "patient_123",
    "notes": ["PatientNote"]
  }
}
```

### POST `/api/patients/{patientId}/notes`

**Purpose:** Add patient note.

**Request:**

```json
{
  "title": "Follow-up needed",
  "content": "<p>Call patient next week.</p>",
  "category": "follow-up",
  "isPinned": true,
  "authorName": "Staff Member",
  "authorRole": "staff"
}
```

**Backend preference:** derive `authorName` and `authorRole` from `X-Clerk-User-Id` where possible instead of trusting client values.

**Response:**

```json
{
  "success": true,
  "data": "PatientNote"
}
```

`201` is preferred for create.

### PATCH `/api/patients/{patientId}/notes/{noteId}`

**Current UI behavior:** sends an empty PATCH to toggle `isPinned`.

**Recommended request support:**

```json
{
  "title": "Updated title",
  "content": "<p>Updated HTML note</p>",
  "category": "clinical",
  "isPinned": false
}
```

All fields optional. For backwards compatibility, if the body is empty, toggle `isPinned`.

**Response:**

```json
{
  "success": true,
  "data": "PatientNote"
}
```

### DELETE `/api/patients/{patientId}/notes/{noteId}`

**Purpose:** Delete note.

**Response:**

```json
{
  "success": true
}
```

## 4.8 Patient activity timeline

### GET `/api/patients/{patientId}/activity`

**Purpose:** Patient activity tab and audit-like patient timeline.

**Query:**

| Query      | Type                                                             | Notes                          |
| ---------- | ---------------------------------------------------------------- | ------------------------------ |
| `type`     | `ActivityEventType`                                              | Optional                       |
| `category` | `consultations`, `notes`, `prescriptions`, `documents`, `system` | Requested for frontend filters |
| `limit`    | number                                                           | default `50`, max `100`        |
| `offset`   | number                                                           | default `0`                    |

**Response:**

```json
{
  "success": true,
  "data": {
    "patientId": "patient_123",
    "events": ["PatientActivityEvent"],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 20
    }
  }
}
```

Activity should be generated for at least:

- Patient created
- Patient details updated
- Consultation scheduled/updated/completed/cancelled/no-show
- Note added/updated/deleted
- Prescription issued/imported
- Document uploaded/verified/rejected/deleted
- Clinical red flag raised/resolved

## 4.9 User profile and prescriber details

### GET `/api/users/me`

**Purpose:** Profile page and profile completeness.

**Headers:** `X-Clerk-User-Id` is required.

**Response:**

```json
{
  "success": true,
  "data": {
    "profile": "UserProfile"
  }
}
```

If no profile exists yet:

```json
{
  "success": true,
  "data": {
    "profile": null
  }
}
```

### PUT `/api/users/me`

**Purpose:** Create/update current user profile from profile tabs.

**Request:**

```json
{
  "role": "doctor",
  "phone": "+61400000000",
  "hpii": "8003611234567890",
  "prescriberNumber": "1234567",
  "qualifications": "MBBS, FRACGP",
  "availabilityDays": ["Monday", "Tuesday", "Wednesday"],
  "title": "Dr",
  "specialty": "General Practice",
  "ahpraNumber": "MED0000000000",
  "hospitalProviderNumber": "HP12345",
  "businessPhone": "0434966529",
  "businessEmail": "doctor@clinic.example",
  "providerNumber": "PR12345",
  "dateOfBirth": "1980-01-01",
  "gender": "Female",
  "businessStreetNumber": "1",
  "businessStreetName": "Example St",
  "businessSuburb": "Sydney",
  "businessState": "NSW",
  "businessPostcode": "2000"
}
```

All fields are optional; only supplied fields should be changed. If a profile does not exist, create it.

**Validation expectations:**

- HPI-I: numeric, 16 digits when present.
- Prescriber number: required for doctors when completing prescriber details.
- Business phone: required for doctors when completing business details.
- Doctor-only fields should return `403` for staff unless admin is updating through admin endpoint.

**Response:**

```json
{
  "success": true,
  "data": {
    "profile": "UserProfile"
  }
}
```

### PUT `/api/users/me/availability`

**Priority:** P1 enhancement.

**Purpose:** The UI currently stores only `availabilityDays`, but the profile tab shows working hours and future leave/unavailability. To make the visible UI real, add structured availability.

**Request:**

```json
{
  "weeklyHours": [
    {
      "day": "Monday",
      "enabled": true,
      "start": "09:00",
      "end": "17:00"
    }
  ],
  "consultationTypes": ["initial", "follow-up"],
  "leave": [
    {
      "id": "leave_123",
      "startDate": "2026-05-01",
      "endDate": "2026-05-07",
      "reason": "Annual leave"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "availability": {
      "weeklyHours": [],
      "consultationTypes": [],
      "leave": []
    }
  }
}
```

## 4.10 Staff administration

The Admin page is currently disabled because backend support is incomplete. The current backend reportedly has `GET /api/users`, but the profile shape does not include display name/email and there are no invite/role/deactivate endpoints.

### GET `/api/users`

**Priority:** P0 for Admin page.

**Purpose:** Staff list.

**Required role:** `admin`.

**Query:**

| Query    | Type                            | Notes                   |
| -------- | ------------------------------- | ----------------------- |
| `limit`  | number                          | default `50`, max `100` |
| `offset` | number                          | default `0`             |
| `role`   | `admin`, `doctor`, `staff`      | Optional                |
| `search` | string                          | Name/email              |
| `status` | `active`, `invited`, `disabled` | Optional                |

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "profile_123",
        "clerkUserId": "user_123",
        "firstName": "Sarah",
        "lastName": "Chen",
        "displayName": "Dr Sarah Chen",
        "email": "sarah@example.com",
        "imageUrl": "https://...",
        "role": "doctor",
        "status": "active",
        "phone": "+61400000000",
        "specialty": "General Practice",
        "created_at": "2026-01-01T00:00:00.000Z",
        "updated_at": "2026-04-26T00:00:00.000Z",
        "last_sign_in_at": "2026-04-25T00:00:00.000Z"
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

### POST `/api/users/invite`

**Priority:** P0 for Admin page.

**Purpose:** Invite staff/doctor/admin.

**Request:**

```json
{
  "email": "new.doctor@example.com",
  "role": "doctor",
  "firstName": "New",
  "lastName": "Doctor"
}
```

**Behavior:**

- Create Clerk invitation or user invite.
- Create pending local profile with role.
- Create audit entry.

**Response:**

```json
{
  "success": true,
  "data": {
    "invitationId": "inv_123",
    "user": {
      "id": "profile_123",
      "email": "new.doctor@example.com",
      "role": "doctor",
      "status": "invited"
    }
  }
}
```

### PATCH `/api/users/{userId}`

**Priority:** P0 for Admin page.

**Purpose:** Admin updates user role/status/profile fields.

**Request:**

```json
{
  "role": "staff",
  "status": "disabled",
  "phone": "+61400000000",
  "specialty": "General Practice"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": "AdminUser"
  }
}
```

### DELETE `/api/users/{userId}` or POST `/api/users/{userId}/disable`

**Priority:** P1.

**Purpose:** Remove or disable staff account.

**Response:**

```json
{
  "success": true,
  "data": {
    "disabled": true
  }
}
```

## 4.11 Dashboard APIs

The dashboard currently contains hardcoded totals, chart data, and recent activity. Backend APIs are needed to make it production-ready.

### GET `/api/dashboard/summary`

**Priority:** P0.

**Purpose:** Dashboard stat cards.

**Query:**

| Query      | Type                     | Notes                     |
| ---------- | ------------------------ | ------------------------- |
| `entityId` | string                   | Required unless inferable |
| `period`   | `7d`, `30d`, `6m`, `12m` | default `30d`             |

**Response:**

```json
{
  "success": true,
  "data": {
    "entityId": "entity_123",
    "totalPatients": 127,
    "totalPatientsDeltaPct": 8.2,
    "pendingConsultations": 4,
    "scheduledConsultations": 4,
    "activePrescriptions": 43,
    "activePrescriptionsDeltaPct": 12.5,
    "newPatientsThisWeek": 5,
    "newPatientsDeltaPct": 4.5,
    "documentsPendingReview": 2,
    "clinicalRecordsPendingReview": 3
  }
}
```

### GET `/api/dashboard/intake-overview`

**Priority:** P0.

**Purpose:** Dashboard bar chart currently showing static monthly intake totals.

**Query:**

| Query      | Type                   | Notes                     |
| ---------- | ---------------------- | ------------------------- |
| `entityId` | string                 | Required unless inferable |
| `from`     | `YYYY-MM-DD`           | Optional                  |
| `to`       | `YYYY-MM-DD`           | Optional                  |
| `bucket`   | `day`, `week`, `month` | default `month`           |

**Response:**

```json
{
  "success": true,
  "data": {
    "series": [
      {
        "label": "Jan",
        "startDate": "2026-01-01",
        "endDate": "2026-01-31",
        "total": 42
      }
    ]
  }
}
```

### GET `/api/dashboard/recent-activity`

**Priority:** P0.

**Purpose:** Dashboard recent activity list.

**Query:**

| Query      | Type              | Notes                     |
| ---------- | ----------------- | ------------------------- |
| `entityId` | string            | Required unless inferable |
| `limit`    | number            | default `5`, max `20`     |
| `category` | activity category | Optional                  |

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "activity_123",
        "patientId": "patient_123",
        "patientName": "Jane Smith",
        "patientInitials": "JS",
        "action": "Patient intake completed",
        "by": "Dr Sarah Chen",
        "actorRole": "doctor",
        "timestamp": "2026-04-26T10:00:00.000Z",
        "type": "patient-created",
        "category": "system"
      }
    ]
  }
}
```

## 4.12 Audit log

### GET `/api/audit`

**Priority:** P1.

**Purpose:** Compliance/admin audit log.

**Query:**

| Query       | Type                         | Notes                   |
| ----------- | ---------------------------- | ----------------------- |
| `actor`     | string                       | Clerk user id or email  |
| `tableName` | string                       | Audited table           |
| `action`    | `create`, `update`, `delete` | Optional                |
| `limit`     | number                       | default `50`, max `100` |
| `offset`    | number                       | default `0`             |

**Response:**

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "audit_123",
        "actor": "user_123",
        "actorEmail": "staff@example.com",
        "tableName": "patients",
        "recordId": "patient_123",
        "action": "update",
        "before": {},
        "after": {},
        "createdAt": "2026-04-26T10:00:00.000Z"
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

### GET `/api/audit/{tableName}/{recordId}`

**Priority:** P1.

**Purpose:** Resource-specific audit history.

**Response:** same as `/api/audit`, filtered to one record.

## 5. Priority summary

### P0 — required for current UI to be production-complete

1. `GET /api/consultations` with list/filter/pagination.
2. `POST /api/patients/{patientId}/clinical-data/{recordId}/approve`.
3. Dashboard APIs:
   - `GET /api/dashboard/summary`
   - `GET /api/dashboard/intake-overview`
   - `GET /api/dashboard/recent-activity`
4. Admin staff APIs:
   - `GET /api/users` with display name/email/status
   - `POST /api/users/invite`
   - `PATCH /api/users/{userId}`
5. Patient search endpoint for global scheduling:
   - `GET /api/patients/search`
6. Ensure `GET /api/patients/{patientId}/counts` includes Parchment prescription counts.
7. Ensure documents list supports category/status/source/sort/order filters.
8. Ensure patient and consultation list endpoints support server-side search/filter/sort for larger clinics.

### P1 — important next iteration

1. Structured availability endpoint: `PUT /api/users/me/availability`.
2. Entity-level prescription summary: `GET /api/entities/{entityId}/prescriptions/summary`.
3. Entity-level documents worklist: `GET /api/entities/{entityId}/documents`.
4. Full note update semantics for `PATCH /api/patients/{patientId}/notes/{noteId}` while preserving empty-body pin toggle.
5. Audit log UI support using `/api/audit` endpoints.

### P2 — future enhancements

1. Role management integration with Clerk orgs/metadata.
2. Global cross-patient activity feed with filters.
3. Calendar availability conflict detection and appointment slot suggestions.
4. Prescription issuing/editing if Parchment workflow expands beyond read-only.

## 6. Implementation notes for backend

- Keep all mutation endpoints idempotent where possible.
- All mutations should create audit rows.
- Patient activity is not the same as audit: activity is user-facing timeline; audit is compliance history.
- Preserve existing endpoint paths where already used by the frontend.
- If changing response casing or wrappers, coordinate a frontend update in the same release.
- For HTML fields (`notes`, `outcome`, note `content`), backend should sanitize or enforce a safe allowed tag list before storage/rendering.
- For uploads, validate MIME type and file size server-side; frontend validation is not sufficient.
- For deletes, prefer soft-delete when required by healthcare/compliance policy, but hide soft-deleted records from default list endpoints.
- Backend should not rely on browser-submitted role/author fields where Clerk actor context is available.

## 7. Acceptance checklist

- [ ] All P0 endpoints return the exact response wrappers documented here.
- [ ] All list endpoints include stable pagination metadata.
- [ ] Patient detail loads with patient, counts, latest clinical, prescriptions, and consultations without hard failures when optional data is missing.
- [ ] Patient delete removes/hides related records and writes audit history.
- [ ] Clinical approval updates review fields and refreshes latest/list endpoints.
- [ ] Consultation create/update/delete writes activity events.
- [ ] Document upload/update/verify/reject/delete writes activity events and handles binary files through R2.
- [ ] Dashboard no longer uses hardcoded metrics/activity.
- [ ] Admin page can list, invite, update role, and disable users.
- [ ] Error responses use consistent status codes and `{ success: false, error, details }` body.
