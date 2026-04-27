import type {
  ConsultationsListResponse,
  LatestClinicalDataResponse,
  ListPrescriptionsResponse,
  PatientCountsResponse,
  PatientMapping,
  TasksListResponse,
} from "@/types";

export interface PatientShellInitialData {
  patient?: { success: boolean; data: { patient: PatientMapping } };
  latestClinical?: LatestClinicalDataResponse;
  counts?: PatientCountsResponse;
  prescriptions?: ListPrescriptionsResponse;
  consultations?: ConsultationsListResponse;
  tasks?: TasksListResponse;
}
