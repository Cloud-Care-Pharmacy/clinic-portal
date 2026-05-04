"use client";

import { useMemo, useState } from "react";
import { Building2, MailPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const REQUIRED_ENDPOINTS = [
  "GET /api/staff or GET /api/users?entityId=...",
  "PATCH /api/staff/:userId/role",
  "PATCH /api/staff/:userId",
  "POST /api/staff/invitations",
  "GET /api/staff/invitations?status=pending",
  "POST /api/staff/invitations/:invitationId/resend",
  "DELETE or PATCH revoke for /api/staff/invitations/:invitationId",
  "GET /api/entities/:entityId/settings",
  "PUT /api/entities/:entityId/settings",
];

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
  const usersUnavailable = unavailableMessage(usersQuery.error, "GET /api/staff");
  const invitationsUnavailable = unavailableMessage(
    invitationsQuery.error,
    "GET /api/staff/invitations?status=pending"
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
        description="Manage workspace users, pending invitations, and entity settings. Backend-only workflows are marked separately until endpoints are available."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <MailPlus className="mr-2 size-4" />
            Invite user
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Backend handoff</CardTitle>
          <CardDescription>
            These items are intentionally not mocked in the browser. The workspace UI
            only enables persistence after the prescription-gateway exposes these
            endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {REQUIRED_ENDPOINTS.map((endpoint) => (
              <div
                key={endpoint}
                className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground"
              >
                {endpoint}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
          />
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <WorkspaceInvitationsTable
            invitations={invitations}
            loading={invitationsQuery.isLoading || invitationsQuery.isFetching}
            unavailableMessage={invitationsUnavailable}
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
        backendUnavailable={inviteBackendUnavailable}
      />
    </div>
  );
}
