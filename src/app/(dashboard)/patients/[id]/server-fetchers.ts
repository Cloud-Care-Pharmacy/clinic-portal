import { cache } from "react";
import { api } from "@/lib/api";

/**
 * Per-request memoized server fetchers for patient detail.
 *
 * The patient detail layout and child tab pages can both request the same
 * resources during a single navigation. Wrapping with `react.cache` dedupes
 * those calls so each backend round-trip only happens once per request.
 */

export const getPatient = cache((patientId: string) => api.getPatient(patientId));

export const getLatestClinicalData = cache((patientId: string) =>
  api.getLatestClinicalData(patientId)
);

export const getPatientCounts = cache((patientId: string) =>
  api.getPatientCounts(patientId)
);

export const getPatientPrescriptions = cache((patientId: string) =>
  api.getPatientPrescriptions(patientId)
);

export const getPatientConsultations = cache(
  (patientId: string, limit = 50, offset = 0) =>
    api.getPatientConsultations(patientId, { limit, offset })
);

export const getPatientNotes = cache((patientId: string) =>
  api.getPatientNotes(patientId)
);

export const getClinicalData = cache((patientId: string, limit = 50, offset = 0) =>
  api.getClinicalData(patientId, { limit, offset })
);

export const getPatientDocuments = cache((patientId: string) =>
  api.getPatientDocuments(patientId)
);

export const getPatientActivity = cache((patientId: string, limit = 50, offset = 0) =>
  api.getPatientActivity(patientId, { limit, offset })
);

export const getPatientTasks = cache((patientId: string, limit = 50, offset = 0) =>
  api.getPatientTasks(patientId, {
    limit,
    offset,
    status: ["open", "in_progress"],
    sort: "dueAt",
    order: "asc",
  })
);
