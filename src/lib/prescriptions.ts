import type { ListPrescriptionsResponse, PatientPrescription } from "@/types";

export function emptyListPrescriptionsResponse(
  patientId: string
): ListPrescriptionsResponse {
  return {
    success: true,
    data: {
      patientId,
      prescriptions: [],
      pagination: { limit: 50, offset: 0, total: 0 },
    },
  };
}

export function formatPrescriptionReference(
  prescription: Pick<PatientPrescription, "id">
): string {
  return `RX-${prescription.id.slice(-6).toUpperCase()}`;
}

export function formatPrescriptionDate(value: string): string {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * The clinical-decision gate lives on `consultations.outcome`. When a doctor
 * marks a consultation as rejected, the outcome is stored as the literal
 * string "reject" (case-insensitive). The backend uses the same check to
 * return 422 from the create-internal-prescription endpoint.
 */
export const CLINICAL_DECISION_REJECT = "reject";

export function isConsultationClinicallyRejected(
  outcome: string | null | undefined
): boolean {
  return (outcome ?? "").trim().toLowerCase() === CLINICAL_DECISION_REJECT;
}
