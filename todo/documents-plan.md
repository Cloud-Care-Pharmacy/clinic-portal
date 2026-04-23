# Plan: Documents Section — Patient Document Management

## TL;DR

The patient detail page currently has a "Documents" tab that shows the `EmailsTab` (email records from the backend). This plan expands it into a full document management system where staff can upload, categorize, preview, and manage patient documents (IDs, prescriptions, lab results, referral letters, consent forms, etc.). Documents are stored in R2 via the backend, with metadata in D1. The backend team needs to build the `/api/patients/:id/documents` endpoints — this plan defines the API contract, data model, and frontend integration.

## What Other Patient Management Systems Typically Include

Industry-standard document management features across platforms like Halaxy, Cliniko, Jane App, Practice Better, Athenahealth, and Epic:

1. **Document Upload** — Drag-and-drop or file picker upload. Support for PDF, images (JPEG/PNG), HEIC (phone photos), and common office formats. Multi-file upload in one action. File size limits (typically 10-25MB per file).

2. **Document Categories/Types** — Structured categorization: Proof of Identity, Prescription, Lab Result, Referral Letter, Consent Form, Insurance/Medicare Card, Clinical Report, Imaging/X-Ray, Correspondence, Other. Categories help with filtering and compliance.

3. **Document Preview/Viewer** — Inline preview for PDFs and images without downloading. PDF viewer with zoom/scroll. Image viewer with zoom/rotate. Download option for all file types.

4. **Document Status Workflow** — Uploaded → Under Review → Verified → Expired / Rejected. Staff or doctor reviews and verifies uploaded documents. Expiry tracking for time-sensitive documents (IDs, prescriptions, insurance cards).

5. **Document Metadata** — Filename, file type, file size, upload date, uploaded by (staff/patient), category, description/notes, expiry date (optional), verified by, verified date.

6. **Version History** — Re-upload a newer version of the same document (e.g., updated ID). Previous versions retained for audit trail. Version number or "superseded" flag on older versions.

7. **Search & Filtering** — Filter by category, status, date range, uploaded by. Full-text search on filename and description. Sort by date, name, category.

8. **Access Control** — Role-based: admins and doctors can verify/reject; staff can upload and view; patient-uploaded documents marked separately. Audit log of who viewed/downloaded.

9. **Bulk Operations** — Select multiple documents for download (as ZIP), categorization, or deletion.

10. **Email Attachment Integration** — Auto-link attachments from received emails as documents. Show source email reference on the document.

11. **Expiry Alerts** — Flag documents nearing expiry (e.g., proof of age expiring in 30 days). Dashboard indicator for patients with expired documents.

12. **Compliance & Retention** — Soft delete with retention period. Audit trail for all document actions. Secure storage with encryption at rest (R2 handles this).

## Recommended Scope (MVP)

**In scope:**

- Document listing in patient detail "Documents" tab (replaces current EmailsTab)
- Document upload via file picker (single and multi-file)
- Document categorization (assign category on upload or edit later)
- Document preview — inline viewer for PDFs and images
- Document download (individual files)
- Document metadata: filename, type, size, category, description, uploaded by, upload date, expiry date (optional)
- Document status workflow: `uploaded` → `verified` | `rejected` (simple two-step review)
- Delete document (soft delete)
- Filter by category and status
- Email attachment integration: existing email attachments surfaced as documents automatically
- Standalone `/documents` page listing all documents across all patients with filters

**Out of scope (future):**

- Version history / re-upload superseding
- Bulk operations (ZIP download, bulk categorize)
- Drag-and-drop upload (file picker only for MVP)
- OCR / text extraction
- Expiry alerts / dashboard indicators
- Patient self-upload portal
- Document templates
- Full audit trail UI (backend should log, but no UI yet)

## API Contract (for Backend Team)

### Data Model

