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
}

// ============================================
// Parchment Prescription types
// ============================================

export interface PrescriptionMedicationApi {
  id?: string;
  itemName?: string;
  name?: string;
  product?: string;
  medicationName?: string;
  dosage?: string;
  strength?: string;
  quantity?: string | number;
  repeatsAuthorised?: string | number;
  repeats?: string | number;
  repeatIntervals?: string;
  pbsCode?: string;
  notes?: string;
}

export interface Prescription extends PrescriptionMedicationApi {
  id?: string;
  type?: string;
  url?: string;
  scid?: string;
  status?: string;
  createdDate?: string;
  createdAt?: string;
  issuedAt?: string;
  expiresAt?: string;
  prescriberName?: string;
  medications?: PrescriptionMedicationApi[];
  items?: PrescriptionMedicationApi[];
}

export interface PrescriptionMedication {
  id: string;
  name: string;
  dosage?: string;
  quantity?: number;
  repeats?: number;
  schedule?: string;
  pbsCode?: string;
  notes?: string;
}

export interface PatientPrescriptionsApiResponse {
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

export interface ParchmentPrescription {
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

export interface ParchmentPrescriptionsResponse {
  success: boolean;
  data: {
    patientId: string;
    prescriptions: ParchmentPrescription[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  };
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

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "staff";
  avatarUrl?: string;
  createdAt: string;
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
  | "notes"
  | "prescriptions"
  | "documents"
  | "system";

export type ActivityEntityType =
  | "consultation"
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
// User Profile types (from prescription-gateway users table)
// ============================================

/** User profile record — matches GET /api/users/me response */
export interface UserProfile {
  id: string;
  hpii: string | null;
  prescriberNumber: string | null;
  qualifications: string | null;
  phone: string | null;
  role: UserRole;
  availabilityDays: string[] | null;
  // Prescriber details (doctor-only)
  title: string | null;
  specialty: string | null;
  ahpraNumber: string | null;
  hospitalProviderNumber: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  providerNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  // Business address
  businessStreetNumber: string | null;
  businessStreetName: string | null;
  businessSuburb: string | null;
  businessState: string | null;
  businessPostcode: string | null;
  createdAt: string;
  updatedAt: string;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
}

export interface UserProfileResponse {
  success: boolean;
  data: { profile: UserProfile | null };
}

/** Payload for PUT /api/users/me (camelCase for request body) */
export interface UpdateUserProfilePayload {
  role?: UserRole;
  phone?: string;
  hpii?: string;
  prescriberNumber?: string;
  qualifications?: string;
  availabilityDays?: string[];
  // Prescriber details (doctor-only)
  title?: string;
  specialty?: string;
  ahpraNumber?: string;
  hospitalProviderNumber?: string;
  businessPhone?: string;
  businessEmail?: string;
  providerNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  // Business address
  businessStreetNumber?: string;
  businessStreetName?: string;
  businessSuburb?: string;
  businessState?: string;
  businessPostcode?: string;
}

export type AvailabilityDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface AvailabilityWindow {
  start: string;
  end: string;
}

export type StructuredAvailability = Record<AvailabilityDayKey, AvailabilityWindow[]>;

export interface UpdateUserAvailabilityPayload {
  timezone: string;
  availability: StructuredAvailability;
}

export interface UserAvailabilityResponse {
  success: boolean;
  data: {
    availability: {
      userId: string;
      timezone: string;
      availability: Partial<StructuredAvailability>;
      createdAt: string;
      updatedAt: string;
    };
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
