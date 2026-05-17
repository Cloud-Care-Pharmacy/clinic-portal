import { normalizeWorkflow } from "@/lib/workflows-normalize";
import type {
  PatientMapping,
  PatientsListResponse,
  Entity,
  EmailRecord,
  EmailMetadata,
  GetPrescriptionResponse,
  ListPrescriptionsResponse,
  SyncPrescriptionsResponse,
  SubmissionResult,
  IntakeFormData,
  UpdatePatientPayload,
  ClinicalDataListResponse,
  LatestClinicalDataResponse,
  ClinicalDataApprovalResponse,
  PatientDocumentsListResponse,
  PatientDocumentResponse,
  EntityDocumentsListResponse,
  PatientCountsResponse,
  ConsultationsListResponse,
  ConsultationsQuery,
  DocumentUpdatePayload,
  DocumentVerifyPayload,
  DocumentSyncResponse,
  DocumentCategory,
  DocumentStatus,
  DocumentSource,
  PatientNotesResponse,
  PatientActivityResponse,
  UserProfileResponse,
  PatientsListQuery,
  PatientSearchResponse,
  DashboardPeriod,
  DashboardIntakeRange,
  DashboardIntakeBucket,
  DashboardSummaryResponse,
  DashboardIntakeOverviewResponse,
  DashboardRecentActivityResponse,
  ActivityEventCategory,
  PractitionerProfileResponse,
  PractitionerAvailabilityResponse,
  UpdatePractitionerPayload,
  UpdatePractitionerAvailabilityPayload,
  CreateTaskPayload,
  TaskResponse,
  TasksListResponse,
  TasksQuery,
  TaskSummaryResponse,
  UpdateTaskPayload,
  CreateWorkspaceInvitationPayload,
  UpdateWorkspaceEntitySettingsPayload,
  WorkspaceEntitySettingsResponse,
  WorkspaceInvitationQueryStatus,
  WorkspaceInvitationResponse,
  WorkspaceInvitationsResponse,
  WorkspaceUsersResponse,
  UserRole,
  RosterWeekResponse,
  RosterMonthResponse,
  WorkflowsListResponse,
  WorkflowResponse,
  WorkflowStatus,
  WorkflowRunsListResponse,
  WorkflowRunDetailResponse,
} from "@/types";
import { normalizeApiPayload, toBackendPatientSort } from "@/lib/api-normalize";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const API_SECRET = process.env.API_SECRET ?? "";

function appendTaskQueryParams(params: URLSearchParams, opts?: TasksQuery) {
  const appendValue = (key: string, value?: string | string[]) => {
    if (!value) return;
    params.set(key, Array.isArray(value) ? value.join(",") : value);
  };

  appendValue("status", opts?.status);
  appendValue("priority", opts?.priority);
  appendValue("taskType", opts?.taskType);
  appendValue("assignedRole", opts?.assignedRole);
  if (opts?.patientId) params.set("patientId", opts.patientId);
  if (opts?.assignedUserId) params.set("assignedUserId", opts.assignedUserId);
  if (opts?.dueBefore) params.set("dueBefore", opts.dueBefore);
  if (opts?.createdAfter) params.set("createdAfter", opts.createdAfter);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.order) params.set("order", opts.order);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
}

