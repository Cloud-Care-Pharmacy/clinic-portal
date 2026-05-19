"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  IntegrationProvider,
  TestWorkspaceIntegrationPayload,
  UpsertWorkspaceIntegrationPayload,
  WorkspaceIntegrationResponse,
  WorkspaceIntegrationSyncResponse,
  WorkspaceIntegrationTestResponse,
  WorkspaceIntegrationsResponse,
} from "@/types";
import { WorkspaceApiError } from "@/lib/hooks/use-workspace";

const INTEGRATIONS_UNAVAILABLE =
  "Workspace integrations endpoint is unavailable.";

async function integrationsErrorPayload(
  res: Response,
  fallback: string
): Promise<WorkspaceApiError> {
  const payload = (await res.json().catch(() => undefined)) as
    | {
        error?:
          | string
          | {
              code?: string;
              message?: string;
              details?: unknown;
              fieldErrors?: Record<string, string[]>;
            };
        details?: string;
        code?: string;
      }
    | undefined;

  if (payload && typeof payload.error === "object" && payload.error !== null) {
    const err = payload.error;
    const details = err.fieldErrors ?? err.details;
    return new WorkspaceApiError(
      err.message ?? fallback,
      res.status,
      err.code,
      details
    );
  }

  const message =
    payload?.details ??
    (typeof payload?.error === "string" ? payload.error : undefined) ??
    (res.status === 404 || res.status === 501
      ? INTEGRATIONS_UNAVAILABLE
      : fallback);

  return new WorkspaceApiError(message, res.status, payload?.code);
}

async function assertOk(res: Response, fallback: string) {
  if (res.ok) return;
  throw await integrationsErrorPayload(res, fallback);
}

function basePath(entityId: string) {
  return `/api/proxy/entities/${encodeURIComponent(entityId)}/integrations`;
}

async function fetchIntegrations(
  entityId: string
): Promise<WorkspaceIntegrationsResponse> {
  const res = await fetch(basePath(entityId));
  await assertOk(res, "Failed to fetch integrations");
  return res.json();
}

interface UpsertVariables {
  entityId: string;
  provider: IntegrationProvider;
  data: UpsertWorkspaceIntegrationPayload;
}

async function upsertIntegration({
  entityId,
  provider,
  data,
}: UpsertVariables): Promise<WorkspaceIntegrationResponse> {
  const res = await fetch(
    `${basePath(entityId)}/${encodeURIComponent(provider)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  await assertOk(res, "Failed to save integration");
  return res.json();
}

interface DeleteVariables {
  entityId: string;
  provider: IntegrationProvider;
}

async function deleteIntegration({
  entityId,
  provider,
}: DeleteVariables): Promise<{ success: true }> {
  const res = await fetch(
    `${basePath(entityId)}/${encodeURIComponent(provider)}`,
    { method: "DELETE" }
  );
  await assertOk(res, "Failed to disconnect integration");
  return res.json();
}

interface TestVariables {
  entityId: string;
  provider: IntegrationProvider;
  data: TestWorkspaceIntegrationPayload;
}

async function testIntegration({
  entityId,
  provider,
  data,
}: TestVariables): Promise<WorkspaceIntegrationTestResponse> {
  const res = await fetch(
    `${basePath(entityId)}/${encodeURIComponent(provider)}/test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  await assertOk(res, "Failed to test integration");
  return res.json();
}

interface SyncVariables {
  entityId: string;
  provider: IntegrationProvider;
}

async function triggerSync({
  entityId,
  provider,
}: SyncVariables): Promise<WorkspaceIntegrationSyncResponse> {
  const res = await fetch(
    `${basePath(entityId)}/${encodeURIComponent(provider)}/sync`,
    { method: "POST" }
  );
  await assertOk(res, "Failed to trigger sync");
  return res.json();
}

export function useWorkspaceIntegrations(
  entityId: string | undefined,
  initialData?: WorkspaceIntegrationsResponse
) {
  return useQuery({
    queryKey: ["workspace-integrations", entityId ?? ""],
    queryFn: () => fetchIntegrations(entityId!),
    enabled: Boolean(entityId),
    initialData,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (entityId: string) =>
    queryClient.invalidateQueries({
      queryKey: ["workspace-integrations", entityId],
    });
}

export function useUpsertWorkspaceIntegration() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: upsertIntegration,
    onSuccess: (_data, variables) => invalidate(variables.entityId),
  });
}

export function useDeleteWorkspaceIntegration() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: deleteIntegration,
    onSuccess: (_data, variables) => invalidate(variables.entityId),
  });
}

export function useTestWorkspaceIntegration() {
  return useMutation({ mutationFn: testIntegration });
}

export function useTriggerWorkspaceIntegrationSync() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: (_data, variables) => invalidate(variables.entityId),
  });
}
