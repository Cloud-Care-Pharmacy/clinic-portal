// ============================================
// Backend-mirrored types (from prescription-gateway)
// ============================================

/**
 * Intake form data — matches backend IntakeFormData exactly.
 * 6-step wizard: About You → Smoking Status → Smoking History → Vaping Status → Vaping History → Medical History
 */
export interface IntakeFormData {
  // Step 1 — About You: Personal Details
  firstName: string;
  lastName: string;
  email: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  gender: string;
  streetAddress: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;
  mobile: string;
  medicareNumber?: string;
  medicareIRN?: string;

  // Step 2 — Smoking Status
  smokingStatus: string;

  // Step 3 — Smoking History (skipped if smokingStatus = "never-smoked-or-vaped")
  cigarettesPerDay?: string;
  yearsSmoked?: string;
  timesTriedQuitting?: string;
  quitMotivation?: string[];
  quitMethods?: string[];
  quitMethodExplanation?: string;
  lastCigarette?: string;

  // Step 4 — Vaping Status
  vapingStatus: string;

  // Step 5 — Vaping History (skipped if vapingStatus = "no")
  vapingMethod?: string;
  vapingStrength?: string;
  vapingVolume?: string;
  vapingNotes?: string;

  // Step 1 — Proof of Age (required)
  proofOfAge: string;
  proofOfAgeFileName: string;
  proofOfAgeFileType: string;

  // Step 6 — Medical History
  hasMedicalConditions: string;
  medicalConditions?: string[];
  medicalConditionsOther?: string;
  takesMedication: string;
  highRiskMedications?: string[];
  medicationsList?: string;
  cardiovascular: string;
  pregnancy: string;
  forwardEmail?: string;
  additionalNotes?: string;
  safetyAcknowledgment: string;
}