function clerkUserHeader(clerkUserId?: string) {
  return clerkUserId ? { "X-Clerk-User-Id": clerkUserId } : undefined;
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

    const payload = await res.json();
    return normalizeApiPayload<T>(payload, path);
  }

  // ---- Entities ----

  async getEntities(): Promise<{ success: boolean; data: Entity[] }> {
    return this.request("/api/entities");
  }

  async getEntity(entityId: string): Promise<{ success: boolean; data: Entity }> {
    return this.request(`/api/entities/${encodeURIComponent(entityId)}`);
  }

  // ---- Patients ----

  async getPatient(
    patientId: string
  ): Promise<{ success: boolean; data: { patient: PatientMapping } }> {
    return this.request(`/api/patients/${encodeURIComponent(patientId)}`);
  }

  async updatePatient(
    patientId: string,
    data: UpdatePatientPayload
  ): Promise<{ success: boolean; data: { patient: PatientMapping } }> {
    return this.request(`/api/patients/${encodeURIComponent(patientId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getPatients(
    entityId: string,
    opts?: PatientsListQuery
  ): Promise<PatientsListResponse> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    if (opts?.search) params.set("search", opts.search);
    if (opts?.pmsStatus) params.set("pmsStatus", opts.pmsStatus);
    const backendSort = toBackendPatientSort(opts?.sort);
    if (backendSort) params.set("sort", backendSort);
    if (opts?.order) params.set("order", opts.order);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/entities/${encodeURIComponent(entityId)}/patients${qs}`);
  }

  async searchPatients(
    entityId: string,
    opts?: { q?: string; limit?: number }
  ): Promise<PatientSearchResponse> {
    const params = new URLSearchParams({ entityId });
    if (opts?.q) params.set("q", opts.q);
    if (opts?.limit) params.set("limit", String(opts.limit));
    return this.request(`/api/patients/search?${params.toString()}`);
  }

  async getPatientCounts(patientId: string): Promise<PatientCountsResponse> {
    return this.request(`/api/patients/${encodeURIComponent(patientId)}/counts`);
  }

  async getPatientConsultations(
    patientId: string,
    opts?: Omit<ConsultationsQuery, "patientId">
  ): Promise<ConsultationsListResponse> {
    const params = new URLSearchParams();
    if (opts?.status) params.set("status", opts.status);
    if (opts?.type) params.set("type", opts.type);
    if (opts?.doctorId) params.set("doctorId", opts.doctorId);
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    if (opts?.search) params.set("search", opts.search);
    if (opts?.sort) params.set("sort", opts.sort);
    if (opts?.order) params.set("order", opts.order);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/consultations${qs}`
    );
  }

  // ---- Rosters ----

  async getRosterWeek(
    weekStartISO: string
  ): Promise<{ success: boolean; data: RosterWeekResponse }> {
    return this.request(`/api/rosters/week?start=${encodeURIComponent(weekStartISO)}`);
  }

  async getRosterMonth(
    monthISO: string
  ): Promise<{ success: boolean; data: RosterMonthResponse }> {
    return this.request(`/api/rosters/month?month=${encodeURIComponent(monthISO)}`);
  }

  async getConsultations(
    opts?: ConsultationsQuery
  ): Promise<ConsultationsListResponse> {
    const params = new URLSearchParams();
    if (opts?.status) params.set("status", opts.status);
    if (opts?.type) params.set("type", opts.type);
    if (opts?.patientId) params.set("patientId", opts.patientId);
    if (opts?.doctorId) params.set("doctorId", opts.doctorId);
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    if (opts?.search) params.set("search", opts.search);
    if (opts?.sort) params.set("sort", opts.sort);
    if (opts?.order) params.set("order", opts.order);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/consultations${qs}`);
  }

  async getPatientNotes(patientId: string): Promise<PatientNotesResponse> {
    return this.request(`/api/patients/${encodeURIComponent(patientId)}/notes`);
  }

  async getPatientActivity(
    patientId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<PatientActivityResponse> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request<PatientActivityResponse>(
      `/api/patients/${encodeURIComponent(patientId)}/activity${qs}`
    );
  }

  // ---- Patient Tasks ----

  async getTasks(opts?: TasksQuery): Promise<TasksListResponse> {
    const params = new URLSearchParams();
    appendTaskQueryParams(params, opts);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/tasks${qs}`);
  }

  async getPatientTasks(
    patientId: string,
    opts?: Omit<TasksQuery, "patientId">
  ): Promise<TasksListResponse> {
    const params = new URLSearchParams();
    appendTaskQueryParams(params, opts);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/patients/${encodeURIComponent(patientId)}/tasks${qs}`);
  }

  async getTask(taskId: string): Promise<TaskResponse> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}`);
  }

  async createTask(data: CreateTaskPayload): Promise<TaskResponse> {
    return this.request("/api/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(
    taskId: string,
    data: UpdateTaskPayload,
    opts?: { actorUserId?: string }
  ): Promise<TaskResponse> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: opts?.actorUserId ? { "X-Clerk-User-Id": opts.actorUserId } : undefined,
      body: JSON.stringify(data),
    });
  }

  async completeTask(taskId: string, data?: { note?: string }): Promise<TaskResponse> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", note: data?.note }),
    });
  }

  async getTaskSummary(): Promise<TaskSummaryResponse> {
    return this.request("/api/tasks/summary");
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

  async getLatestClinicalData(patientId: string): Promise<LatestClinicalDataResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/clinical-data/latest`
    );
  }

  async approveClinicalData(
    patientId: string,
    recordId: string,
    data: { reviewNotes?: string },
    userId?: string
  ): Promise<ClinicalDataApprovalResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/clinical-data/${encodeURIComponent(recordId)}/approve`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: userId ? { "X-Clerk-User-Id": userId } : undefined,
      }
    );
  }

  // ---- Intake Submission ----

  async submitIntake(data: IntakeFormData): Promise<SubmissionResult> {
    return this.request<SubmissionResult>("/api/intake/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ---- Dashboard ----

  async getDashboardSummary(
    entityId: string,
    period: DashboardPeriod = "30d"
  ): Promise<DashboardSummaryResponse> {
    const params = new URLSearchParams({ entityId, period });
    return this.request(`/api/dashboard/summary?${params.toString()}`);
  }

  async getDashboardIntakeOverview(opts?: {
    entityId?: string;
    range?: DashboardIntakeRange;
    from?: string;
    to?: string;
    bucket?: DashboardIntakeBucket;
  }): Promise<DashboardIntakeOverviewResponse> {
    const params = new URLSearchParams();
    if (opts?.entityId) params.set("entityId", opts.entityId);
    if (opts?.range) params.set("range", opts.range);
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    if (opts?.bucket) params.set("bucket", opts.bucket);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/dashboard/intake-overview${qs}`);
  }

  async getDashboardRecentActivity(opts: {
    entityId: string;
    limit?: number;
    category?: ActivityEventCategory;
  }): Promise<DashboardRecentActivityResponse> {
    const params = new URLSearchParams({ entityId: opts.entityId });
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.category) params.set("category", opts.category);
    return this.request(`/api/dashboard/recent-activity?${params.toString()}`);
  }

  // ---- Prescriptions ----

  async getPatientPrescriptions(
    patientId: string,
    opts?: { status?: string; limit?: number; offset?: number; refresh?: boolean }
  ): Promise<ListPrescriptionsResponse> {
    const params = new URLSearchParams();
    if (opts?.status) params.set("status", opts.status);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    if (opts?.refresh) params.set("refresh", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/prescriptions${qs}`
    );
  }

  async getPatientPrescription(
    patientId: string,
    prescriptionId: string
  ): Promise<GetPrescriptionResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/prescriptions/${encodeURIComponent(prescriptionId)}`
    );
  }

  async syncPatientPrescriptions(
    patientId: string
  ): Promise<SyncPrescriptionsResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/prescriptions/sync`,
      { method: "POST" }
    );
  }

  // ---- User Profile (account) ----

  async getMyProfile(userId: string): Promise<UserProfileResponse> {
    return this.request("/api/users/me", {
      headers: { "X-Clerk-User-Id": userId },
    });
  }

  // ---- Workspace Management ----

  async getWorkspaceUsers(opts?: {
    clerkUserId?: string;
    entityId?: string;
    role?: UserRole;
    status?: "pending" | "active" | "invited" | "revoked";
    includeDeactivated?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<WorkspaceUsersResponse> {
    const params = new URLSearchParams();
    if (opts?.entityId) params.set("entityId", opts.entityId);
    if (opts?.role) params.set("role", opts.role);
    if (opts?.status) params.set("status", opts.status);
    if (opts?.includeDeactivated) params.set("includeDeactivated", "true");
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    if (opts?.search) params.set("search", opts.search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/users${qs}`, {
      headers: clerkUserHeader(opts?.clerkUserId),
    });
  }

  async updateWorkspaceUserRole(
    userId: string,
    role: UserRole,
    clerkUserId?: string
  ): Promise<unknown> {
    return this.request(`/api/users/${encodeURIComponent(userId)}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
      headers: clerkUserHeader(clerkUserId),
    });
  }

  async updateWorkspaceUser(
    userId: string,
    data: Partial<{
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      email: string | null;
    }>,
    clerkUserId?: string
  ): Promise<unknown> {
    return this.request(`/api/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: clerkUserHeader(clerkUserId),
    });
  }

  async createWorkspaceInvitation(
    data: CreateWorkspaceInvitationPayload,
    clerkUserId?: string
  ): Promise<WorkspaceInvitationResponse> {
    return this.request("/api/users/invitations", {
      method: "POST",
      body: JSON.stringify(data),
      headers: clerkUserHeader(clerkUserId),
    });
  }

  async getWorkspaceInvitations(opts?: {
    clerkUserId?: string;
    entityId?: string;
    status?: WorkspaceInvitationQueryStatus;
    limit?: number;
    offset?: number;
  }): Promise<WorkspaceInvitationsResponse> {
    const params = new URLSearchParams();
    if (opts?.entityId) params.set("entityId", opts.entityId);
    if (opts?.status) params.set("status", opts.status);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/users/invitations${qs}`, {
      headers: clerkUserHeader(opts?.clerkUserId),
    });
  }

  async resendWorkspaceInvitation(
    invitationId: string,
    clerkUserId?: string
  ): Promise<WorkspaceInvitationResponse> {
    return this.request(
      `/api/users/invitations/${encodeURIComponent(invitationId)}/resend`,
      { method: "POST", headers: clerkUserHeader(clerkUserId) }
    );
  }

  async revokeWorkspaceInvitation(
    invitationId: string,
    clerkUserId?: string
  ): Promise<WorkspaceInvitationResponse> {
    return this.request(`/api/users/invitations/${encodeURIComponent(invitationId)}`, {
      method: "DELETE",
      headers: clerkUserHeader(clerkUserId),
    });
  }

  async deactivateWorkspaceUser(
    userId: string,
    opts?: { restore?: boolean; clerkUserId?: string }
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (opts?.restore) params.set("restore", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/users/${encodeURIComponent(userId)}${qs}`, {
      method: "DELETE",
      headers: clerkUserHeader(opts?.clerkUserId),
    });
  }

  async getWorkspaceEntitySettings(
    entityId: string,
    clerkUserId?: string
  ): Promise<WorkspaceEntitySettingsResponse> {
    return this.request(`/api/entities/${encodeURIComponent(entityId)}/settings`, {
      headers: clerkUserHeader(clerkUserId),
    });
  }

  async updateWorkspaceEntitySettings(
    entityId: string,
    data: UpdateWorkspaceEntitySettingsPayload,
    clerkUserId?: string
  ): Promise<WorkspaceEntitySettingsResponse> {
    return this.request(`/api/entities/${encodeURIComponent(entityId)}/settings`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: clerkUserHeader(clerkUserId),
    });
  }

  // ---- Practitioner Profile ----

  async getMyPractitioner(userId: string): Promise<PractitionerProfileResponse> {
    return this.request("/api/practitioners/me", {
      headers: { "X-Clerk-User-Id": userId },
    });
  }

  async updateMyPractitioner(
    userId: string,
    data: UpdatePractitionerPayload
  ): Promise<PractitionerProfileResponse> {
    return this.request("/api/practitioners/me", {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { "X-Clerk-User-Id": userId },
    });
  }

  async getMyPractitionerAvailability(
    userId: string
  ): Promise<PractitionerAvailabilityResponse> {
    return this.request("/api/practitioners/me/availability", {
      headers: { "X-Clerk-User-Id": userId },
    });
  }

  async updateMyPractitionerAvailability(
    userId: string,
    data: UpdatePractitionerAvailabilityPayload
  ): Promise<PractitionerAvailabilityResponse> {
    return this.request("/api/practitioners/me/availability", {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { "X-Clerk-User-Id": userId },
    });
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
    return this.request(`/api/patients/${encodeURIComponent(patientId)}/emails${qs}`);
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

  getAttachmentUrl(patientId: string, emailId: string, filename: string): string {
    return `${this.baseUrl}/api/patients/${encodeURIComponent(patientId)}/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(filename)}`;
  }

  // ---- Validate ----

  async validateParchment(): Promise<{ success: boolean }> {
    return this.request("/api/parchment/validate");
  }

  // ---- Patient Documents ----

  async getPatientDocuments(
    patientId: string,
    opts?: {
      category?: DocumentCategory;
      status?: DocumentStatus;
      source?: DocumentSource;
      limit?: number;
      offset?: number;
      sort?: "createdAt" | "filename" | "category";
      order?: "asc" | "desc";
    }
  ): Promise<PatientDocumentsListResponse> {
    const params = new URLSearchParams();
    if (opts?.category) params.set("category", opts.category);
    if (opts?.status) params.set("status", opts.status);
    if (opts?.source) params.set("source", opts.source);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    if (opts?.sort) params.set("sort", opts.sort);
    if (opts?.order) params.set("order", opts.order);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/documents${qs}`
    );
  }

  async getEntityDocuments(
    entityId: string,
    opts?: {
      patientSearch?: string;
      category?: DocumentCategory;
      status?: DocumentStatus;
      source?: DocumentSource;
      limit?: number;
      offset?: number;
      sort?: string;
      order?: "asc" | "desc";
    }
  ): Promise<EntityDocumentsListResponse> {
    const params = new URLSearchParams();
    if (opts?.patientSearch) params.set("patientSearch", opts.patientSearch);
    if (opts?.category) params.set("category", opts.category);
    if (opts?.status) params.set("status", opts.status);
    if (opts?.source) params.set("source", opts.source);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    if (opts?.sort) params.set("sort", opts.sort);
    if (opts?.order) params.set("order", opts.order);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/entities/${encodeURIComponent(entityId)}/documents${qs}`);
  }

  async getDocument(
    patientId: string,
    documentId: string
  ): Promise<PatientDocumentResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`
    );
  }

  async updateDocument(
    patientId: string,
    documentId: string,
    data: DocumentUpdatePayload
  ): Promise<PatientDocumentResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  }

  async verifyDocument(
    patientId: string,
    documentId: string,
    data: DocumentVerifyPayload
  ): Promise<PatientDocumentResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/verify`,
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  async deleteDocument(
    patientId: string,
    documentId: string
  ): Promise<{ success: boolean; data: { deleted: boolean } }> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
      { method: "DELETE" }
    );
  }

  async syncEmailAttachments(patientId: string): Promise<DocumentSyncResponse> {
    return this.request(
      `/api/patients/${encodeURIComponent(patientId)}/documents/sync-email-attachments`,
      { method: "POST" }
    );
  }

  getDocumentDownloadUrl(patientId: string, documentId: string): string {
    return `${this.baseUrl}/api/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/download`;
  }

  // ---- Workflows ----

  async listWorkflows(opts?: {
    entityId?: string;
    status?: WorkflowStatus;
    triggerEventType?: string;
    limit?: number;
  }): Promise<WorkflowsListResponse> {
    const params = new URLSearchParams();
    if (opts?.entityId) params.set("entityId", opts.entityId);
    if (opts?.status) params.set("status", opts.status);
    if (opts?.triggerEventType) params.set("triggerEventType", opts.triggerEventType);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const body = await this.request<WorkflowsListResponse>(`/workflows${qs}`);
    return { ...body, data: (body.data ?? []).map(normalizeWorkflow) };
  }

  async getWorkflow(workflowId: string): Promise<WorkflowResponse> {
    const body = await this.request<WorkflowResponse>(
      `/workflows/${encodeURIComponent(workflowId)}`
    );
    return { ...body, data: normalizeWorkflow(body.data) };
  }

  async listWorkflowRuns(
    workflowId: string,
    opts?: { limit?: number }
  ): Promise<WorkflowRunsListResponse> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/workflows/${encodeURIComponent(workflowId)}/runs${qs}`);
  }

  async getWorkflowRun(
    runId: string,
    opts?: { includeEvents?: boolean; eventLimit?: number }
  ): Promise<WorkflowRunDetailResponse> {
    const params = new URLSearchParams();
    if (opts?.includeEvents === false) params.set("includeEvents", "false");
    if (opts?.eventLimit) params.set("eventLimit", String(opts.eventLimit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/workflows/runs/${encodeURIComponent(runId)}${qs}`);
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
