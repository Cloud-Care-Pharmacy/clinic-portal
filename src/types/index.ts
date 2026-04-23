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

export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: string;
  completedAt?: string;
  type: "initial" | "follow-up" | "renewal";
  notes?: string;
  outcome?: string;
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
// Session types
// ============================================

export type UserRole = "admin" | "doctor" | "staff";

export interface UserSession {
  name: string;
  email: string;
  image?: string;
  role: UserRole;
}
