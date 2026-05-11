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
  medicareExpiry?: string | null;

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
  tenantDomain?: string | null;
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
  medicareExpiry: string | null;
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

/**
 * Payload for PATCH /api/patients/:id (modern partial update).
 *
 * Send only the fields the user actually edited. All fields are optional.
 * Unknown fields are rejected by the backend with `400 Unknown patient field`.
 *
 * Note: `dateOfBirth` is a single `YYYY-MM-DD` string — do NOT split into
 * `dobDay`/`dobMonth`/`dobYear` (those belong to the legacy intake-replay
 * `PUT /api/patients/:id` endpoint). `medicareIrn` uses lowercase `Irn`.
 */
export interface UpdatePatientPayload {
  namePrefix?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: string;
  mobile?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  medicareNumber?: string;
  medicareIrn?: string;
  medicareExpiry?: string | null; // YYYY-MM-DD
  forwardEmail?: string;
  pbsPatientId?: string;
  patientStatus?: string;
  deceased?: boolean;
  profileType?: string;
  introSource?: { date?: string; comments?: string } | null;
  emergencyContacts?: Array<Record<string, unknown>>;
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
    | "created"
    | "assigned"
    | "started"
    | "completed"
    | "cancelled"
    | "updated"
    | "deleted"
    | "priority_escalated"
    | "reassigned"
    | "snoozed"
    | "status_changed"
    | "task-created"
    | "task-assigned"
    | "task-started"
    | "task-completed"
    | "task-cancelled"
    | "task-updated"
    | "task-deleted";
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

export interface ClaimTasksRequest extends BulkClaimTasksRequest {
  /** Internal users.id UUID. Do not send Clerk authId here. */
  assignedUserId: string;
}

export interface BulkUpdateTasksResult {
  requested: number;
  updated: string[];
  failed: Array<{ taskId: string; error: string }>;
  tasks: Task[];
}

export interface BulkUpdateTasksResponse {
  success: true;
  data: BulkUpdateTasksResult;
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
 * Staff list item — matches GET /api/users entries.
 *
 * `id` is the internal users.id UUID (use this for PATCH /api/users/:userId/role
 * and DELETE /api/users/:userId). `authId` is the Clerk session id.
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

export type WorkspaceUserStatus = "active" | "inactive" | "invited" | "revoked";

/** Workspace staff row from GET /api/users. */
export interface WorkspaceUser {
  id: string;
  authId: string | null;
  role: UserRole | null;
  status: WorkspaceUserStatus;
  entityId?: string | null;
  name?: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  invitedEmail?: string | null;
  invitedAt?: string | null;
  invitedBy?: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  lastSignInAt?: string | null;
  lastActiveAt?: string | null;
  active?: boolean;
  practitioner?: PractitionerProfile | null;
  createdAt: string;
  updatedAt?: string | null;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  entity?: Entity | null;
}

export interface WorkspaceUsersResponse {
  success: boolean;
  data: {
    entityId?: string;
    users: WorkspaceUser[];
    pagination?: { limit: number; offset: number; total: number };
  };
}

export type WorkspaceInvitationStatus =
  | "pending"
  | "invited"
  | "accepted"
  | "expired"
  | "revoked";

export type WorkspaceInvitationQueryStatus = "pending" | "invited" | "revoked";

export interface WorkspaceInvitation {
  invitationId: string;
  id?: string;
  entityId?: string | null;
  email: string;
  role: UserRole;
  status: WorkspaceInvitationStatus;
  invitedBy?: string | null;
  invitedById?: string | null;
  invitedByName?: string | null;
  invitedByEmail?: string | null;
  invitedAt: string;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  clerkInvitationId?: string | null;
}

export interface WorkspaceInvitationsResponse {
  success: boolean;
  data: {
    entityId?: string;
    invitations: WorkspaceInvitation[];
    pagination?: { limit: number; offset: number; total: number };
  };
}

export interface WorkspaceBusinessAddress {
  streetNumber: string | null;
  streetName: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country?: string | null;
}

/** Entity settings MVP for workspace management. */
export interface WorkspaceEntitySettings {
  id: string;
  name: string | null;
  tenantDomain?: string | null;
  shopifyDomain?: string | null;
  emailPrefix: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  businessPhone?: string | null;
  businessEmail?: string | null;
  abn?: string | null;
  address?: WorkspaceBusinessAddress | null;
}

export interface WorkspaceEntitySettingsResponse {
  success: boolean;
  data: { settings: WorkspaceEntitySettings };
}

export interface UpdateWorkspaceEntitySettingsPayload {
  name?: string;
  isActive?: boolean;
  businessPhone?: string | null;
  businessEmail?: string | null;
  abn?: string | null;
  address?: Partial<WorkspaceBusinessAddress> | null;
}

export interface CreateWorkspaceInvitationPayload {
  email: string;
  role: UserRole;
  entityId?: string;
  redirectUrl?: string;
  notify?: boolean;
}

export interface WorkspaceInvitationResponse {
  success: boolean;
  data: {
    invitation: WorkspaceInvitation;
    clerkInvitationUrl?: string | null;
    clerkRevoked?: boolean;
    clerkRevokeError?: string | null;
  };
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
/**
 * Account lifecycle status from the backend `users` table.
 *
 * NOTE: An authenticated caller of `GET /api/users/me` will only ever observe
 * `"active"` on the 200 path — `invited` rows have no `auth_id` (unreachable),
 * and `revoked` (or any soft-deactivated) row returns 403. The full enum is
 * still useful in admin contexts (`WorkspaceUser.status`).
 */
export type UserAccountStatus = "active" | "invited" | "revoked";

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
  /** Active entity (workspace) the user belongs to. Nullable for unattached users. */
  entityId: string | null;
  /** Account lifecycle status. Source of truth lives on the backend `users` row. */
  status: UserAccountStatus;
  createdAt: string;
  updatedAt: string;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
}

export interface UserProfileResponse {
  success: boolean;
  data: { profile: UserProfile | null };
}

/**
 * Payload for PUT /api/users/me. All fields optional — omit to leave unchanged, send `null` to clear.
 * `role` and `entityId` are intentionally NOT included — those are admin-only mutations
 * (see PATCH /api/users/:userId/role and the workspace management endpoints).
 */
export interface UpdateUserProfilePayload {
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

// ============================================
// Roster types (see ROSTERS_SPEC.md §10)
// ============================================

export type ShiftKind = "available" | "busy" | "leave" | "off";

export type RosterClinic = "Surry Hills" | "Newtown" | "Telehealth";

export type RosterSpecialty =
  | "GP"
  | "Psychiatry"
  | "Dermatology"
  | "Cardiology"
  | "Paediatrics"
  | "Endocrinology";

export interface RosterConsultation {
  id: string;
  start: string; // "14:00" 24h
  end: string; // "14:30" 24h
  patientName: string;
  patientShortName: string;
  type: string;
  status: "done" | "in_progress" | "upcoming";
}

export interface Shift {
  kind: ShiftKind;
  start?: string;
  end?: string;
  booked?: number;
  capacity?: number;
  note?: string;
  consultations?: RosterConsultation[];
  /**
   * Backend may return raw availability segments in addition to the
   * collapsed `start`/`end`. Safe to ignore for v1 — UI uses the
   * collapsed window.
   */
  segments?: { start: string; end: string }[];
}

export interface RosterDoctor {
  id: string;
  name: string;
  specialty: RosterSpecialty;
  clinic: RosterClinic;
  phone?: string;
  joined?: string;
  isMe?: boolean;
  /** length 7, Mon..Sun for the displayed week */
  week: Shift[];
}

export interface RosterWeekResponse {
  doctors: RosterDoctor[];
  weekStart: string; // ISO date (Mon)
  weekEnd: string; // ISO date (Sun)
}

export interface RosterMonthDayDoctor {
  doctorId: string;
  initials: string;
  shift: Shift;
}

export interface RosterMonthDay {
  date: string; // ISO date
  inMonth: boolean;
  shifts: RosterMonthDayDoctor[];
}

export interface RosterMonthResponse {
  month: string; // "YYYY-MM"
  monthStart: string;
  monthEnd: string;
  days: RosterMonthDay[];
}

// ============================================================================
// Workflows
// ============================================================================

export type WorkflowStatus = "draft" | "active" | "disabled";

export type WorkflowTriggerKind =
  | "event"
  | "manual"
  | "schedule"
  | "webhook"
  | "workflow";

export interface WorkflowEventTrigger {
  kind: "event";
  eventType: string;
  /** Optional user-facing display name shown on the canvas node. */
  name?: string;
}

export interface WorkflowManualTrigger {
  kind: "manual";
  /** Optional user-facing display name shown on the canvas node. */
  name?: string;
}

export interface WorkflowScheduleTrigger {
  kind: "schedule";
  cron: string;
  /** Optional user-facing display name shown on the canvas node. */
  name?: string;
}

export interface WorkflowWebhookTrigger {
  kind: "webhook";
  /** Server-generated; absent on the create request. */
  token?: string;
  /** Optional user-facing display name shown on the canvas node. */
  name?: string;
}

export interface WorkflowSubflowTrigger {
  kind: "workflow";
  /** Optional user-facing display name shown on the canvas node. */
  name?: string;
}

export type WorkflowTrigger =
  | WorkflowEventTrigger
  | WorkflowManualTrigger
  | WorkflowScheduleTrigger
  | WorkflowWebhookTrigger
  | WorkflowSubflowTrigger;

export type WorkflowStepKind =
  | "send_email"
  | "send_sms"
  | "wait"
  | "branch_if"
  | "router"
  | "loop_on_items"
  | "lookup_patient"
  | "lookup_consultation"
  | "record_activity"
  | "http_call"
  | "wait_for_event"
  | "call_workflow";

/**
 * Single source of truth for branch operators. Wire `value` is what the
 * backend accepts; `label` is the human-readable form rendered in pickers;
 * `arity` decides whether a `right` operand is collected.
 */
export const BRANCH_OPS = [
  { value: "eq", label: "equals", arity: "binary" },
  { value: "neq", label: "not equals", arity: "binary" },
  { value: "gt", label: "greater than", arity: "binary" },
  { value: "lt", label: "less than", arity: "binary" },
  { value: "contains", label: "contains", arity: "binary" },
  { value: "starts_with", label: "starts with", arity: "binary" },
  { value: "ends_with", label: "ends with", arity: "binary" },
  { value: "truthy", label: "is truthy", arity: "unary" },
  { value: "falsy", label: "is falsy", arity: "unary" },
  { value: "exists", label: "exists", arity: "unary" },
  { value: "not_exists", label: "does not exist", arity: "unary" },
] as const;

export type WorkflowBranchOp = (typeof BRANCH_OPS)[number]["value"];

export const BRANCH_OP_VALUES = BRANCH_OPS.map((o) => o.value) as unknown as readonly [
  WorkflowBranchOp,
  ...WorkflowBranchOp[],
];

export const BRANCH_OP_LABELS: Record<WorkflowBranchOp, string> = Object.fromEntries(
  BRANCH_OPS.map((o) => [o.value, o.label])
) as Record<WorkflowBranchOp, string>;

/** Operators that don't take a `right` operand. */
export const UNARY_BRANCH_OPS: ReadonlySet<WorkflowBranchOp> = new Set(
  BRANCH_OPS.filter((o) => o.arity === "unary").map((o) => o.value)
);

export function isUnaryBranchOp(op: WorkflowBranchOp): boolean {
  return UNARY_BRANCH_OPS.has(op);
}

/** A single condition clause used inside router branches. */
export interface WorkflowCondition {
  left: string;
  op: WorkflowBranchOp;
  right?: string;
}

/**
 * Per-step audit capture mode.
 *
 *  - `summary` (default): backend records a redacted, ≤ 2 KB snapshot of
 *    inputs and outputs into `workflow_step_captures`.
 *  - `full`: complete payload offloaded to R2 (≤ 256 KB), summary still
 *    available inline.
 *  - `none`: timing only; no input/output captured.
 *
 * Defaults to `'summary'` when omitted. Strip on serialize when default.
 */
export type WorkflowStepCaptureMode = "summary" | "full" | "none";

/**
 * Optional per-step retry policy honoured by the workflow engine v2.
 * Omitted entirely when retries are disabled (the default = fail-fast).
 *
 * Backoff math (delay before attempt N, where N starts at 2):
 *  - `'fixed'`:       `initialDelayMs`
 *  - `'linear'`:      `initialDelayMs * (N - 1)`
 *  - `'exponential'`: `initialDelayMs * 2 ^ (N - 2)`
 *
 * The computed delay is capped at `maxDelayMs` (default 1h server-side).
 */
export interface WorkflowStepRetryPolicy {
  /** Total attempts, including the first one. Range 1–10. `1` = no retries. */
  maxAttempts: number;
  /** Base delay in ms before the second attempt. Range 100–3,600,000 (1h). */
  initialDelayMs: number;
  /** Backoff strategy. Default `'exponential'` server-side when omitted. */
  backoff?: "fixed" | "linear" | "exponential";
  /** Cap on computed delay in ms. Range 100–86,400,000 (24h). Default 1h. */
  maxDelayMs?: number;
}

interface WorkflowStepBase {
  id?: string;
  /** Optional user-facing display name shown on the canvas node. */
  name?: string;
  /**
   * Flat-encoded tree marker. When set, this step is a child of the named
   * parent step (which must be a `router` or `loop_on_items`). Steps without
   * this marker live in the top-level chain.
   */
  parentStepName?: string;
  /**
   * Index of the branch this step belongs to under its parent.
   *  - `router` parents: 0..N-1 corresponds to `branches[i]`
   *  - `loop_on_items` parents: always 0 (the loop body)
   */
  branchIndex?: number;
  /**
   * Audit capture mode for this step. Defaults to `'summary'`. Omit from
   * serialized definition when default.
   */
  capture?: WorkflowStepCaptureMode;
  /**
   * When `true`, forces `capture` to `'none'` and hides input/output in the
   * run logs UI. Use for steps handling secrets or PHI. Defaults to `false`.
   * Omit from serialized definition when default.
   */
  sensitive?: boolean;
  /**
   * Optional retry policy. When omitted the step is fail-fast. When set,
   * a failed attempt schedules a `step_retry_scheduled` audit event and
   * the run is parked as `waiting` until the cron sweeper retries.
   */
  retry?: WorkflowStepRetryPolicy;
}

/** A named branch of a router step. Each branch is a chain of child steps. */
export interface WorkflowRouterBranch {
  name: string;
  /**
   * Single condition expression. The wire format is OR-of-AND
   * `Condition[][]`; this single condition is wrapped as `[[condition]]`
   * when serialized. A branch with no condition is treated as
   * unconditionally matching — for an explicit "no branch matched" arm,
   * use the router's `fallback` instead.
   */
  condition?: WorkflowCondition;
}

export interface RouterStep extends WorkflowStepBase {
  kind: "router";
  /** Branch definitions; each child step references one by `branchIndex`. */
  branches: WorkflowRouterBranch[];
  /**
   * Optional fallback branch that runs only when no condition branch
   * matches. Its body steps live in the flat array with
   * `branchIndex = FALLBACK_BRANCH_INDEX`.
   */
  fallback?: { name?: string };
  /**
   * Whether to evaluate every branch (`all_match`) or stop at the first
   * matching branch (`first_match`). Defaults to `first_match`.
   */
  executionType?: "first_match" | "all_match";
}

/** Sentinel `branchIndex` used to mark steps that belong to the router fallback. */
export const FALLBACK_BRANCH_INDEX = -1;

export interface LoopOnItemsStep extends WorkflowStepBase {
  kind: "loop_on_items";
  /** Template expression that resolves to an array. */
  items: string;
  /**
   * Optional max iterations safeguard.
   *
   * Inside the loop body, use `{{loop.item}}` and `{{loop.index}}` — the
   * variable name is no longer configurable.
   */
  maxIterations?: number;
}

export interface SendEmailAttachment {
  url: string;
  filename?: string;
}

export interface SendEmailStep extends WorkflowStepBase {
  kind: "send_email";
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  /** Display name composed into `from` as `"Name <addr>"`. */
  fromName?: string;
  /** Up to 50 recipients. */
  cc?: string[];
  /** Up to 50 recipients. */
  bcc?: string[];
  replyTo?: string;
  /**
   * Custom `X-*` headers. Reserved names (To/From/Cc/Bcc/Reply-To/Subject/
   * Authorization/Idempotency-Key/Content-Type/MIME-Version/Message-ID/Date)
   * are rejected by the backend.
   */
  headers?: Record<string, string>;
  /** Up to 10 attachments. The provider downloads each `url` and attaches it. */
  attachments?: SendEmailAttachment[];
  idempotencyKeySuffix?: string;
  storeAs?: string;
}

export interface SendSmsStep extends WorkflowStepBase {
  kind: "send_sms";
  to: string;
  body: string;
  from?: string;
  idempotencyKeySuffix?: string;
  storeAs?: string;
}

export interface WaitStep extends WorkflowStepBase {
  kind: "wait";
  seconds: number;
}

export interface BranchIfStep extends WorkflowStepBase {
  kind: "branch_if";
  left: string;
  op: WorkflowBranchOp;
  right?: string;
  gotoIfTrue?: string;
  gotoIfFalse?: string;
}

export interface LookupPatientStep extends WorkflowStepBase {
  kind: "lookup_patient";
  patientId: string;
  storeAs: string;
}

export interface LookupConsultationStep extends WorkflowStepBase {
  kind: "lookup_consultation";
  consultationId: string;
  storeAs: string;
}

/**
 * Allowed `record_activity.type` values per the workflows backend handoff.
 * Stricter than the read-side `ActivityEventType` (which includes additional
 * activity types emitted directly by the API).
 */
export const RECORD_ACTIVITY_STEP_TYPES = [
  "consultation-scheduled",
  "consultation-completed",
  "consultation-updated",
  "note-added",
  "prescription-issued",
  "document-uploaded",
  "document-verified",
  "flag-raised",
  "flag-resolved",
  "patient-created",
  "details-updated",
  "task-created",
  "task-updated",
  "task-completed",
] as const;
export type RecordActivityStepType = (typeof RECORD_ACTIVITY_STEP_TYPES)[number];

export const RECORD_ACTIVITY_STEP_ENTITY_TYPES = [
  "consultation",
  "note",
  "prescription",
  "document",
  "task",
  "patient",
  "flag",
  "system",
] as const;
export type RecordActivityStepEntityType =
  (typeof RECORD_ACTIVITY_STEP_ENTITY_TYPES)[number];

export interface RecordActivityStep extends WorkflowStepBase {
  kind: "record_activity";
  patientId: string;
  type: RecordActivityStepType;
  entityType: RecordActivityStepEntityType;
  entityId?: string;
  title: string;
  description?: string;
}

export type HttpCallAuth =
  | { type: "none" }
  | { type: "basic"; username: string; password: string }
  | { type: "bearer"; token: string };

export interface HttpCallStep extends WorkflowStepBase {
  kind: "http_call";
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  /** Templated values appended to `url` after template resolution. */
  queryParams?: Record<string, string>;
  auth?: HttpCallAuth;
  body?: string | Record<string, unknown>;
  /** 100 … 60,000 ms. Aborts via AbortController. */
  timeoutMs?: number;
  /** Defaults to `true`. `false` sets `redirect: 'manual'`. */
  followRedirects?: boolean;
  /**
   * Defaults to `'return'` (back-compat). On non-2xx:
   *  - `'throw'` fails the run
   *  - `'return'` stores the response and continues
   */
  failureMode?: "throw" | "return";
  storeAs?: string;
  /** 1 … 65,536 (default 16,384). */
  maxResponseBytes?: number;
}

export interface WaitForEventStep extends WorkflowStepBase {
  kind: "wait_for_event";
  eventType: string;
  timeoutSeconds?: number;
}

export interface CallWorkflowStep extends WorkflowStepBase {
  kind: "call_workflow";
  workflowId: string;
  payload?: Record<string, unknown>;
  storeAs?: string;
}

export type WorkflowStep =
  | SendEmailStep
  | SendSmsStep
  | WaitStep
  | BranchIfStep
  | RouterStep
  | LoopOnItemsStep
  | LookupPatientStep
  | LookupConsultationStep
  | RecordActivityStep
  | HttpCallStep
  | WaitForEventStep
  | CallWorkflowStep;

/**
 * Sticky-note color presets for workflow canvas notes. Each maps to a
 * tinted background in the editor (see `NOTE_COLORS` in canvas-consts).
 */
export type WorkflowNoteColor =
  | "yellow"
  | "blue"
  | "green"
  | "pink"
  | "purple"
  | "gray";

/**
 * Free-floating annotation rendered on the workflow canvas. Notes are
 * non-executable — the runner ignores them entirely. Persisted alongside
 * `steps[]` inside `WorkflowDefinitionBody.notes[]` so they round-trip via
 * the existing PATCH `/workflows/:id` endpoint.
 */
export interface WorkflowNote {
  id: string;
  title?: string;
  body: string;
  /** Absolute canvas x position (xyflow flow-coords, not screen px). */
  x: number;
  /** Absolute canvas y position (xyflow flow-coords, not screen px). */
  y: number;
  width: number;
  height: number;
  color: WorkflowNoteColor;
  /** Stacking order; higher = rendered on top. */
  z: number;
}

export interface WorkflowDefinitionBody {
  version?: number;
  steps: WorkflowStep[];
  /**
   * Optional canvas annotations. Omitted when empty so older workflows and
   * minimal definitions stay clean. Backend round-trips this verbatim.
   */
  notes?: WorkflowNote[];
}

export interface Workflow {
  id: string;
  entityId: string;
  name: string;
  description: string | null;
  triggerEventType: string | null;
  triggers: WorkflowTrigger[];
  status: WorkflowStatus;
  version: number;
  definition: WorkflowDefinitionBody;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface WorkflowsListResponse {
  success: boolean;
  data: Workflow[];
}

export interface WorkflowResponse {
  success: boolean;
  data: Workflow;
}

export interface CreateWorkflowPayload {
  entityId: string;
  name: string;
  description?: string | null;
  triggerEventType?: string;
  /** Optional for `status: "draft"`; required (≥1) on activation. */
  triggers?: WorkflowTrigger[];
  status?: WorkflowStatus;
  definition: WorkflowDefinitionBody;
}

export interface WorkflowActivationIssue {
  /** Dotted JSON path, e.g. `triggers` or `definition.steps`. */
  path: string;
  message: string;
}

export interface WorkflowActivationResult {
  record: Workflow;
  issues: WorkflowActivationIssue[];
}

export interface WorkflowActivateResponse {
  success: boolean;
  data: WorkflowActivationResult;
}

export interface UpdateWorkflowPayload {
  name?: string;
  description?: string | null;
  triggers?: WorkflowTrigger[];
  status?: WorkflowStatus;
  version?: number;
  definition?: WorkflowDefinitionBody;
}

// ---- Workflow vars catalog (template autocomplete) ----

export type WorkflowVarLeafType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "array"
  | "object"
  | "record"
  | "unknown";

export type WorkflowVarSource =
  | { kind: "static" }
  | { kind: "event"; eventType: string }
  | {
      kind: "step";
      /** -1 in the global catalog; otherwise the step's position. */
      stepIndex: number;
      stepKind: string;
      stepId?: string;
      storeAs?: string;
      casing?: "snake" | "camel" | "mixed";
    }
  | { kind: "wait_for_event"; eventType: string; stepIndex: number }
  | { kind: "loop"; stepIndex: number };

export interface WorkflowVarLeaf {
  /** Dotted path the author writes inside `{{ ... }}`. */
  path: string;
  /** Pre-humanized last segment, ready to display. */
  label: string;
  type: WorkflowVarLeafType;
  optional: boolean;
  description?: string;
  enumValues?: string[];
  arrayElement?: WorkflowVarLeafType;
  /** True for record / opaque shapes — keys cannot be enumerated. */
  dynamic?: boolean;
  source: WorkflowVarSource;
}

export interface WorkflowVarsNamespaceCatalog {
  /** Top-level segment, e.g. `event`, `vars`, `events`, `loop`, `test`. */
  namespace: string;
  description?: string;
  leaves: WorkflowVarLeaf[];
}

export interface WorkflowVarsCatalog {
  leaves: WorkflowVarLeaf[];
  namespaces: WorkflowVarsNamespaceCatalog[];
}

export interface WorkflowVarsCatalogResponse {
  success: boolean;
  data: WorkflowVarsCatalog;
}

/** Body shape for `POST /workflows/vars-catalog/preview`. */
export interface WorkflowVarsCatalogPreviewPayload {
  triggers: WorkflowTrigger[];
  definition: WorkflowDefinitionBody;
}

export type WorkflowRunStatus =
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowRun {
  id: string;
  entityId: string;
  definitionId: string;
  eventId: string | null;
  status: WorkflowRunStatus;
  /** @deprecated Alias for `nextStepIndex`. Prefer `nextStepIndex`. */
  currentStep: number;
  /** Index of the step the engine WILL run next. */
  nextStepIndex: number;
  /** Snapshot of `definition.steps.length` at run start. */
  totalSteps: number;
  /** Snapshot of `definition.version` at run start. */
  definitionVersion: number;
  context: Record<string, unknown>;
  nextStepAt: string | null;
  awaitingEventType: string | null;
  lastError: string | null;
  attempts: number;
  startedAt: string;
  completedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Optimistic-concurrency counter; increments on every server-side update.
   * Read-only diagnostic — do **not** echo back to the server (no
   * client-driven CAS endpoint exists).
   */
  version?: number;
  /**
   * Attempts at the *current* step. Resets to 0 on advance. Useful for
   * debug overlays / "attempt N" badges next to the running step.
   */
  stepAttempts?: number;
}

/** Per-step projection status returned by the gateway. */
export type WorkflowRunStepStatus =
  | "pending"
  | "running"
  | "waiting"
  | "done"
  | "failed"
  | "skipped";

/**
 * Server-computed projection of a single step within a run. The gateway
 * returns one entry per definition step (in `data.steps[]`) and re-emits
 * each entry on the SSE stream as `event: step_state` whenever it changes.
 */
export interface WorkflowRunStep {
  /** 0-based index into the run's snapshotted definition. */
  stepIndex: number;
  /** Author-assigned id when present (stable React key). */
  stepId: string | null;
  /** Step kind, or `'unknown'` if the snapshot index is outside the current definition. */
  stepKind: string;
  status: WorkflowRunStepStatus;
  /** ISO-8601 UTC; set when the step entered `running`. */
  startedAt: string | null;
  /** ISO-8601 UTC; set on terminal status. */
  completedAt: string | null;
  durationMs: number | null;
  /** Count of `running` entries; always 1 today. */
  attempts: number;
  /** Populated when status === 'failed'. */
  lastError: string | null;
  /** ISO-8601 UTC; only when status === 'waiting' on a timer wait. */
  waitUntil: string | null;
  /** Only when status === 'waiting' on a wait_for_event step. */
  awaitingEventType: string | null;
  /** Step-kind-specific extras. */
  detail: Record<string, unknown> | null;
  /**
   * Resolved step input (templates interpolated, sensitive keys redacted to
   * `'***'` server-side). `null` when the step hasn't started, opted out via
   * `capture: 'none'` / `sensitive: true`, or capture failed transiently.
   * When `captureTruncated` is true the value is a
   * `{ truncated: true; originalBytes: number; preview: string }` envelope.
   */
  input: unknown | null;
  /**
   * Captured step output (e.g. `{ messageId }` for `send_email`,
   * `{ status, body }` for `http_call`, or `{ error }` for failed steps).
   * Same `null` / truncation semantics as `input`.
   */
  output: unknown | null;
  /** True when either `input` or `output` exceeded the inline 2 KB cap. */
  captureTruncated: boolean;
}

/**
 * Inline truncation envelope returned in `WorkflowRunStep.input` / `.output`
 * when the resolved payload exceeded the inline 2 KB cap. Render `preview`
 * verbatim — it is already a string, not JSON.
 */
export interface WorkflowRunStepCaptureTruncated {
  truncated: true;
  originalBytes: number;
  preview: string;
}

export interface WorkflowRunsListResponse {
  success: boolean;
  data: WorkflowRun[];
}

export type WorkflowRunEventType =
  | "run_started"
  | "step_started"
  | "step_completed"
  | "step_failed"
  | "step_retry_scheduled"
  | "wait_scheduled"
  | "wait_for_event_timed_out"
  | "run_resumed"
  | "run_completed"
  | "run_failed"
  | "run_cancelled";

export interface WorkflowRunEvent {
  id: string;
  runId: string;
  sequence: number;
  stepIndex: number | null;
  stepKind: string | null;
  eventType: WorkflowRunEventType;
  durationMs: number | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface WorkflowRunDetailResponse {
  success: boolean;
  data: {
    run: WorkflowRun;
    /** Server-computed per-step projection. Use this for the timeline. */
    steps: WorkflowRunStep[];
    /** Audit trail. Use only for the audit drawer. */
    events: WorkflowRunEvent[];
  };
}

export interface TriggerWorkflowPayload {
  entityId: string;
  eventType: string;
  idempotencyKey: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  payload?: Record<string, unknown>;
}

export interface TriggerWorkflowResponse {
  success: boolean;
  data: {
    created: boolean;
    event: Record<string, unknown> | null;
  };
}

export interface TestRunWorkflowPayload {
  /** Optional seed value bound to `event.payload` in step templates. */
  payload?: Record<string, unknown>;
}

export interface TestRunWorkflowResponse {
  success: boolean;
  data: {
    run: WorkflowRun;
  };
}

// ---- Workflow run SSE stream ----
//
// `GET /workflows/runs/{runId}/stream` emits four named SSE events:
//
//   event: run        → snapshot of the WorkflowRun (status badge updates)
//   event: step       → a WorkflowRunEvent with `occurredAt` instead of `createdAt`
//                       (audit drawer)
//   event: step_state → a WorkflowRunStep — the primary timeline channel.
//                       Re-emitted for every step on (re)connect; idempotent.
//   event: done       → terminal/paused signal, may carry `reason: "max-duration"`
//                       with a `cursor` to resume via `?afterSequence=<cursor>`
//
// Heartbeat lines (`: keep-alive`) are dropped by the parser.

/** Step event as it appears on the SSE wire (uses `occurredAt`). */
export interface WorkflowRunStreamStepPayload {
  id: string;
  runId: string;
  sequence: number;
  stepIndex: number | null;
  stepKind: string | null;
  eventType: WorkflowRunEventType;
  durationMs: number | null;
  detail: Record<string, unknown> | null;
  occurredAt: string;
}

export interface WorkflowRunStreamDonePayload {
  runId: string;
  status: WorkflowRunStatus;
  cursor: number;
  reason?: "max-duration" | string;
}

/** SSE `step_state` payload — same shape as `WorkflowRunStep`. */
export type WorkflowRunStreamStepStatePayload = WorkflowRunStep;

// ---- Workflow step captures (run logs Input/Output panes) ----

/**
 * Per-step audit capture row. One per executed step that did not opt out via
 * `capture: 'none'` or `sensitive: true`. Joined to `WorkflowRunEvent` by
 * `sequence` (matches the `step_started` event for that step).
 */
export interface WorkflowStepCapture {
  /** Joins to the `step_started` event sequence. */
  sequence: number;
  stepIndex: number;
  stepKind: string;
  captureMode: Exclude<WorkflowStepCaptureMode, "none">;
  /** Already redacted, parsed JSON. `null` when the step had no input. */
  inputSummary: unknown;
  /** Already redacted, parsed JSON. `null` when the step produced no output. */
  outputSummary: unknown;
  inputBytes: number | null;
  outputBytes: number | null;
  inputSha256: string | null;
  outputSha256: string | null;
  outcome: "ok" | "error";
  /** True when the summary was clipped at the 2 KB boundary. */
  truncated: boolean;
  occurredAt: string;
}

export interface WorkflowRunCapturesResponse {
  success: boolean;
  data: {
    captures: WorkflowStepCapture[];
  };
}

/**
 * Joined timeline row rendered by the run logs UI. Built from
 * `WorkflowRunEvent[]` + `WorkflowStepCapture[]`.
 */
export interface WorkflowRunTimelineRow {
  /** `step_started` sequence — anchor that joins to the capture row. */
  sequence: number;
  stepIndex: number;
  stepKind: string;
  status:
    | "pending"
    | "running"
    | "success"
    | "error"
    | "waiting"
    | "retrying"
    | "timed_out";
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  capture: WorkflowStepCapture | null;
  /**
   * Populated when `status === 'retrying'`. Detail copied from the
   * `step_retry_scheduled` audit event so the timeline can render
   * "Retrying in Ns (attempt M of N)" without re-walking the event list.
   */
  retry?: {
    attempt: number;
    nextAttempt: number;
    maxAttempts: number;
    delayMs: number;
    nextStepAt: string | null;
  };
  /** Populated when `status === 'timed_out'`. Source: `wait_for_event_timed_out.detail.eventType`. */
  awaitingEventType?: string | null;
}
