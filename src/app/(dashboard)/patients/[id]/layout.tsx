import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import {
  emptyParchmentPrescriptionsResponse,
  normalizePatientPrescriptionsResponse,
} from "@/lib/prescriptions";
import PatientLayoutClient from "./PatientLayoutClient";

async function hydratePatientShell(queryClient: QueryClient, patientId: string) {
  const [patient, latestClinical, counts, prescriptions, consultations] =
    await Promise.allSettled([
      api.getPatient(patientId),
      api.getLatestClinicalData(patientId),
      api.getPatientCounts(patientId),
      api.getPatientPrescriptions(patientId),
      api.getPatientConsultations(patientId, { limit: 50 }),
    ]);

  if (patient.status === "fulfilled") {
    queryClient.setQueryData(["patient", patientId], patient.value);
  }

  if (latestClinical.status === "fulfilled") {
    queryClient.setQueryData(["clinical-data-latest", patientId], latestClinical.value);
  }

  if (counts.status === "fulfilled") {
    queryClient.setQueryData(["patient-counts", patientId], counts.value);
  }

  if (prescriptions.status === "fulfilled") {
    queryClient.setQueryData(
      ["prescriptions", patientId],
      normalizePatientPrescriptionsResponse(prescriptions.value, patientId)
    );
  } else if (
    prescriptions.reason instanceof ApiError &&
    prescriptions.reason.status === 404
  ) {
    queryClient.setQueryData(
      ["prescriptions", patientId],
      emptyParchmentPrescriptionsResponse(patientId)
    );
  }

  if (consultations.status === "fulfilled") {
    queryClient.setQueryData(["consultations", patientId], consultations.value);
  }
}

export default async function PatientDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const queryClient = new QueryClient();

  await hydratePatientShell(queryClient, id);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PatientLayoutClient id={id}>{children}</PatientLayoutClient>
    </HydrationBoundary>
  );
}
