"use client";

import { useMemo, useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { MoreHorizontal, ShieldCheck, UserRoundX, Users } from "lucide-react";
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
import type { UserRole, WorkspaceUser, WorkspaceUserStatus } from "@/types";
import {
  formatWorkspaceDate,
  formatWorkspaceTimestamp,
  getWorkspaceUserName,
  getWorkspaceUserStatus,
  WORKSPACE_ROLE_LABELS,
  WORKSPACE_ROLE_VARIANTS,
  WORKSPACE_USER_STATUS_LABELS,
  WORKSPACE_USER_STATUS_VARIANTS,
} from "@/components/workspace/workspace-format";

const ROLE_OPTIONS: UserRole[] = ["admin", "doctor", "staff"];
const STATUS_OPTIONS: WorkspaceUserStatus[] = ["active", "inactive"];

interface WorkspaceUsersTableProps {
  users: WorkspaceUser[];
  loading?: boolean;
  unavailableMessage?: string;
}

function UserActionsCell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={(event) => event.stopPropagation()}
        aria-label="Open user actions"
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-64">
        <DropdownMenuItem disabled>
          <ShieldCheck />
          Change role when backend is ready
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled variant="destructive">
          <UserRoundX />
          Deactivate user when backend is ready
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceUsersTable({
  users,
  loading,
  unavailableMessage,
}: WorkspaceUsersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState<UserRole[]>([]);
  const [statusFilters, setStatusFilters] = useState<WorkspaceUserStatus[]>([]);

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
        onChange: (value) => setStatusFilters(value as WorkspaceUserStatus[]),
        formatOption: (option) =>
          WORKSPACE_USER_STATUS_LABELS[option as WorkspaceUserStatus],
      },
    ],
    [roleFilters, statusFilters]
  );

  const visibleUsers = useMemo(
    () =>
      users.filter((user) => {
        const status = getWorkspaceUserStatus(user);
        if (roleFilters.length > 0 && !roleFilters.includes(user.role)) return false;
        if (statusFilters.length > 0 && !statusFilters.includes(status)) return false;

        return matchesSearchQuery(searchQuery, [
          getWorkspaceUserName(user),
          user.email,
          user.authId,
          user.phone,
          user.role,
          status,
        ]);
      }),
    [roleFilters, searchQuery, statusFilters, users]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilters([]);
    setStatusFilters([]);
  };

  const columns: GridColDef<WorkspaceUser>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 200,
      valueGetter: (_value, row) => getWorkspaceUserName(row),
      renderCell: (params) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={params.value as string}>
            {params.value as string}
          </p>
          <p
            className="truncate text-xs text-muted-foreground"
            title={params.row.phone ?? "Phone not recorded"}
          >
            {params.row.phone ?? "Phone not recorded"}
          </p>
        </div>
      ),
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      minWidth: 220,
      valueFormatter: (value: string | null | undefined) => value || "—",
      renderCell: (params) => (
        <span className="truncate" title={params.row.email || undefined}>
          {params.row.email || "—"}
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
      width: 120,
      valueGetter: (_value, row) => getWorkspaceUserStatus(row),
      renderCell: (params) => {
        const status = getWorkspaceUserStatus(params.row);
        return (
          <StatusBadge variant={WORKSPACE_USER_STATUS_VARIANTS[status]}>
            {WORKSPACE_USER_STATUS_LABELS[status]}
          </StatusBadge>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Joined",
      width: 140,
      valueFormatter: (value: string | undefined) => formatWorkspaceDate(value),
    },
    {
      field: "lastActiveAt",
      headerName: "Last active",
      width: 180,
      valueFormatter: (value: string | null | undefined) =>
        formatWorkspaceTimestamp(value),
    },
    {
      field: "actions",
      headerName: "",
      width: 72,
      sortable: false,
      filterable: false,
      renderCell: () => <UserActionsCell />,
    },
  ];

  const toolbar = (
    <FilterBar
      searchPlaceholder="Filter users…"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      resultCount={visibleUsers.length}
      resultCountLoading={loading}
      resultLabel="users"
    />
  );

  if (unavailableMessage) {
    return (
      <div>
        {toolbar}
        <EmptyState
          icon={Users}
          title="User list backend pending"
          description={unavailableMessage}
          dashed
        />
      </div>
    );
  }

  if (!loading && users.length === 0 && !searchQuery && roleFilters.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No users returned"
        description="The staff list endpoint responded successfully but did not return any workspace users."
        dashed
      />
    );
  }

  if (!loading && visibleUsers.length === 0) {
    return (
      <div>
        {toolbar}
        <EmptyState
          icon={Users}
          title="No users match your filters"
          description="Adjust or clear the search and filters to see more workspace users."
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
          rows={visibleUsers}
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
