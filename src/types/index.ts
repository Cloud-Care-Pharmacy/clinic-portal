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

/** Entity (Shopify shop) from D1 */
export interface Entity {
  id: string;
  shopify_domain: string;
  name: string | null;
  email_prefix: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/** Patient mapping from D1 — matches GET /api/patients/:id response */
export interface PatientMapping {
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

/** Email record from D1 */
export interface EmailRecord {
  id: string;
  patient_id: string | null;
  from_address: string | null;
  subject: string | null;
  message_id: string | null;
  attachment_count: number;
  received_at: string;
  status: "received" | "processed" | "failed";
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
  email: string;
}

// ============================================
// Parchment Prescription types
// ============================================

export interface Prescription {
  type?: string;
  url?: string;
  scid?: string;
  status?: string;
  createdDate?: string;
  itemName?: string;
  quantity?: string;
  repeatsAuthorised?: string;
  repeatIntervals?: string;
  pbsCode?: string;
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

export interface PatientDocumentsListResponse {
  success: boolean;
  data: {
    patientId: string;
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
  expiry_date?: string;
  uploaded_by?: string;
}

export interface DocumentUpdatePayload {
  category?: DocumentCategory;
  description?: string;
  expiry_date?: string | null;
}

export interface DocumentVerifyPayload {
  action: "verify" | "reject";
  verified_by?: string;
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
// Patient Notes types (mock backend — swap to real endpoint later)
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

/** User profile record — matches GET /api/users/me response (snake_case from D1) */
export interface UserProfile {
  id: string;
  hpii: string | null;
  prescriber_number: string | null;
  qualifications: string | null;
  phone: string | null;
  role: UserRole;
  availability_days: string[] | null;
  // Prescriber details (doctor-only)
  title: string | null;
  specialty: string | null;
  ahpra_number: string | null;
  hospital_provider_number: string | null;
  business_phone: string | null;
  business_email: string | null;
  provider_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  // Business address
  business_street_number: string | null;
  business_street_name: string | null;
  business_suburb: string | null;
  business_state: string | null;
  business_postcode: string | null;
  created_at: string;
  updated_at: string;
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