```sql
-- D1 table: documents
CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  patient_id TEXT NOT NULL REFERENCES patient_mappings(id),
  entity_id TEXT NOT NULL REFERENCES entities(id),
  
  -- File info (from R2)
  filename TEXT NOT NULL,                -- Original filename
  r2_key TEXT NOT NULL,                  -- R2 object key (e.g., "documents/{patient_id}/{id}/{filename}")
  content_type TEXT NOT NULL,            -- MIME type (application/pdf, image/jpeg, etc.)
  file_size INTEGER NOT NULL,            -- Bytes
  
  -- Metadata
  category TEXT NOT NULL DEFAULT 'other', -- See categories below
  description TEXT,                       -- Optional free-text description
  expiry_date TEXT,                       -- ISO 8601 date, nullable (for IDs, prescriptions, etc.)
  
  -- Source tracking
  source TEXT NOT NULL DEFAULT 'upload',  -- 'upload' | 'email_attachment'
  source_email_id TEXT,                   -- FK to emails table if source = 'email_attachment'
  
  -- Status
  status TEXT NOT NULL DEFAULT 'uploaded', -- 'uploaded' | 'verified' | 'rejected'
  verified_by TEXT,                        -- User email who verified/rejected
  verified_at TEXT,                        -- ISO 8601 timestamp
  rejection_reason TEXT,                   -- Free text if status = 'rejected'
  
  -- Audit
  uploaded_by TEXT NOT NULL,               -- User email who uploaded
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT                           -- Soft delete timestamp
);

CREATE INDEX idx_documents_patient_id ON documents(patient_id);
CREATE INDEX idx_documents_entity_id ON documents(entity_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_source_email_id ON documents(source_email_id);
```

### Document Categories

| Category | Label | Description |
|---|---|---|
| `proof_of_identity` | Proof of Identity | Government-issued ID, passport, driver's licence |
| `proof_of_age` | Proof of Age | Age verification document (existing intake field) |
| `prescription` | Prescription | External prescriptions, scripts |
| `lab_result` | Lab Result | Blood tests, pathology reports |
| `referral` | Referral Letter | GP or specialist referral |
| `consent_form` | Consent Form | Signed consent/agreement forms |
| `insurance` | Insurance / Medicare | Medicare card, private health insurance |
| `clinical_report` | Clinical Report | Specialist reports, discharge summaries |
| `imaging` | Imaging / X-Ray | Radiology, X-rays, scans |
| `correspondence` | Correspondence | Letters, general communications |
| `other` | Other | Uncategorized documents |

### Endpoints

#### 1. List Documents for a Patient

