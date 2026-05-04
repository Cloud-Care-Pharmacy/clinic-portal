"use client";

import { useMemo, useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { MailPlus, MoreHorizontal, RotateCcw, UserRoundMinus } from "lucide-react";
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
import { matchesSearchQuery } from "@/lib/table-search";
import type { UserRole, WorkspaceInvitation, WorkspaceInvitationStatus } from "@/types";
import {
  formatWorkspaceDate,
  WORKSPACE_INVITATION_STATUS_LABELS,
  WORKSPACE_INVITATION_STATUS_VARIANTS,
  WORKSPACE_ROLE_LABELS,
  WORKSPACE_ROLE_VARIANTS,
} from "@/components/workspace/workspace-format";

const ROLE_OPTIONS: UserRole[] = ["admin", "doctor", "staff"];
const STATUS_OPTIONS: WorkspaceInvitationStatus[] = [
  "pending",
  "accepted",
  "expired",
  "revoked",
];

interface WorkspaceInvitationsTableProps {
  invitations: WorkspaceInvitation[];
  loading?: boolean;
  unavailableMessage?: string;
}

function invitationInviter(invitation: WorkspaceInvitation) {
  return (
    invitation.invitedByName ||
    invitation.invitedByEmail ||
    invitation.invitedById ||
    "—"
  );
}

function InvitationActionsCell() {
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
        <DropdownMenuItem disabled>
          <RotateCcw />
          Resend invite when backend is ready
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled variant="destructive">
          <UserRoundMinus />
          Revoke invite when backend is ready
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceInvitationsTable({
  invitations,
  loading,
  unavailableMessage,
}: WorkspaceInvitationsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState<UserRole[]>([]);
  const [statusFilters, setStatusFilters] = useState<WorkspaceInvitationStatus[]>([]);

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
        onChange: (value) =>
          setStatusFilters(value as WorkspaceInvitationStatus[]),
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
        if (
          statusFilters.length > 0 &&
          !statusFilters.includes(invitation.status)
        ) {
          return false;
        }

        return matchesSearchQuery(searchQuery, [
          invitation.email,
          invitation.role,
          invitation.status,
          invitationInviter(invitation),
          invitation.invitedAt,
          invitation.expiresAt,
        ]);
      }),
    [invitations, roleFilters, searchQuery, statusFilters]
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
        <StatusBadge
          variant={WORKSPACE_INVITATION_STATUS_VARIANTS[params.row.status]}
        >
          {WORKSPACE_INVITATION_STATUS_LABELS[params.row.status]}
        </StatusBadge>
      ),
    },
    {
      field: "invitedByName",
      headerName: "Invited by",
      flex: 0.8,
      minWidth: 180,
      valueGetter: (_value, row) => invitationInviter(row),
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
      field: "expiresAt",
      headerName: "Expires at",
      width: 140,
      valueFormatter: (value: string | null | undefined) =>
        formatWorkspaceDate(value),
    },
    {
      field: "actions",
      headerName: "",
      width: 72,
      sortable: false,
      filterable: false,
      renderCell: () => <InvitationActionsCell />,
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

  if (!loading && invitations.length === 0 && !searchQuery && roleFilters.length === 0) {
    return (
      <EmptyState
        icon={MailPlus}
        title="No pending invitations"
        description="Invitations sent to new workspace users will appear here once the backend endpoint is available."
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
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={dataGridSx}
        />
      </div>
    </div>
  );
}
