import { api, ApiError } from "@/lib/api";
import {
  emptyParchmentPrescriptionsResponse,
  normalizePatientPrescriptionsResponse,
} from "@/lib/prescriptions";
import PatientLayoutClient from "./PatientLayoutClient";
import type { PatientShellInitialData } from "./patient-shell-data";

async function getPatientShellInitialData(
  patientId: string
): Promise<PatientShellInitialData> {
  const [patient, latestClinical, counts, prescriptions, consultations] =
    await Promise.allSettled([
      api.getPatient(patientId),
      api.getLatestClinicalData(patientId),
      api.getPatientCounts(patientId),
      api.getPatientPrescriptions(patientId),
      api.getPatientConsultations(patientId, { limit: 50 }),
    ]);
  const initialData: PatientShellInitialData = {};

  if (patient.status === "fulfilled") {
    initialData.patient = patient.value;
  }

  if (latestClinical.status === "fulfilled") {
    initialData.latestClinical = latestClinical.value;
  }

  if (counts.status === "fulfilled") {
    initialData.counts = counts.value;
  }

  if (prescriptions.status === "fulfilled") {
    initialData.prescriptions = normalizePatientPrescriptionsResponse(
      prescriptions.value,
      patientId
    );
  } else if (
    prescriptions.reason instanceof ApiError &&
    prescriptions.reason.status === 404
  ) {
    initialData.prescriptions = emptyParchmentPrescriptionsResponse(patientId);
  }

  if (consultations.status === "fulfilled") {
    initialData.consultations = consultations.value;
  }

  return initialData;
}

export default async function PatientDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const initialData = await getPatientShellInitialData(id);

  return (
    <PatientLayoutClient id={id} initialData={initialData}>
      {children}
    </PatientLayoutClient>
  );
}