```
GET /api/entities/:entityId/patients/:patientId/documents
```

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `category` | string | — | Filter by category |
| `status` | string | — | Filter by status (`uploaded`, `verified`, `rejected`) |
| `source` | string | — | Filter by source (`upload`, `email_attachment`) |
| `limit` | number | 50 | Pagination limit |
| `offset` | number | 0 | Pagination offset |
| `sort` | string | `created_at` | Sort field (`created_at`, `filename`, `category`) |
| `order` | string | `desc` | Sort order (`asc`, `desc`) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patientId": "uuid",
    "documents": [
      {
        "id": "abc123",
        "patient_id": "uuid",
        "filename": "drivers-licence.pdf",
        "content_type": "application/pdf",
        "file_size": 245760,
        "category": "proof_of_identity",
        "description": "NSW Driver's Licence",
        "expiry_date": "2028-03-15",
        "source": "upload",
        "source_email_id": null,
        "status": "verified",
        "verified_by": "admin@quity.com.au",
        "verified_at": "2026-04-20T10:30:00Z",
        "rejection_reason": null,
        "uploaded_by": "staff@quity.com.au",
        "created_at": "2026-04-19T08:00:00Z",
        "updated_at": "2026-04-20T10:30:00Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 12
    }
  }
}
```

#### 2. Get Single Document Metadata

```
GET /api/entities/:entityId/patients/:patientId/documents/:documentId
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document": { /* same shape as item in list */ }
  }
}
```

#### 3. Get Document Download URL (Pre-signed R2 URL)

```
GET /api/entities/:entityId/patients/:patientId/documents/:documentId/download
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://r2-presigned-url...",
    "expiresIn": 3600,
    "filename": "drivers-licence.pdf",
    "content_type": "application/pdf"
  }
}
```

**Notes:**
- Returns a time-limited pre-signed R2 URL (1 hour expiry)
- Frontend uses this URL for both preview (inline) and download
- Backend should log the download/view event for audit

#### 4. Upload Document

```
POST /api/entities/:entityId/patients/:patientId/documents
Content-Type: multipart/form-data
```

**Form fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | The file to upload |
| `category` | string | Yes | Document category (from categories list) |
| `description` | string | No | Free-text description |
| `expiry_date` | string | No | ISO 8601 date (YYYY-MM-DD) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "new-doc-id",
      "patient_id": "uuid",
      "filename": "blood-test-results.pdf",
      "content_type": "application/pdf",
      "file_size": 102400,
      "category": "lab_result",
      "description": "March 2026 blood panel",
      "expiry_date": null,
      "source": "upload",
      "source_email_id": null,
      "status": "uploaded",
      "verified_by": null,
      "verified_at": null,
      "rejection_reason": null,
      "uploaded_by": "staff@quity.com.au",
      "created_at": "2026-04-23T14:00:00Z",
      "updated_at": "2026-04-23T14:00:00Z"
    }
  }
}
```

**Validation rules:**
- Max file size: 10MB
- Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `image/webp`
- Filename sanitized on backend (strip path traversal, special chars)
- `category` must be one of the defined categories

**R2 storage key pattern:**
```
documents/{entity_id}/{patient_id}/{document_id}/{sanitized_filename}
```

#### 5. Update Document Metadata

```
PATCH /api/entities/:entityId/patients/:patientId/documents/:documentId
Content-Type: application/json
```

**Body:**
```json
{
  "category": "lab_result",
  "description": "Updated description",
  "expiry_date": "2027-01-01"
}
```

All fields optional — only provided fields are updated.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document": { /* updated document */ }
  }
}
```

#### 6. Verify / Reject Document

```
POST /api/entities/:entityId/patients/:patientId/documents/:documentId/verify
Content-Type: application/json
```

**Body:**
```json
{
  "action": "verify"
}
```
or
```json
{
  "action": "reject",
  "reason": "Document is expired, please upload current version"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document": { /* updated document with status, verified_by, verified_at */ }
  }
}
```

**Rules:**
- Only `admin` and `doctor` roles can verify/reject
- `reason` is required when `action` is `reject`
- Sets `verified_by` to the authenticated user's email
- Sets `verified_at` to current timestamp

#### 7. Delete Document (Soft Delete)

```
DELETE /api/entities/:entityId/patients/:patientId/documents/:documentId
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

**Rules:**
- Sets `deleted_at` timestamp (soft delete)
- Does NOT remove the R2 object immediately (retention policy, can be cleaned up by a scheduled worker later)
- Only `admin` role can delete
- Deleted documents excluded from list responses by default

#### 8. Sync Email Attachments as Documents

```
POST /api/entities/:entityId/patients/:patientId/documents/sync-email-attachments
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "synced": 3,
    "skipped": 2,
    "documents": [ /* newly created document records */ ]
  }
}
```

**Notes:**
- Scans `emails` table for this patient's emails with attachments
- For each attachment not already linked as a document, creates a document record
- Sets `source: "email_attachment"` and `source_email_id`
- Sets `category: "correspondence"` by default (staff can recategorize later)
- `skipped` = attachments that already have a linked document record
- Can be triggered manually or automatically when emails are processed

### Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Document not found",
  "details": "No document with ID abc123 exists for this patient"
}
```

| Status | When |
|---|---|
| 400 | Invalid request body, unsupported file type, file too large |
| 401 | Missing or invalid API key |
| 403 | Role not authorized for action (e.g., staff trying to verify) |
| 404 | Patient or document not found |
| 409 | Duplicate (e.g., sync tries to re-link already-linked attachment) |
| 413 | File exceeds size limit |
| 500 | Internal server error |

## Frontend Implementation Steps

### Phase 1: Types & Data Layer

1. **Add document types** to `src/types/index.ts`
   - `DocumentCategory` union type matching the categories table above
   - `DocumentStatus` union type: `"uploaded" | "verified" | "rejected"`
   - `DocumentSource` union type: `"upload" | "email_attachment"`
   - `PatientDocument` interface matching the API response shape
   - `DocumentDownloadResponse` for the download URL endpoint
   - `PatientDocumentsResponse` wrapper type (same pattern as `ParchmentPrescriptionsResponse`)
   - `CreateDocumentPayload`, `UpdateDocumentPayload`, `VerifyDocumentPayload` for mutations

2. **Create TanStack Query hook** at `src/lib/hooks/use-documents.ts` — _depends on step 1_
   - `useDocuments(patientId: string, filters?)` — list with optional category/status filter
   - `useDocument(patientId: string, documentId: string)` — single document metadata
   - `useDocumentDownloadUrl(patientId: string, documentId: string)` — get pre-signed URL
   - `useUploadDocument()` — mutation, sends `FormData` via proxy
   - `useUpdateDocument()` — mutation (edit metadata)
   - `useVerifyDocument()` — mutation (verify/reject)
   - `useDeleteDocument()` — mutation
   - `useSyncEmailAttachments()` — mutation
   - Query keys: `["documents", patientId]`, `["document", patientId, documentId]`
   - Invalidation: all mutations invalidate `["documents", patientId]`

### Phase 2: Patient Detail — Documents Tab

3. **Create `DocumentsTab` component** at `src/components/patients/DocumentsTab.tsx` — _depends on step 2_
   - Replaces current `EmailsTab` in the patient detail page "Documents" tab
   - MUI DataGrid with columns: Filename (with file type icon), Category (badge), Status (StatusBadge), Size (formatted), Uploaded By, Upload Date, Actions (view/download/edit/delete)
   - FilterBar: category dropdown, status dropdown, search by filename
   - Row click → opens `DocumentDetailSheet`
   - "Upload Document" button in header → opens `UploadDocumentSheet`
   - "Sync Email Attachments" button (secondary) → triggers sync mutation
   - Empty state via `<EmptyState>` with "Upload Document" action

4. **Create `UploadDocumentSheet` component** at `src/components/patients/UploadDocumentSheet.tsx` — _parallel with step 3_
   - Sheet side panel
   - React Hook Form + Zod v4 manual safeParse
   - Fields: File input (accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp"), Category (Select), Description (textarea, optional), Expiry Date (date input, optional)
   - File validation: max 10MB, allowed MIME types
   - Show file preview thumbnail for images, PDF icon for PDFs
   - Upload progress indicator
   - On submit: construct `FormData`, call `useUploadDocument` mutation → toast success → close sheet

5. **Create `DocumentDetailSheet` component** at `src/components/patients/DocumentDetailSheet.tsx` — _parallel with step 4_
   - Sheet side panel showing document metadata
   - Inline preview: PDF rendered in `<iframe>` or `<object>`, images in `<img>`, using the pre-signed download URL
   - Metadata display: filename, category, description, size, upload date, uploaded by, status, verified by/at
   - Actions:
     - "Download" button → opens pre-signed URL in new tab with `Content-Disposition: attachment`
     - "Edit" → inline edit of category, description, expiry date
     - "Verify" / "Reject" buttons (only for admin/doctor roles, only when status is `uploaded`)
     - "Delete" button (only for admin role, with confirmation dialog)
   - If source is `email_attachment`, show link to source email info

6. **Update patient detail page** — _depends on steps 3-5_
   - Replace `EmailsTab` usage in "Documents" tab with new `DocumentsTab`
   - Keep emails data accessible (DocumentsTab shows both uploaded docs and email-synced docs via source filter)

### Phase 3: Standalone Documents Page

7. **Create `/documents` page** at `src/app/(dashboard)/documents/page.tsx` — _depends on step 2_
   - Top-level page listing all documents across all patients
   - MUI DataGrid with columns: Patient Name, Filename, Category, Status, Size, Uploaded By, Date
   - Filters: patient search, category, status, date range
   - Row click → navigates to patient detail page Documents tab (or opens DocumentDetailSheet inline)
   - Accessible from sidebar navigation

8. **Add sidebar navigation item** — _parallel with step 7_
   - Add "Documents" link to sidebar below "Patients"
   - Icon: `FileText` from Lucide

### Phase 4: StatusBadge + UI Polish

9. **Add document statuses to `StatusBadge`** — _parallel, can do anytime_
   - `uploaded` → blue/default
   - `verified` → green
   - `rejected` → red

10. **Add document category badges** — _parallel_
    - Color-coded badges for each category (similar to consultation type badges)
    - Reusable `DocumentCategoryBadge` component or extend `StatusBadge`

### Phase 5: Email Attachment Migration

11. **Add auto-sync trigger** — _depends on step 2_
    - When the Documents tab loads for a patient, check if there are un-synced email attachments
    - Show a banner: "3 email attachments found — Sync as documents?" with action button
    - After sync, documents appear in the list with `source: "email_attachment"` badge

## Relevant Files

### Modify

- `src/types/index.ts` — Add `PatientDocument`, `DocumentCategory`, `DocumentStatus`, response wrappers
- `src/app/(dashboard)/patients/[id]/page.tsx` — Replace `EmailsTab` with `DocumentsTab` in Documents tab
- `src/components/shared/StatusBadge.tsx` — Add document status colors (`uploaded`, `verified`, `rejected`)
- `src/components/layout/Sidebar.tsx` — Add "Documents" nav item

### Create

- `src/lib/hooks/use-documents.ts` — TanStack Query hooks (reference: `src/lib/hooks/use-prescriptions.ts`, `src/lib/hooks/use-emails.ts`)
- `src/components/patients/DocumentsTab.tsx` — Main documents listing tab (reference: `src/components/patients/NotesTab.tsx`)
- `src/components/patients/UploadDocumentSheet.tsx` — Upload form sheet
- `src/components/patients/DocumentDetailSheet.tsx` — Detail/preview/actions panel
- `src/app/(dashboard)/documents/page.tsx` — Standalone documents listing page

### Reference Only (patterns to follow)

- `src/lib/hooks/use-emails.ts` — TanStack Query hook pattern for patient-scoped data
- `src/lib/hooks/use-prescriptions.ts` — Hook with proxy fetching pattern
- `src/components/patients/NotesTab.tsx` — Sheet form + DataGrid pattern in a tab
- `src/components/patients/PatientTable.tsx` — DataGrid with FilterBar pattern
- `src/app/(dashboard)/prescriptions/page.tsx` — Listing page with Sheet detail panel
- `src/app/api/proxy/[...path]/route.ts` — Proxy route (documents will go through same proxy)

## Backend Implementation Notes

### R2 Storage Layout

```
documents/
  {entity_id}/
    {patient_id}/
      {document_id}/
        {sanitized_filename}      ← the actual file
