import type {
  ParchmentPrescription,
  ParchmentPrescriptionsResponse,
  PatientPrescriptionsApiResponse,
  Prescription,
  PrescriptionMedication,
  PrescriptionMedicationApi,
} from "@/types";

function parseOptionalNumber(value: string | number | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeStatus(status: string | undefined): ParchmentPrescription["status"] {
  if (status === "expired" || status === "pending") return status;
  return "active";
}

function getMedicationName(medication: PrescriptionMedicationApi): string {
  return (
    medication.itemName ??
    medication.name ??
    medication.product ??
    medication.medicationName ??
    "Prescription item"
  );
}

function normalizeMedication(
  medication: PrescriptionMedicationApi,
  fallbackId: string
): PrescriptionMedication {
  return {
    id: medication.id ?? medication.pbsCode ?? fallbackId,
    name: getMedicationName(medication),
    dosage: medication.dosage ?? medication.strength ?? medication.pbsCode,
    quantity: parseOptionalNumber(medication.quantity),
    repeats: parseOptionalNumber(medication.repeatsAuthorised ?? medication.repeats),
    schedule: medication.repeatIntervals,
    pbsCode: medication.pbsCode,
    notes: medication.notes,
  };
}

function getPrescriptionMedications(
  prescription: Prescription,
  prescriptionId: string
): PrescriptionMedication[] {
  const sourceMedications = prescription.medications?.length
    ? prescription.medications
    : prescription.items?.length
      ? prescription.items
      : [prescription];

  return sourceMedications.map((medication, index) =>
    normalizeMedication(medication, `${prescriptionId}-${index}`)
  );
}

function normalizePrescription(
  prescription: Prescription,
  patientId: string,
  prescriberName?: string,
  index?: number
): ParchmentPrescription {
  const prescriptionId =
    prescription.id ??
    prescription.scid ??
    prescription.url ??
    `${patientId}-${index ?? 0}`;
  const issuedAt =
    prescription.issuedAt ??
    prescription.createdDate ??
    prescription.createdAt ??
    new Date().toISOString();
  const medications = getPrescriptionMedications(prescription, prescriptionId);
  const primaryMedication = medications[0];

  return {
    id: prescriptionId,
    patientId,
    prescriberId: "parchment",
    prescriberName: prescription.prescriberName ?? prescriberName,
    product: prescription.type ?? primaryMedication?.name ?? "Prescription",
    dosage:
      primaryMedication?.dosage ??
      primaryMedication?.schedule ??
      prescription.pbsCode ??
      prescription.repeatIntervals ??
      "—",
    quantity: parseOptionalNumber(prescription.quantity),
    repeats: parseOptionalNumber(prescription.repeatsAuthorised),
    issuedAt,
    expiresAt: prescription.expiresAt ?? issuedAt,
    status: normalizeStatus(prescription.status),
    notes: prescription.repeatIntervals,
    medications,
  };
}

export function emptyParchmentPrescriptionsResponse(
  patientId: string
): ParchmentPrescriptionsResponse {
  return {
    success: true,
    data: {
      patientId,
      prescriptions: [],
      pagination: { limit: 50, offset: 0, total: 0 },
    },
  };
}

export function normalizePatientPrescriptionsResponse(
  payload: PatientPrescriptionsApiResponse,
  patientId: string
): ParchmentPrescriptionsResponse {
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
  };
}
