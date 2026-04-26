import type { QueryClient } from "@tanstack/react-query";
import { consultationsQueryOptions } from "@/lib/hooks/use-consultations";
import { patientDocumentsQueryOptions } from "@/lib/hooks/use-documents";
import { patientNotesQueryOptions } from "@/lib/hooks/use-notes";
import { patientActivityQueryOptions } from "@/lib/hooks/use-patient-activity";
import {
  clinicalDataQueryOptions,
  latestClinicalDataQueryOptions,
} from "@/lib/hooks/use-patients";
import { prescriptionsQueryOptions } from "@/lib/hooks/use-prescriptions";

export type PatientTabSegment =
  | ""
  | "consultations"
  | "prescriptions"
  | "documents"
  | "clinical"
  | "notes"
  | "activity";

const PATIENT_TAB_SEGMENTS: PatientTabSegment[] = [
  "",
  "consultations",
  "prescriptions",
  "documents",
  "clinical",
  "notes",
  "activity",
];

const IDLE_PREFETCH_SEGMENTS: PatientTabSegment[] = ["notes"];

function prefetchAll(tasks: Promise<unknown>[]) {
  return Promise.allSettled(tasks).then(() => undefined);
}

export function isPatientTabSegment(value: string): value is PatientTabSegment {
  return PATIENT_TAB_SEGMENTS.includes(value as PatientTabSegment);
}

export function prefetchPatientTab(
  queryClient: QueryClient,
  patientId: string,
  tab: PatientTabSegment
) {
  if (!patientId) return Promise.resolve();

  switch (tab) {
    case "":
      return prefetchAll([
        queryClient.prefetchQuery(consultationsQueryOptions(patientId)),
        queryClient.prefetchQuery(prescriptionsQueryOptions(patientId)),
        queryClient.prefetchQuery(patientNotesQueryOptions(patientId)),
        queryClient.prefetchQuery(latestClinicalDataQueryOptions(patientId)),
      ]);
    case "consultations":
      return queryClient.prefetchQuery(consultationsQueryOptions(patientId));
    case "prescriptions":
      return queryClient.prefetchQuery(prescriptionsQueryOptions(patientId));
    case "documents":
      return queryClient.prefetchQuery(patientDocumentsQueryOptions(patientId));
    case "clinical":
      return prefetchAll([
        queryClient.prefetchQuery(clinicalDataQueryOptions(patientId)),
        queryClient.prefetchQuery(latestClinicalDataQueryOptions(patientId)),
      ]);
    case "notes":
      return queryClient.prefetchQuery(patientNotesQueryOptions(patientId));
    case "activity":
      return queryClient.prefetchQuery(patientActivityQueryOptions(patientId));
  }
}

export function prefetchLikelyPatientTabs(
  queryClient: QueryClient,
  patientId: string,
  activeTab: PatientTabSegment
) {
  return Promise.allSettled(
    IDLE_PREFETCH_SEGMENTS.filter((tab) => tab !== activeTab).map((tab) =>
      prefetchPatientTab(queryClient, patientId, tab)
    )
  ).then(() => undefined);
}

export function canIdlePrefetchPatientTabs() {
  if (typeof navigator === "undefined") return false;

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
}
