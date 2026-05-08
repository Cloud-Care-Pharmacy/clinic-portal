"use client";

import { useMemo, useState } from "react";
import { Building2, MailPlus, Users } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { InviteUserSheet } from "@/components/workspace/InviteUserSheet";
import { WorkspaceUsersTable } from "@/components/workspace/WorkspaceUsersTable";
import { WorkspaceInvitationsTable } from "@/components/workspace/WorkspaceInvitationsTable";
import { EntitySettingsForm } from "@/components/workspace/EntitySettingsForm";
import {
  useWorkspaceEntitySettings,
  useWorkspaceInvitations,
  useWorkspaceUsers,
  WorkspaceApiError,
} from "@/lib/hooks/use-workspace";
import type {
  Entity,
  WorkspaceEntitySettings,
  WorkspaceEntitySettingsResponse,
  WorkspaceInvitationsResponse,
  WorkspaceUsersResponse,
} from "@/types";

interface WorkspaceClientProps {
  entityId: string;
  initialEntity?: { success: boolean; data: Entity };
  initialUsers?: WorkspaceUsersResponse;
  initialInvitations?: WorkspaceInvitationsResponse;
  initialSettings?: WorkspaceEntitySettingsResponse;
}

function entityToSettings(entity?: Entity): WorkspaceEntitySettings | null {
  if (!entity) return null;
  return {
    ...entity,
    businessPhone: null,
    businessEmail: null,
    abn: null,
    address: null,
  };
}

function unavailableMessage(error: unknown, endpoint: string) {
  if (!error) return undefined;
  const message =
    error instanceof WorkspaceApiError || error instanceof Error
      ? error.message
      : "Workspace backend endpoint is unavailable.";
  return `${message} Needed endpoint: ${endpoint}`;
}

export function WorkspaceClient({
  entityId,
  initialEntity,
  initialUsers,
  initialInvitations,
  initialSettings,
}: WorkspaceClientProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const usersQuery = useWorkspaceUsers(entityId || undefined, initialUsers);
  const invitationsQuery = useWorkspaceInvitations(
    entityId || undefined,
    initialInvitations
  );
  const settingsQuery = useWorkspaceEntitySettings(
    entityId || undefined,
    initialSettings
  );

  const fallbackSettings = useMemo(
    () => entityToSettings(initialEntity?.data),
    [initialEntity]
  );
  const settings = settingsQuery.data?.data.settings ?? fallbackSettings;
  const users = usersQuery.data?.data.users ?? [];
  const invitations = invitationsQuery.data?.data.invitations ?? [];
  const usersUnavailable = unavailableMessage(usersQuery.error, "GET /api/users");
  const invitationsUnavailable = unavailableMessage(
    invitationsQuery.error,
    "GET /api/users/invitations?status=pending"
  );
  const settingsUnavailable = unavailableMessage(
    settingsQuery.error,
    "GET /api/entities/:entityId/settings"
  );
  const inviteBackendUnavailable = Boolean(invitationsQuery.error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace management"
        description="Manage workspace users, pending invitations, and entity settings for this portal."
      />

      <Tabs defaultValue="users" className="space-y-4">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="size-4" />
              Users <span className="count">{users.length}</span>
            </TabsTrigger>
            <TabsTrigger value="invites">
              <MailPlus className="size-4" />
              Pending invites <span className="count">{invitations.length}</span>
            </TabsTrigger>
            <TabsTrigger value="entity">
              <Building2 className="size-4" />
              Entity settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-4">
          <WorkspaceUsersTable
            users={users}
            loading={usersQuery.isLoading || usersQuery.isFetching}
            unavailableMessage={usersUnavailable}
            onInvite={() => setInviteOpen(true)}
          />
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <WorkspaceInvitationsTable
            invitations={invitations}
            users={users}
            loading={invitationsQuery.isLoading || invitationsQuery.isFetching}
            unavailableMessage={invitationsUnavailable}
            onInvite={() => setInviteOpen(true)}
          />
        </TabsContent>

        <TabsContent value="entity" className="space-y-4">
          <EntitySettingsForm
            entityId={entityId}
            settings={settings}
            backendUnavailable={Boolean(settingsUnavailable) || !settingsQuery.data}
          />
          {settingsUnavailable ? (
            <Card>
              <CardHeader>
                <CardTitle>Entity settings backend pending</CardTitle>
                <CardDescription>{settingsUnavailable}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      <InviteUserSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        entityId={entityId || undefined}
        backendUnavailable={inviteBackendUnavailable}
      />
    </div>
  );
}
