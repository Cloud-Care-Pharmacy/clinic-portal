"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateWorkspaceInvitationPayload,
  UpdateWorkspaceEntitySettingsPayload,
  WorkspaceEntitySettingsResponse,
  WorkspaceInvitationsResponse,
  WorkspaceInvitationStatus,
  WorkspaceUsersResponse,
} from "@/types";

const WORKSPACE_API_UNAVAILABLE =
  "Workspace management is waiting on backend endpoints.";

export class WorkspaceApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "WorkspaceApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function workspaceErrorPayload(
  res: Response,
  fallback: string
): Promise<WorkspaceApiError> {
  const payload = (await res.json().catch(() => undefined)) as
    | {
        error?: string | { code?: string; message?: string; details?: unknown };
        details?: string;
        code?: string;
      }
    | undefined;

  if (payload && typeof payload.error === "object" && payload.error !== null) {
    return new WorkspaceApiError(
      payload.error.message ?? fallback,
      res.status,
      payload.error.code,
      payload.error.details
    );
  }

  const message =
    payload?.details ??
    (typeof payload?.error === "string" ? payload.error : undefined) ??
    (res.status === 404 || res.status === 501 ? WORKSPACE_API_UNAVAILABLE : fallback);

  return new WorkspaceApiError(message, res.status, payload?.code);
}

async function assertWorkspaceResponse(res: Response, fallback: string) {
  if (res.ok) return;
  throw await workspaceErrorPayload(res, fallback);
}

function appendWorkspaceParams(
  params: URLSearchParams,
  opts?: { entityId?: string; limit?: number; offset?: number }
) {
  if (opts?.entityId) params.set("entityId", opts.entityId);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
}

async function fetchWorkspaceUsers(opts?: {
  entityId?: string;
  limit?: number;
  offset?: number;
}): Promise<WorkspaceUsersResponse> {
  const params = new URLSearchParams();
  appendWorkspaceParams(params, opts);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/proxy/staff${qs}`);
  await assertWorkspaceResponse(res, "Failed to fetch workspace users");
  return res.json();
}

async function fetchWorkspaceInvitations(opts?: {
  entityId?: string;
  status?: WorkspaceInvitationStatus;
  limit?: number;
  offset?: number;
}): Promise<WorkspaceInvitationsResponse> {
  const params = new URLSearchParams();
  appendWorkspaceParams(params, opts);
  if (opts?.status) params.set("status", opts.status);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/proxy/staff/invitations${qs}`);
  await assertWorkspaceResponse(res, "Failed to fetch workspace invitations");
  return res.json();
}

async function createWorkspaceInvitation(
  data: CreateWorkspaceInvitationPayload
): Promise<WorkspaceInvitationsResponse> {
  const res = await fetch("/api/proxy/staff/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await assertWorkspaceResponse(res, "Failed to invite user");
  return res.json();
}

async function resendWorkspaceInvitation(
  invitationId: string
): Promise<WorkspaceInvitationsResponse> {
  const res = await fetch(
    `/api/proxy/staff/invitations/${encodeURIComponent(invitationId)}/resend`,
    { method: "POST" }
  );
  await assertWorkspaceResponse(res, "Failed to resend invitation");
  return res.json();
}

async function revokeWorkspaceInvitation(
  invitationId: string
): Promise<WorkspaceInvitationsResponse> {
  const res = await fetch(
    `/api/proxy/staff/invitations/${encodeURIComponent(invitationId)}`,
    { method: "DELETE" }
  );
  await assertWorkspaceResponse(res, "Failed to revoke invitation");
  return res.json();
}

async function fetchWorkspaceEntitySettings(
  entityId: string
): Promise<WorkspaceEntitySettingsResponse> {
  const res = await fetch(
    `/api/proxy/entities/${encodeURIComponent(entityId)}/settings`
  );
  await assertWorkspaceResponse(res, "Failed to fetch entity settings");
  return res.json();
}

async function updateWorkspaceEntitySettings({
  entityId,
  data,
}: {
  entityId: string;
  data: UpdateWorkspaceEntitySettingsPayload;
}): Promise<WorkspaceEntitySettingsResponse> {
  const res = await fetch(
    `/api/proxy/entities/${encodeURIComponent(entityId)}/settings`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  await assertWorkspaceResponse(res, "Failed to update entity settings");
  return res.json();
}

export function useWorkspaceUsers(
  entityId?: string,
  initialData?: WorkspaceUsersResponse
) {
  return useQuery({
    queryKey: ["workspace-users", entityId ?? ""],
    queryFn: () => fetchWorkspaceUsers({ entityId, limit: 100, offset: 0 }),
    initialData,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useWorkspaceInvitations(
  entityId?: string,
  initialData?: WorkspaceInvitationsResponse
) {
  return useQuery({
    queryKey: ["workspace-invitations", entityId ?? "", "pending"],
    queryFn: () =>
      fetchWorkspaceInvitations({ entityId, status: "pending", limit: 100, offset: 0 }),
    initialData,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useWorkspaceEntitySettings(
  entityId: string | undefined,
  initialData?: WorkspaceEntitySettingsResponse
) {
  return useQuery({
    queryKey: ["workspace-entity-settings", entityId ?? ""],
    queryFn: () => fetchWorkspaceEntitySettings(entityId!),
    enabled: Boolean(entityId),
    initialData,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useCreateWorkspaceInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkspaceInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-users"] });
    },
  });
}

export function useResendWorkspaceInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resendWorkspaceInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] });
    },
  });
}

export function useRevokeWorkspaceInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeWorkspaceInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] });
    },
  });
}

export function useUpdateWorkspaceEntitySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWorkspaceEntitySettings,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-entity-settings", variables.entityId],
      });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}
