import type {
  PatientMapping,
  Entity,
  EmailRecord,
  EmailMetadata,
  ParchmentPrescriptionsResponse,
  SubmissionResult,
  IntakeFormData,
  UpdatePatientPayload,
  ClinicalDataRecord,
  ClinicalDataListResponse,
  LatestClinicalDataResponse,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const API_SECRET = process.env.API_SECRET ?? "";

class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(res.status, body.error ?? "Request failed", body.details);
    }

    return res.json() as Promise<T>;
  }

  // ---- Entities ----

  async getEntities(): Promise<{ success: boolean; data: Entity[] }> {
    return this.request("/api/entities");
  }

  async getEntity(
    entityId: string
  ): Promise<{ success: boolean; data: Entity }> {
    return this.request(`/api/entities/${encodeURIComponent(entityId)}`);
  }

  // ---- Patients ----

  async getPatient(
    patientId: string
  ): Promise<{ success: boolean; data: { patient: PatientMapping } }> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}`
    );
  }

  async updatePatient(
    patientId: string,
    data: UpdatePatientPayload
  ): Promise<{ success: boolean; data: { patient: PatientMapping } }> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  async getPatients(
    entityId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<{
    success: boolean;
    data: {
      entityId: string;
      patients: PatientMapping[];
      pagination: { limit: number; offset: number; total: number };
    };
  }> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(
      `/api/entities/${encodeURIComponent(entityId)}/patients${qs}`
    );
  }

  // ---- Clinical Data ----

  async getClinicalData(
    patientId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<ClinicalDataListResponse> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/clinical-data${qs}`
    );
  }

  async getLatestClinicalData(
    patientId: string
  ): Promise<LatestClinicalDataResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/clinical-data/latest`
    );
  }

  // ---- Intake Submission ----

  async submitIntake(
    data: IntakeFormData
  ): Promise<{ success: boolean; patientId: string; email: string }> {
    return this.request<SubmissionResult>("/api/test/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ---- Prescriptions ----

  async getPatientPrescriptions(
    patientId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<ParchmentPrescriptionsResponse> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(
      `/api/parchment/patients/${encodeURIComponent(patientId)}/prescriptions${qs}`
    );
  }

  // ---- Patient Emails ----

  async getPatientEmails(
    patientId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<{
    success: boolean;
    data: {
      patientId: string;
      emails: EmailRecord[];
      pagination: { limit: number; offset: number; total: number };
    };
  }> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/emails${qs}`
    );
  }

  async getEmailDetail(
    patientId: string,
    emailId: string
  ): Promise<{
    success: boolean;
    data: { email: EmailRecord; metadata: EmailMetadata };
  }> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/emails/${encodeURIComponent(emailId)}`
    );
  }

  getAttachmentUrl(
    patientId: string,
    emailId: string,
    filename: string
  ): string {
    return `${this.baseUrl}/api/patients/${encodeURIComponent(patientId)}/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(filename)}`;
  }

  // ---- Validate ----

  async validateParchment(): Promise<{ success: boolean }> {
    return this.request("/api/parchment/validate");
  }
}

export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const api = new ApiClient(API_URL, API_SECRET);
