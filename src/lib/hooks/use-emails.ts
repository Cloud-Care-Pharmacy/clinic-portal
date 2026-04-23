import type { EmailRecord, EmailMetadata } from "@/types";
import { useQuery } from "@tanstack/react-query";

async function fetchEmails(patientId: string, limit = 50, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/emails?${params}`
  );
  if (!res.ok) throw new Error("Failed to fetch emails");
  return res.json() as Promise<{
    success: boolean;
    data: {
      patientId: string;
      emails: EmailRecord[];
      pagination: { limit: number; offset: number; total: number };
    };
  }>;
}

async function fetchEmailDetail(patientId: string, emailId: string) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/emails/${encodeURIComponent(emailId)}`
  );
  if (!res.ok) throw new Error("Failed to fetch email detail");
  return res.json() as Promise<{
    success: boolean;
    data: { email: EmailRecord; metadata: EmailMetadata };
  }>;
}

export function usePatientEmails(
  patientId: string | undefined,
  opts?: { limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ["patient-emails", patientId, opts?.limit, opts?.offset],
    queryFn: () => fetchEmails(patientId!, opts?.limit, opts?.offset),
    enabled: !!patientId,
  });
}

export function useEmailDetail(
  patientId: string | undefined,
  emailId: string | undefined
) {
  return useQuery({
    queryKey: ["email-detail", patientId, emailId],
    queryFn: () => fetchEmailDetail(patientId!, emailId!),
    enabled: !!patientId && !!emailId,
  });
}