/** Entity (Shopify shop) */
export interface Entity {
  id: string;
  shopifyDomain: string;
  name: string | null;
  emailPrefix: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Patient mapping — matches GET /api/patients/:id response */
export interface PatientMapping {
  id: string;
  entityId: string | null;
  generatedEmail: string;
  originalEmail: string;
  pbsPatientId?: string | null;
  halaxyPatientId: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  mobile: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  medicareNumber: string | null;
  medicareIrn: string | null;
  forwardEmail: string | null;
  proofOfAgeFileName: string | null;
  proofOfAgeFileType: string | null;
  createdAt: string;
  updatedAt: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
}

export interface PatientsListResponse {
  success: boolean;
  data: {
    entityId: string;
    shopifyDomain?: string;
    patients: PatientMapping[];
    pagination: { limit: number; offset: number; total: number };
  };
}

export type PatientPmsStatusFilter = "linked" | "pending";
export type PatientSortField =
  | "createdAt"
  | "firstName"
  | "lastName"
  | "dateOfBirth"
  | "halaxyPatientId"
  | "pbsPatientId";
export type SortOrder = "asc" | "desc";

export interface PatientsListQuery {
  limit?: number;
  offset?: number;
  search?: string;
  pmsStatus?: PatientPmsStatusFilter;
  sort?: PatientSortField;
  order?: SortOrder;
}

export interface PatientSearchResult {
  id: string;
  displayName: string;
  originalEmail: string | null;
  generatedEmail: string | null;
  mobile: string | null;
  dateOfBirth: string | null;
  pbsPatientId: string | null;
  halaxyPatientId: string | null;
}

export interface PatientSearchResponse {
  success: boolean;
  data: {
    entityId: string;
    patients: PatientSearchResult[];
  };
}

/** Email record */
export interface EmailRecord {
  id: string;
  patientId: string | null;
  fromAddress: string | null;
  subject: string | null;
  messageId: string | null;
  attachmentCount: number;
  receivedAt: string;
  status: "received" | "processed" | "failed";
  createdAt?: string;
  updatedAt?: string;
}

/** Email attachment metadata from R2 */
export interface AttachmentMetadata {
  filename: string;
  contentType: string;
  size: number;
}

/** Email metadata from R2 metadata.json */
export interface EmailMetadata {
  id: string;
  from: string | null;
  subject: string | null;
  date: string | null;
  messageId: string | null;
  receivedAt: string;
  attachments: AttachmentMetadata[];
}

/** Submission result from backend */
export interface SubmissionResult {
  success: boolean;
  patientId: string;
  email?: string;
  documentId?: string;
  isNewPatient?: boolean;
  createdTaskIds?: string[];
  createdTaskCount?: number;
}

// ============================================
// Patient Prescription types (local index + Parchment detail)
// ============================================

/** Local prescription index row — populated by Parchment webhook. */
export interface PatientPrescription {
  id: string;
  patientId: string;
  entityId: string | null;
  parchmentPrescriptionId: string;
  prescriptionDate: string; // ISO datetime
  prescriberName: string | null;
  status: string; // free-form from Parchment: 'active' | 'expired' | 'cancelled' | ...
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/** Result of a sync from Parchment → local index. */
export interface PrescriptionSyncResult {
  patientId: string;
  parchmentPatientId: string | null;
  synced: number;
  created: number;
  updated: number;
  skipped: boolean;
  reason?: string;
}

/** Live medication payload fetched from Parchment for a single prescription. */
export interface ParchmentPrescriptionDetail {
  type?: string;
  url?: string;
  scid: string;
  status: string;
  createdDate: string;
  itemName?: string;
  quantity?: string;
  repeatsAuthorised?: string;
  repeatIntervals?: string;
  pbsCode?: string;
}

export interface ListPrescriptionsResponse {
  success: true;
  data: {
    patientId: string;
    prescriptions: PatientPrescription[];
    pagination: { limit: number; offset: number; total: number };
    sync: PrescriptionSyncResult | null;
  };
}

export interface GetPrescriptionResponse {
  success: true;
  data: {
    prescription: PatientPrescription;
    parchment: ParchmentPrescriptionDetail | null;
  };
}

export interface SyncPrescriptionsResponse {
  success: true;
  data: { sync: PrescriptionSyncResult };
}

// ============================================
// Clinical Data types (from prescription-gateway)
// ============================================

/** Clinical data record — matches GET /api/patients/:id/clinical-data response */
export interface ClinicalDataRecord {
  id: string;
  patientId: string;
  smokingStatus: string;
  cigarettesPerDay: string | null;
  yearsSmoked: string | null;
  timesTriedQuitting: string | null;
  quitMotivation: string[];
  quitMethods: string[];
  quitMethodExplanation: string | null;
  lastCigarette: string | null;
  vapingStatus: string;
  vapingMethod: string | null;
  vapingStrength: string | null;
  vapingVolume: string | null;
  vapingNotes: string | null;
  hasMedicalConditions: string;
  medicalConditions: string[];
  medicalConditionsOther: string | null;
  takesMedication: string;
  highRiskMedications: string[];
  medicationsList: string | null;
  cardiovascular: string;
  pregnancy: string;
  additionalNotes: string | null;
  safetyAcknowledgment: string;
  reviewStatus?: "pending" | "approved";
  reviewedBy?: string | null;
  reviewedByRole?: "admin" | "doctor" | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  submittedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicalDataListResponse {
  success: boolean;
  data: {
    patientId: string;
    records: ClinicalDataRecord[];
    pagination: { limit: number; offset: number; total: number };
  };
}

export interface LatestClinicalDataResponse {
  success: boolean;
  data: {
    clinicalData: ClinicalDataRecord;
  };
}

export interface ClinicalDataApprovalResponse {
  success: boolean;
  data: {
    record: ClinicalDataRecord;
  };
}

/** Payload for PUT /api/patients/:id */
export interface UpdatePatientPayload {
  firstName: string;
  lastName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  gender: string;
  streetAddress: string;
  city: string;
  postcode: string;
  mobile: string;
  proofOfAgeFileName: string;
  proofOfAgeFileType: string;
  state?: string;
  country?: string;
  medicareNumber?: string;
  medicareIRN?: string;
  forwardEmail?: string;
}

// ============================================
// Patient Document types (from prescription-gateway)
// ============================================

export type DocumentCategory =
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

export type DocumentStatus = "uploaded" | "verified" | "rejected";

export type DocumentSource = "upload" | "email_attachment";

export interface PatientDocument {
  id: string;
  patientId: string;
  entityId: string;
  filename: string;
  contentType: string;
  fileSize: number;
  category: DocumentCategory;
  description: string | null;
  expiryDate: string | null;
  source: DocumentSource;
  sourceEmailId: string | null;
  status: DocumentStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientDocumentsListResponse {
  success: boolean;
  data: {
    patientId: string;
    documents: PatientDocument[];
    pagination: { limit: number; offset: number; total: number };
  };
}

export interface EntityDocumentsListResponse {
  success: boolean;
  data: {
    entityId: string;
    documents: PatientDocument[];
    pagination: { limit: number; offset: number; total: number };
  };
}

export interface PatientDocumentResponse {
  success: boolean;
  data: {
    document: PatientDocument;
  };
}

export interface DocumentUploadPayload {
  file: File;
  category: DocumentCategory;
  description?: string;
  expiryDate?: string;
  uploadedBy?: string;
}

export interface DocumentUpdatePayload {
  category?: DocumentCategory;
  description?: string;
  expiryDate?: string | null;
}

export interface DocumentVerifyPayload {
  action: "verify" | "reject";
  verifiedBy?: string;
  reason?: string;
}

export interface DocumentSyncResponse {
  success: boolean;
  data: {
    synced: number;
    skipped: number;
    documents: PatientDocument[];
  };
}

// ============================================
// Frontend-only types (no backend yet)
// ============================================

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  smokingStatus: "current" | "ex-smoker" | "vaper" | "never";
  status: "active" | "pending" | "flagged" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type ConsultationStatus = "scheduled" | "completed" | "cancelled" | "no-show";
export type ConsultationType = "initial" | "follow-up" | "renewal";

export type ConsultationSortField = "scheduledAt" | "createdAt" | "status" | "type";

export interface ConsultationsQuery {
  status?: ConsultationStatus;
  type?: ConsultationType;
  patientId?: string;
  doctorId?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: ConsultationSortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface Consultation {
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

export interface ConsultationResponse {
  success: boolean;
  data: { consultation: Consultation };
}

export interface ConsultationsListResponse {
  success: boolean;
  data: {
    patientId?: string;
    consultations: Consultation[];
    pagination?: { limit: number; offset: number; total: number };
    filters?: Partial<ConsultationsQuery>;
  };
}

// ---- Conflicts ----
export interface ConsultationConflict {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  duration: number;
  status: ConsultationStatus;
}

export interface ConsultationConflictsResponse {
  success: boolean;
  data: { conflicts: ConsultationConflict[] };
}

// ---- Facets ----
export interface ConsultationDoctorFacet {
  id: string;
  name: string;
  consultationCount: number;
}

export interface ConsultationFacetsResponse {
  success: boolean;
  data: {
    doctors: ConsultationDoctorFacet[];
    statuses: Array<{ value: ConsultationStatus; count: number }>;
    types: Array<{ value: ConsultationType; count: number }>;
  };
}

// ---- Consultation type catalogue ----
export interface ConsultationTypeOption {
  value: ConsultationType;
  label: string;
  defaultDurationMinutes: number;
}

export interface ConsultationTypesResponse {
  success: boolean;
  data: { types: ConsultationTypeOption[] };
}

// ---- Structured error envelope (consultations only, for now) ----
export type ConsultationErrorCode =
  | "INVALID_STATUS_TRANSITION"
  | "CONSULTATION_CONFLICT"
  | "FORBIDDEN_DOCTOR_ASSIGNMENT";

export interface ConsultationApiErrorBody {
  success: false;
  error: {
    code: ConsultationErrorCode | string;
    message: string;
    details?: unknown;
  };
}

// ============================================
// Patient Task types (prescription-gateway: automated intake tasks)
// ============================================

export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskType =
  | "review_intake"
  | "schedule_consultation"
  | "verify_identity"
  | "request_missing_information"
  | "clinical_follow_up"
  | "manual";

export type TaskSortField = "dueAt" | "createdAt" | "updatedAt" | "priority" | "status";

export interface Task {
  taskId: string;
  entityId: string;
  patientId: string;
  patientName?: string | null;
  source: "intake" | "manual" | "system" | string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  taskType: TaskType;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  assignedRole?: UserRole | null;
  dueAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  completedBy?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  /** Server-computed: dueAt < server now AND status not in {completed, cancelled}. */
  isOverdue?: boolean;
  /** Server-computed: dueAt when isOverdue is true, otherwise null. */
  overdueSince?: string | null;
  /** Normalized patient contact, sourced from the linked patient row. */
  patientContact?: TaskPatientContact | null;
}

export interface TaskPatientContact {
  phone: string | null;
  email: string | null;
  fullName: string;
}

export interface TaskEvent {
  eventId: string;
  entityId: string;
  taskId: string;
  patientId: string;
  eventType:
    | "task-created"
    | "task-assigned"
    | "task-started"
    | "task-completed"
    | "task-cancelled"
    | "task-updated";
  actorUserId?: string | null;
  actorName?: string | null;
  actorRole?: UserRole | "system" | null;
  source: "system" | "user" | "intake" | string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string | null;
  createdAt: string;
}

export interface TasksQuery {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  taskType?: TaskType | TaskType[];
  patientId?: string;
  assignedUserId?: string;
  assignedRole?: UserRole | UserRole[];
  dueBefore?: string;
  createdAfter?: string;
  search?: string;
  sort?: TaskSortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
  /** When true, request the full set in one call (server caps at 2000). */
  all?: boolean;
}

export interface TasksListResponse {
  success: boolean;
  data: {
    patientId?: string;
    tasks: Task[];
    pagination?: {
      limit: number;
      offset: number;
      total: number;
      /** Present (and true) when ?all=true hit the server cap. */
      truncated?: boolean;
    };
    filters?: Partial<TasksQuery>;
  };
}

export type TaskQueuePresetTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "primary";

export interface TaskQueuePresetDef {
  id: string;
  label: string;
  tone: TaskQueuePresetTone;
  /** Lucide icon name (lowercase, kebab-case). */
  icon: string;
  /**
   * Filter values use the same shape as TasksQuery. The literal string "<self>"
   * is a placeholder that the client substitutes with the calling user id.
   */
  filter: Record<string, unknown>;
}

export interface TaskQueuePresetsResponse {
  success: boolean;
  data: {
    presets: TaskQueuePresetDef[];
  };
}

export interface TaskResponse {
  success: boolean;
  data: {
    task: Task;
    events?: TaskEvent[];
  };
}

export interface TaskSummary {
  openTaskCount: number;
  inProgressTaskCount: number;
  overdueTaskCount: number;
  urgentTaskCount: number;
  newIntakeTaskCount: number;
}

export interface TaskSummaryResponse {
  success: boolean;
  data: TaskSummary;
}

export interface CreateTaskPayload {
  patientId: string;
  taskType: TaskType;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assignedUserId?: string | null;
  assignedRole?: UserRole | null;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskPayload {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedUserId?: string | null;
  assignedRole?: UserRole | null;
  dueAt?: string | null;
  note?: string;
}

export type BulkTaskAction = "claim" | "claim_and_start";

export interface BulkClaimTasksRequest {
  taskIds: string[];
  action: BulkTaskAction;
}

export interface BulkTaskResult {
  action: BulkTaskAction;
  requested: number;
  claimed: string[];
  started: string[];
  skipped: Array<{ taskId: string; reason: string }>;
  failed: Array<{ taskId: string; error: string }>;
  tasks: Task[];
}

export interface BulkClaimTasksResponse {
  success: true;
  data: BulkTaskResult;
}

/**
 * Staff list item — matches GET /api/staff entries.
 *
 * `id` is the internal users.id UUID (use this for PATCH /api/staff/:userId/role
 * and DELETE /api/staff/:userId). `authId` is the Clerk session id.
 * Practitioner data, when present, lives on the embedded `practitioner` object
 * (was previously flat fields on this object).
 */
export interface Staff {
  id: string;
  authId: string;
  name: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl?: string;
  active: boolean;
  practitioner: PractitionerProfile | null;
  createdAt: string;
  deactivatedAt?: string | null;
}

export interface DashboardStats {
  totalPatients: number;
  pendingConsultations: number;
  activePrescriptions: number;
  newThisWeek: number;
}

export type DashboardPeriod = "7d" | "30d" | "6m" | "12m";
export type DashboardIntakeRange = "3m" | "6m" | "12m";
export type DashboardIntakeBucket = "day" | "week" | "month";

export interface DashboardSummary {
  entityId: string;
  totalPatients: number;
  totalPatientsDeltaPct: number;
  pendingConsultations: number;
  scheduledConsultations: number;
  activePrescriptions: number;
  activePrescriptionsDeltaPct: number;
  newPatientsThisWeek: number;
  newPatientsDeltaPct: number;
  documentsPendingReview: number;
  clinicalRecordsPendingReview: number;
  period: DashboardPeriod;
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummary;
}

export interface DashboardIntakeSeriesPoint {
  label: string;
  startDate: string;
  endDate: string;
  total: number;
}

export interface DashboardIntakeOverviewResponse {
  success: boolean;
  data: {
    from: string;
    to: string;
    range?: DashboardIntakeRange;
    entityId?: string;
    bucket: DashboardIntakeBucket;
    buckets: Array<{ month?: string; week?: string; day?: string; count: number }>;
    series: DashboardIntakeSeriesPoint[];
  };
}

export interface DashboardActivityItem {
  id: string;
  patientId: string | null;
  patientName: string;
  patientInitials: string;
  action: string;
  by: string;
  actorRole: "admin" | "doctor" | "staff" | "system";
  timestamp: string;
  type: ActivityEventType;
  category: ActivityEventCategory;
}

export interface DashboardRecentActivityResponse {
  success: boolean;
  data: {
    entityId: string;
    items: DashboardActivityItem[];
  };
}

export interface EntityPrescriptionSummaryResponse {
  success: boolean;
  data: {
    entityId: string;
    activePrescriptions: number;
    expiredPrescriptions: number;
    pendingPrescriptions: number;
    newThisWeek: number;
  };
}

export interface RecentActivity {
  id: string;
  action: string;
  patientName: string;
  timestamp: string;
  user: string;
}

// ============================================
// API response wrappers
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  };
}

// ============================================
// Patient Notes types (prescription-gateway: GET/POST /api/patients/:id/notes,
// PATCH/DELETE /api/patients/:id/notes/:noteId)
// ============================================

export type NoteCategory = "clinical" | "pharmacy" | "follow-up" | "general";

export interface PatientNote {
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

export interface PatientNotesResponse {
  success: boolean;
  data: {
    patientId: string;
    notes: PatientNote[];
  };
}

export interface UpdatePatientNotePayload {
  title?: string;
  content?: string;
  category?: NoteCategory;
  isPinned?: boolean;
}

// ============================================
// Patient Activity types (from prescription-gateway)
// ============================================

export type ActivityEventType =
  | "consultation-scheduled"
  | "consultation-completed"
  | "consultation-updated"
  | "task-created"
  | "task-assigned"
  | "task-started"
  | "task-completed"
  | "task-cancelled"
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

export type ActivityEventCategory =
  | "consultations"
  | "tasks"
  | "notes"
  | "prescriptions"
  | "documents"
  | "system";

export type ActivityEntityType =
  | "consultation"
  | "task"
  | "note"
  | "prescription"
  | "document"
  | "patient"
  | "flag"
  | "system";

export interface PatientActivityEvent {
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

export interface PatientActivityResponse {
  success: boolean;
  data: {
    patientId: string;
    events: PatientActivityEvent[];
    pagination: { limit: number; offset: number; total: number };
  };
}

export interface PatientCounts {
  patientId: string;
  consultations: number;
  prescriptions: number;
  clinicalRecords: number;
  documents: number;
  notes: number;
  activity: number;
  activePrescriptions?: number;
  scheduledConsultations?: number;
  completedConsultations?: number;
  pendingDocuments?: number;
}

export interface PatientCountsResponse {
  success: boolean;
  data: PatientCounts;
}

// ============================================
// User account types (from prescription-gateway users table)
// ============================================

/**
 * User account record — matches GET /api/users/me response.
 *
 * As of the users/practitioners split, this only carries account-level fields.
 * Clinical-identity fields (hpii, prescriberNumber, qualifications, name) and
 * working-hours availability live on `PractitionerProfile` instead.
 */
export interface UserProfile {
  /** Internal UUID (users.id) — canonical user id for backend calls. */
  id: string;
  /** Clerk session id (users.auth_id). Use only for Clerk SDK calls. */
  authId: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
}

export interface UserProfileResponse {
  success: boolean;
  data: { profile: UserProfile | null };
}

/** Payload for PUT /api/users/me. All fields optional — omit to leave unchanged, send `null` to clear. */
export interface UpdateUserProfilePayload {
  role?: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

// ============================================
// Practitioner profile types (from /api/practitioners*)
// ============================================

export type AvailabilityDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/**
 * A single time range within a weekday. Times are 'HH:mm' on a 15-minute
 * grid (00, 15, 30, 45) and must satisfy `startTime < endTime` on the
 * same calendar day. Cross-midnight ranges are not supported — model them
 * as two slots on consecutive days.
 */
export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

export interface AvailabilityDayEntry {
  enabled: boolean;
  /**
   * Ordered list of time ranges for this weekday. Empty array means the
   * day is off. Slots within a day must not overlap (touching at the
   * boundary, e.g. 09:00–10:00 and 10:00–11:00, is allowed).
   */
  slots?: AvailabilitySlot[];
  /**
   * @deprecated Use `slots` instead. Retained for read back-compat with
   * the legacy single-slot schedule shape; mirrors `slots[0].startTime`.
   */
  startTime?: string;
  /**
   * @deprecated Use `slots` instead. Retained for read back-compat with
   * the legacy single-slot schedule shape; mirrors `slots[0].endTime`.
   */
  endTime?: string;
}

export type AvailabilitySchedule = Record<AvailabilityDayKey, AvailabilityDayEntry>;

export type ConsultationModality = "telehealth" | "in_person" | "home_visit";

export interface PractitionerAvailability {
  timezone: string;
  schedule: Partial<AvailabilitySchedule>;
  consultationTypes: ConsultationModality[] | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface PractitionerBusinessAddress {
  streetNumber: string | null;
  streetName: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
}

export interface PractitionerBusinessDetails {
  practitionerId: string;
  businessPhone: string | null;
  businessEmail: string | null;
  address: PractitionerBusinessAddress;
  /** Australian Business Number — free text. */
  abn: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Practitioner profile — names live on `UserProfile.firstName` / `UserProfile.lastName`,
 * NOT here. `business` and `availability` are independently `null` until first save.
 */
export interface PractitionerProfile {
  id: string;
  userId: string;

