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

/** Patient mapping from D1 */
export interface PatientMapping {
  id: string;
  entity_id: string | null;
  generated_email: string;
  original_email: string;
  halaxy_patient_id: string | null;
  created_at: string;
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
// Session types
// ============================================

export type UserRole = "admin" | "doctor" | "staff";

export interface UserSession {
  name: string;
  email: string;
  image?: string;
  role: UserRole;
}
