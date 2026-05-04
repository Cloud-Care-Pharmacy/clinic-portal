import { redirect } from "next/navigation";
import { WorkspaceClient } from "./WorkspaceClient";
import { api } from "@/lib/api";
import { getEntityId, requireAuth } from "@/lib/auth";

export default async function WorkspacePage() {
  const { role } = await requireAuth();
  if (role !== "admin") redirect("/dashboard");

  const entityId = await getEntityId();
  const [initialEntity, initialUsers, initialInvitations, initialSettings] =
    await Promise.all([
      entityId ? api.getEntity(entityId).catch(() => undefined) : undefined,
      api
        .getWorkspaceUsers({ entityId: entityId || undefined, limit: 100, offset: 0 })
        .catch(() => undefined),
      api
        .getWorkspaceInvitations({
          entityId: entityId || undefined,
          status: "pending",
          limit: 100,
          offset: 0,
        })
        .catch(() => undefined),
      entityId
        ? api.getWorkspaceEntitySettings(entityId).catch(() => undefined)
        : undefined,
    ]);

  return (
    <WorkspaceClient
      entityId={entityId}
      initialEntity={initialEntity}
      initialUsers={initialUsers}
      initialInvitations={initialInvitations}
      initialSettings={initialSettings}
    />
  );
}
