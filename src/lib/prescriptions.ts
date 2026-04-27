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
      sync: null,
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
