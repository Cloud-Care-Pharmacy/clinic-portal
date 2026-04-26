import { useQuery } from "@tanstack/react-query";
import type {
  ActivityEntityType,
  ActivityEventCategory,
  PatientActivityResponse,
} from "@/types";

function categoryForEntity(entityType: ActivityEntityType): ActivityEventCategory {
  if (entityType === "consultation") return "consultations";
  if (entityType === "note") return "notes";
  if (entityType === "prescription") return "prescriptions";
  if (entityType === "document") return "documents";
  return "system";
}

async function fetchPatientActivity(
  patientId: string,
  limit = 50,
  offset = 0
): Promise<PatientActivityResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/activity?${params}`
  );
  if (!res.ok) throw new Error("Failed to fetch patient activity");
  const payload = (await res.json()) as PatientActivityResponse;

  return {
    ...payload,
    data: {
      ...payload.data,
      events: payload.data.events.map((event) => ({
        ...event,
        category: event.category ?? categoryForEntity(event.entityType),
      })),
    },
  };
}

export function usePatientActivity(patientId: string | undefined) {
  const query = useQuery({
    queryKey: ["patient-activity", patientId],
    queryFn: () => fetchPatientActivity(patientId!),
    enabled: Boolean(patientId),
  });

  return {
    data: query.data,
    events: query.data?.data?.events ?? [],
    isLoading: query.isLoading,
    errors: query.error ? [query.error] : [],
  };
}