  // Professional identity
  title: string | null;
  specialty: string | null;
  /** Free-text qualifications, e.g. "MBBS, FRACGP". */
  qualifications: string | null;

  // Regulatory identifiers
  hpii: string | null;
  prescriberNumber: string | null;
  ahpraNumber: string | null;
  hospitalProviderNumber: string | null;
  providerNumber: string | null;

  active: boolean;

  business: PractitionerBusinessDetails | null;
  availability: PractitionerAvailability | null;

  createdAt: string;
  updatedAt: string;
}

export interface PractitionerProfileResponse {
  success: boolean;
  data: { practitioner: PractitionerProfile | null };
}

export interface PractitionerAvailabilityResponse {
  success: boolean;
  data: { availability: PractitionerAvailability | null };
}

/**
 * Payload for PUT /api/practitioners/me. All fields optional — omit to leave
 * unchanged, send `null` to clear. Send a `business` object (or any subset of
 * its fields) to create/update the business-details row.
 */
export interface UpdatePractitionerBusinessPayload {
  businessPhone?: string | null;
  businessEmail?: string | null;
  abn?: string | null;
  address?: Partial<PractitionerBusinessAddress>;
}

export interface UpdatePractitionerPayload {
  title?: string | null;
  specialty?: string | null;
  qualifications?: string | null;
  hpii?: string | null;
  prescriberNumber?: string | null;
  ahpraNumber?: string | null;
  hospitalProviderNumber?: string | null;
  providerNumber?: string | null;
  active?: boolean;
  business?: UpdatePractitionerBusinessPayload;
}

export interface UpdatePractitionerAvailabilityPayload {
  timezone?: string;
  availability: AvailabilitySchedule;
  consultationTypes?: ConsultationModality[] | null;
}

// ============================================
// Practitioner directory + scheduling (GET /api/practitioners*)
// ============================================

/** Entry from `GET /api/practitioners`. `userId` matches `consultations.doctorId`. */
export interface PractitionerDirectoryEntry {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  role: UserRole;
  email: string | null;
  isActive: boolean;
}

export interface PractitionersListResponse {
  success: boolean;
  data: { practitioners: PractitionerDirectoryEntry[] };
}

export interface PractitionersListQuery {
  role?: UserRole;
  active?: boolean;
  search?: string;
}

/** Single open booking window from `GET /api/practitioners/:userId/free-slots`. */
export interface PractitionerFreeSlot {
  /** Wall-clock 'HH:mm' in the response timezone. */
  startTime: string;
  /** Wall-clock 'HH:mm' in the response timezone. */
  endTime: string;
  /** Absolute UTC instant — pass straight to `consultations.scheduledAt`. */
  startsAt: string;
}

export interface PractitionerFreeSlotsResponse {
  success: boolean;
  data: {
    date: string;
    timezone: string;
    duration: number;
    slots: PractitionerFreeSlot[];
  };
}

// ============================================
// Session types
// ============================================

export type UserRole = "admin" | "doctor" | "staff";

export interface UserSession {
  name: string;
  email: string;
  image?: string;
  role: UserRole;
}
