import type {
  ParchmentPrescription,
  ParchmentPrescriptionsResponse,
  PatientPrescriptionsApiResponse,
  Prescription,
} from "@/types";
import { useQuery } from "@tanstack/react-query";

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeStatus(status: string | undefined): ParchmentPrescription["status"] {
  if (status === "expired" || status === "pending") return status;
  return "active";
}

function normalizePrescription(
  prescription: Prescription,
  patientId: string,
  prescriberName?: string,
  index?: number
): ParchmentPrescription {
  const issuedAt = prescription.createdDate ?? new Date().toISOString();
  return {
    id: prescription.scid ?? prescription.url ?? `${patientId}-${index ?? 0}`,
    patientId,
    prescriberId: "parchment",
    prescriberName,
    product: prescription.itemName ?? "Prescription",
    dosage: prescription.pbsCode ?? prescription.repeatIntervals ?? "—",
    quantity: parseOptionalNumber(prescription.quantity),
    repeats: parseOptionalNumber(prescription.repeatsAuthorised),
    issuedAt,
    expiresAt: issuedAt,
    status: normalizeStatus(prescription.status),
    notes: prescription.repeatIntervals,
  };
}

async function fetchPrescriptions(patientId: string) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/prescriptions`
  );
  if (res.status === 404) {
    return {
      success: true,
      data: {
        patientId,
        prescriptions: [],
        pagination: { limit: 50, offset: 0, total: 0 },
      },
    } as ParchmentPrescriptionsResponse;
  }
  if (!res.ok) throw new Error("Failed to fetch prescriptions");
  const payload = (await res.json()) as PatientPrescriptionsApiResponse;
  const prescriberName = [
    payload.data.prescriber?.firstName,
    payload.data.prescriber?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    success: payload.success,
    data: {
      patientId,
      prescriptions: payload.data.prescriptions.map((prescription, index) =>
        normalizePrescription(
          prescription,
          patientId,
          prescriberName || undefined,
          index
        )
      ),
      pagination: {
        limit: payload.data.pagination?.limit ?? 50,
        offset: 0,
        total: payload.data.pagination?.count ?? payload.data.prescriptions.length,
      },
    },
  } as ParchmentPrescriptionsResponse;
}

export function usePrescriptions(patientId: string | undefined) {
  return useQuery({
    queryKey: ["prescriptions", patientId],
    queryFn: () => fetchPrescriptions(patientId!),
    enabled: !!patientId,
  });
}
