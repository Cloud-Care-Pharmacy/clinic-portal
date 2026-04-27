import { ApiError } from "@/lib/api";
import { emptyListPrescriptionsResponse } from "@/lib/prescriptions";
import { notFound } from "next/navigation";
import PatientLayoutClient from "./PatientLayoutClient";
import type { PatientShellInitialData } from "./patient-shell-data";
import {
  getLatestClinicalData,
  getPatient,
  getPatientConsultations,
  getPatientCounts,
  getPatientPrescriptions,
  getPatientTasks,
} from "./server-fetchers";

async function getPatientShellInitialData(
  patientId: string
): Promise<PatientShellInitialData> {
  const [patient, latestClinical, counts, prescriptions, consultations, tasks] =
    await Promise.allSettled([
      getPatient(patientId),
      getLatestClinicalData(patientId),
      getPatientCounts(patientId),
      getPatientPrescriptions(patientId),
      getPatientConsultations(patientId, 50),
      getPatientTasks(patientId, 5),
    ]);
  const initialData: PatientShellInitialData = {};

  if (patient.status === "fulfilled") {
    initialData.patient = patient.value;
  } else if (patient.reason instanceof ApiError && patient.reason.status === 404) {
    notFound();
  } else {
    throw patient.reason;
  }

  if (latestClinical.status === "fulfilled") {
    initialData.latestClinical = latestClinical.value;
  }

  if (counts.status === "fulfilled") {
    initialData.counts = counts.value;
  }

  if (prescriptions.status === "fulfilled") {
    initialData.prescriptions = prescriptions.value;
  } else if (
    prescriptions.reason instanceof ApiError &&
    prescriptions.reason.status === 404
  ) {
    initialData.prescriptions = emptyListPrescriptionsResponse(patientId);
  }

  if (consultations.status === "fulfilled") {
    initialData.consultations = consultations.value;
  }

  if (tasks.status === "fulfilled") {
    initialData.tasks = tasks.value;
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