```

### Multipart Upload Handling

- Cloudflare Workers support `request.formData()` for multipart parsing
- Extract the `file` field, read as `ArrayBuffer` or `ReadableStream`
- Stream directly to R2 via `R2Bucket.put()` — avoid buffering the full file in memory
- Set `httpMetadata.contentType` and `httpMetadata.contentDisposition` on the R2 object

### Pre-signed URL Generation

- Use R2's `createSignedUrl()` or generate a time-limited token
- Alternative: Create a `/documents/:id/file` endpoint that streams the R2 object directly through the worker (simpler, no CORS issues, but uses worker CPU time)
- Recommendation: Direct stream through worker for MVP (simpler), move to pre-signed URLs for performance at scale

### Email Attachment Sync Logic

- Query `emails` table for patient, join with existing `documents` where `source_email_id` matches
- For each email attachment not already linked:
  1. Read attachment from existing R2 email storage (e.g., `emails/{email_id}/attachments/{filename}`)
  2. Copy to documents R2 path (or reference the same key — depends on retention needs)
  3. Create `documents` D1 record with `source: "email_attachment"`

### Auth & Proxy Integration

- All document endpoints require `X-API-Key` header (same as other endpoints)
- Frontend calls go through `/api/proxy/[...path]` which injects the key
- For file uploads, the proxy must forward the `multipart/form-data` body — ensure the proxy route handles non-JSON content types
- Check `src/app/api/proxy/[...path]/route.ts` — it may need updates to pass through `FormData` bodies without parsing them

### Migration

```sql
-- Add to D1 migrations
-- Migration: 0005_create_documents_table.sql

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  patient_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  expiry_date TEXT,
  source TEXT NOT NULL DEFAULT 'upload',
  source_email_id TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  verified_by TEXT,
  verified_at TEXT,
  rejection_reason TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (patient_id) REFERENCES patient_mappings(id),
  FOREIGN KEY (entity_id) REFERENCES entities(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity_id ON documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
```

## Verification

1. `npx tsc --noEmit` — no type errors after frontend changes
2. `npm run lint` — passes ESLint
3. `npm run build` — successful production build
4. Manual: Navigate to `/patients/[id]` → Documents tab → see empty state → upload a document → see it in DataGrid
5. Manual: Click document row → detail sheet opens → preview renders for PDF/image
6. Manual: Download a document → file downloads correctly
7. Manual: Verify a document (as admin) → status changes to "verified" with green badge
8. Manual: Reject a document → prompted for reason → status changes to "rejected" with red badge
9. Manual: Edit document metadata (category, description, expiry) → changes persist
10. Manual: Delete a document (as admin) → confirmation dialog → document removed from list
11. Manual: "Sync Email Attachments" → email attachments appear as documents with "email" source badge
12. Manual: Navigate to `/documents` → see all documents across patients with filters
13. Manual: Filter by category → only matching documents shown
14. Manual: staff role cannot see verify/reject buttons; admin can

## Decisions

- **Backend API (not local store):** Unlike consultations, documents require file storage (R2). No practical way to mock file uploads locally. Backend team builds the endpoints, frontend integrates via the existing proxy pattern.
- **Soft delete:** Documents are soft-deleted (`deleted_at` timestamp) for compliance/audit. R2 objects retained and cleaned up by a scheduled worker later.
- **Pre-signed URLs vs streaming:** Recommend streaming through the worker for MVP (simpler, no CORS). Pre-signed URLs are a performance optimization for later.
- **Multipart through proxy:** The existing proxy route may need to handle `FormData` passthrough for uploads. This is a known integration point to verify.
- **Email attachment sync as explicit action:** Rather than auto-syncing all email attachments as documents (which adds noise), this is a manual trigger. Staff decides when to import.
- **Categories over tags:** Fixed categories (not free-form tags) for consistency and filtering. "Other" category as catch-all. Can add more categories later without schema changes (it's a TEXT field).
- **Documents tab replaces EmailsTab:** The current "Documents" tab shows raw email records. The new tab shows proper documents (uploaded + email-synced). Emails section can be exposed as a source filter rather than a separate tab.
- **10MB file limit:** Balances practical needs (most clinical documents are small) with Cloudflare Worker memory constraints. Can increase later with streaming upload support.
