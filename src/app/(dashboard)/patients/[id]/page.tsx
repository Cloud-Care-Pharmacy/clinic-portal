import { ApiError } from "@/lib/api";
import {
  emptyParchmentPrescriptionsResponse,
  normalizePatientPrescriptionsResponse,
} from "@/lib/prescriptions";
import { OverviewTab } from "./components/tabs/OverviewTab";
import {
  getLatestClinicalData,
  getPatientConsultations,
  getPatientNotes,
  getPatientPrescriptions,
  getPatientTasks,
} from "./server-fetchers";

export default async function PatientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [consultations, prescriptions, notes, latestClinical, tasks] =
    await Promise.allSettled([
      getPatientConsultations(id, 50),
      getPatientPrescriptions(id),
      getPatientNotes(id),
      getLatestClinicalData(id),
      getPatientTasks(id, 5),
    ]);

  const initialPrescriptions =
    prescriptions.status === "fulfilled"
      ? normalizePatientPrescriptionsResponse(prescriptions.value, id)
      : prescriptions.reason instanceof ApiError && prescriptions.reason.status === 404
        ? emptyParchmentPrescriptionsResponse(id)
        : undefined;

  return (
    <OverviewTab
      patientId={id}
      initialConsultations={
        consultations.status === "fulfilled" ? consultations.value : undefined
      }
      initialPrescriptions={initialPrescriptions}
      initialNotes={notes.status === "fulfilled" ? notes.value : undefined}
      initialLatestClinical={
        latestClinical.status === "fulfilled" ? latestClinical.value : undefined
      }
      initialTasks={tasks.status === "fulfilled" ? tasks.value : undefined}
    />
  );
}
