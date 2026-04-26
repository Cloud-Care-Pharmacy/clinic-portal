import { api, ApiError } from "@/lib/api";
import {
  emptyParchmentPrescriptionsResponse,
  normalizePatientPrescriptionsResponse,
} from "@/lib/prescriptions";
import { OverviewTab } from "./components/tabs/OverviewTab";

export default async function PatientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [consultations, prescriptions, notes, latestClinical] =
    await Promise.allSettled([
      api.getPatientConsultations(id, { limit: 50, offset: 0 }),
      api.getPatientPrescriptions(id),
      api.getPatientNotes(id),
      api.getLatestClinicalData(id),
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
    />
  );
}
