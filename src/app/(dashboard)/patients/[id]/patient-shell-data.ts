import type {
  ConsultationsListResponse,
  LatestClinicalDataResponse,
  ParchmentPrescriptionsResponse,
  PatientCountsResponse,
  PatientMapping,
} from "@/types";

export interface PatientShellInitialData {
  patient?: { success: boolean; data: { patient: PatientMapping } };
  latestClinical?: LatestClinicalDataResponse;
  counts?: PatientCountsResponse;
  prescriptions?: ParchmentPrescriptionsResponse;
  consultations?: ConsultationsListResponse;
}
