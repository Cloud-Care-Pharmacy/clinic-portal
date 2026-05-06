"use client";

import { useMemo, useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { MailPlus, MoreHorizontal, RotateCcw, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { dataGridSx } from "@/lib/datagrid-theme";
import {
  useResendWorkspaceInvitation,
  useRevokeWorkspaceInvitation,
} from "@/lib/hooks/use-workspace";
import { matchesSearchQuery } from "@/lib/table-search";
import type {
  UserRole,
  WorkspaceInvitation,
  WorkspaceInvitationStatus,
  WorkspaceUser,
} from "@/types";
import {
  formatWorkspaceDate,
  getWorkspaceInvitationId,
  WORKSPACE_INVITATION_STATUS_LABELS,
  WORKSPACE_INVITATION_STATUS_VARIANTS,
  WORKSPACE_ROLE_LABELS,
  WORKSPACE_ROLE_VARIANTS,
} from "@/components/workspace/workspace-format";

const ROLE_OPTIONS: UserRole[] = ["admin", "doctor", "staff"];
const STATUS_OPTIONS: WorkspaceInvitationStatus[] = ["invited", "revoked"];

interface WorkspaceInvitationsTableProps {
  invitations: WorkspaceInvitation[];
  users?: WorkspaceUser[];
  loading?: boolean;
  unavailableMessage?: string;
  onInvite?: () => void;
}

function userDisplayName(user: WorkspaceUser): string | null {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.name || fullName || user.email || null;
}

function invitationInviter(
  invitation: WorkspaceInvitation,
  userLookup: Map<string, WorkspaceUser>
) {
  if (invitation.invitedByName) return invitation.invitedByName;
  if (invitation.invitedByEmail) return invitation.invitedByEmail;

  const inviterId = invitation.invitedById || invitation.invitedBy;
  if (inviterId) {
    const match = userLookup.get(inviterId);
    if (match) return userDisplayName(match) ?? inviterId;
    return inviterId;
  }

  return "—";
}

function InvitationActionsCell({ invitation }: { invitation: WorkspaceInvitation }) {
  const resendInvitation = useResendWorkspaceInvitation();
  const revokeInvitation = useRevokeWorkspaceInvitation();
  const invitationId = getWorkspaceInvitationId(invitation);
  const canManage =
    Boolean(invitationId) &&
    (invitation.status === "pending" || invitation.status === "invited");
  const isPending = resendInvitation.isPending || revokeInvitation.isPending;

  function resendInvite() {
    resendInvitation.mutate(invitationId, {
      onSuccess: () => toast.success("Invitation resent"),
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to resend invite");
      },
    });
  }

  function revokeInvite() {
    if (!window.confirm("Revoke this workspace invitation?")) return;
    revokeInvitation.mutate(invitationId, {
      onSuccess: () => toast.success("Invite revoked"),
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to revoke invite");
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={(event) => event.stopPropagation()}
        aria-label="Open invitation actions"
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-64">
        <DropdownMenuItem
          disabled={!canManage || isPending}
          onClick={(event) => {
            event.stopPropagation();
            resendInvite();
          }}
        >
          <RotateCcw />
          Resend invite
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canManage || isPending}
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation();
            revokeInvite();
          }}
        >
          <UserRoundMinus />
          Revoke invite
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceInvitationsTable({
  invitations,
  users,
  loading,
  unavailableMessage,
  onInvite,
}: WorkspaceInvitationsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState<UserRole[]>([]);
  const [statusFilters, setStatusFilters] = useState<WorkspaceInvitationStatus[]>([]);

  const userLookup = useMemo(() => {
    const map = new Map<string, WorkspaceUser>();
    for (const user of users ?? []) {
      if (user.id) map.set(user.id, user);
      if (user.authId) map.set(user.authId, user);
    }
    return map;
  }, [users]);

  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        key: "role",
        label: "Role",
        options: ROLE_OPTIONS,
        value: roleFilters,
        onChange: (value) => setRoleFilters(value as UserRole[]),
        formatOption: (option) => WORKSPACE_ROLE_LABELS[option as UserRole],
      },
      {
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS,
        value: statusFilters,
        onChange: (value) => setStatusFilters(value as WorkspaceInvitationStatus[]),
        formatOption: (option) =>
          WORKSPACE_INVITATION_STATUS_LABELS[option as WorkspaceInvitationStatus],
      },
    ],
    [roleFilters, statusFilters]
  );

  const visibleInvitations = useMemo(
    () =>
      invitations.filter((invitation) => {
        if (roleFilters.length > 0 && !roleFilters.includes(invitation.role)) {
          return false;
        }
        if (statusFilters.length > 0 && !statusFilters.includes(invitation.status)) {
          return false;
        }

        return matchesSearchQuery(searchQuery, [
          invitation.email,
          invitation.role,
          invitation.status,
          invitationInviter(invitation, userLookup),
          invitation.invitedAt,
          invitation.clerkInvitationId,
        ]);
      }),
    [invitations, roleFilters, searchQuery, statusFilters, userLookup]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilters([]);
    setStatusFilters([]);
  };

  const columns: GridColDef<WorkspaceInvitation>[] = [
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      minWidth: 240,
      renderCell: (params) => (
        <span className="truncate font-medium" title={params.row.email}>
          {params.row.email}
        </span>
      ),
    },
    {
      field: "role",
      headerName: "Role",
      width: 140,
      renderCell: (params) => (
        <StatusBadge variant={WORKSPACE_ROLE_VARIANTS[params.row.role]}>
          {WORKSPACE_ROLE_LABELS[params.row.role]}
        </StatusBadge>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 132,
      renderCell: (params) => (
        <StatusBadge variant={WORKSPACE_INVITATION_STATUS_VARIANTS[params.row.status]}>
          {WORKSPACE_INVITATION_STATUS_LABELS[params.row.status]}
        </StatusBadge>
      ),
    },
    {
      field: "invitedByName",
      headerName: "Invited by",
      flex: 0.8,
      minWidth: 180,
      valueGetter: (_value, row) => invitationInviter(row, userLookup),
      renderCell: (params) => (
        <span className="truncate" title={params.value as string}>
          {params.value as string}
        </span>
      ),
    },
    {
      field: "invitedAt",
      headerName: "Invited at",
      width: 140,
      valueFormatter: (value: string | undefined) => formatWorkspaceDate(value),
    },
    {
      field: "actions",
      headerName: "",
      width: 72,
      sortable: false,
      filterable: false,
      renderCell: (params) => <InvitationActionsCell invitation={params.row} />,
    },
  ];

  const toolbar = (
    <FilterBar
      searchPlaceholder="Filter invitations…"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      resultCount={visibleInvitations.length}
      resultCountLoading={loading}
      resultLabel="invites"
    />
  );

  if (unavailableMessage) {
    return (
      <div>
        {toolbar}
        <EmptyState
          icon={MailPlus}
          title="Invitation backend pending"
          description={unavailableMessage}
          dashed
        />
      </div>
    );
  }

  if (
    !loading &&
    invitations.length === 0 &&
    !searchQuery &&
    roleFilters.length === 0
  ) {
    return (
      <EmptyState
        icon={MailPlus}
        title="No pending invitations"
        description="Invite a workspace user to grant access to this portal."
        actionLabel={onInvite ? "Invite user" : undefined}
        onAction={onInvite}
        dashed
      />
    );
  }

  if (!loading && visibleInvitations.length === 0) {
    return (
      <div>
        {toolbar}
        <EmptyState
          icon={MailPlus}
          title="No invitations match your filters"
          description="Adjust or clear the search and filters to see more pending invitations."
          actionLabel="Clear filters"
          onAction={clearFilters}
          dashed
        />
      </div>
    );
  }

  return (
    <div>
      {toolbar}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataGrid
          rows={visibleInvitations}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={44}
          rowHeight={64}
          getRowId={(row) => getWorkspaceInvitationId(row)}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={dataGridSx}
        />
      </div>
    </div>
  );
}
