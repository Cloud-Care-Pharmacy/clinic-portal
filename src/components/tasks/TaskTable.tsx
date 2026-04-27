"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  ClipboardCheck,
  Eye,
  FileQuestion,
  HeartPulse,
  IdCard,
  ListTodo,
  MoreHorizontal,
  UserRound,
  UsersRound,
} from "lucide-react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { dataGridSx } from "@/lib/datagrid-theme";
import type { Task, TaskPriority, TaskStatus, TaskType, UserRole } from "@/types";
import {
  formatTaskDueRelative,
  formatTaskDate,
  getTaskDisplayTitle,
  isTaskOverdue,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
  TASK_TYPE_LABELS,
} from "@/components/tasks/task-format";

const STATUS_OPTIONS: TaskStatus[] = ["open", "in_progress", "completed", "cancelled"];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "normal", "high", "urgent"];
const TYPE_OPTIONS: TaskType[] = [
  "review_intake",
  "schedule_consultation",
  "verify_identity",
  "request_missing_information",
  "clinical_follow_up",
  "manual",
];
const ROLE_OPTIONS: UserRole[] = ["admin", "doctor", "staff"];

const TASK_TYPE_ICONS: Record<TaskType, ComponentType<{ className?: string }>> = {
  review_intake: ClipboardCheck,
  schedule_consultation: CalendarPlus,
  verify_identity: IdCard,
  request_missing_information: FileQuestion,
  clinical_follow_up: HeartPulse,
  manual: ListTodo,
};

interface TaskTableProps {
  tasks: Task[];
  total?: number;
  loading?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilters: TaskStatus[];
  onStatusFiltersChange: (value: TaskStatus[]) => void;
  priorityFilters: TaskPriority[];
  onPriorityFiltersChange: (value: TaskPriority[]) => void;
  typeFilters: TaskType[];
  onTypeFiltersChange: (value: TaskType[]) => void;
  roleFilters: UserRole[];
  onRoleFiltersChange: (value: UserRole[]) => void;
  onRowClick: (task: Task) => void;
  onScheduleConsultation?: (task: Task) => void;
  showPatientColumn?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  trailing?: ReactNode;
}

function formatRole(role?: UserRole | null) {
  if (!role) return "—";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function assigneeLabel(task: Task) {
  if (task.assignedUserName) return task.assignedUserName;
  if (task.assignedRole) return `${formatRole(task.assignedRole)} queue`;
  return "Unassigned";
}

function initials(value?: string | null) {
  if (!value) return "—";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "—"
  );
}

function AssigneeCell({ task }: { task: Task }) {
  if (task.assignedUserName) {
    return (
      <div className="flex min-w-0 items-center gap-2" title={task.assignedUserName}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
          {initials(task.assignedUserName)}
        </span>
        <span className="truncate text-sm">{task.assignedUserName}</span>
      </div>
    );
  }

  if (task.assignedRole) {
    return (
      <div
        className="flex min-w-0 items-center gap-2"
        title={`${formatRole(task.assignedRole)} queue`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg">
          <UsersRound className="size-3.5" />
        </span>
        <span className="truncate text-sm italic text-muted-foreground">
          {formatRole(task.assignedRole)} queue
        </span>
      </div>
    );
  }

  return <span className="text-sm italic text-muted-foreground">Unassigned</span>;
}

function ActionsCell({
  task,
  onView,
  onScheduleConsultation,
}: {
  task: Task;
  onView: () => void;
  onScheduleConsultation?: (task: Task) => void;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-11 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={(event) => event.stopPropagation()}
        aria-label="Open task actions"
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-56">
        <DropdownMenuItem onClick={onView}>
          <Eye />
          View task
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            router.push(`/patients/${encodeURIComponent(task.patientId)}`);
          }}
        >
          <UserRound />
          Open patient
        </DropdownMenuItem>
        {onScheduleConsultation && task.status !== "completed" && (
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onScheduleConsultation(task);
            }}
          >
            <CalendarPlus />
            Schedule consultation
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TaskTable({
  tasks,
  total,
  loading,
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  priorityFilters,
  onPriorityFiltersChange,
  typeFilters,
  onTypeFiltersChange,
  roleFilters,
  onRoleFiltersChange,
  onRowClick,
  onScheduleConsultation,
  showPatientColumn = true,
  emptyTitle = "No tasks found",
  emptyDescription = "New intake review tasks will appear here after patients submit intake forms.",
  trailing,
}: TaskTableProps) {
  const filters: FilterDefinition[] = [
    {
      key: "status",
      label: "Status",
      options: STATUS_OPTIONS,
      value: statusFilters,
      onChange: (value) => onStatusFiltersChange(value as TaskStatus[]),
      formatOption: (option) => TASK_STATUS_LABELS[option as TaskStatus],
    },
    {
      key: "priority",
      label: "Priority",
      options: PRIORITY_OPTIONS,
      value: priorityFilters,
      onChange: (value) => onPriorityFiltersChange(value as TaskPriority[]),
      formatOption: (option) => TASK_PRIORITY_LABELS[option as TaskPriority],
    },
    {
      key: "type",
      label: "Type",
      options: TYPE_OPTIONS,
      value: typeFilters,
      onChange: (value) => onTypeFiltersChange(value as TaskType[]),
      formatOption: (option) => TASK_TYPE_LABELS[option as TaskType],
    },
    {
      key: "role",
      label: "Queue",
      options: ROLE_OPTIONS,
      value: roleFilters,
      onChange: (value) => onRoleFiltersChange(value as UserRole[]),
      formatOption: (option) => formatRole(option as UserRole),
    },
  ];

  const allColumns: GridColDef<Task>[] = [
    {
      field: "title",
      headerName: "Task",
      flex: 1.55,
      minWidth: 260,
      renderCell: (params) => {
        const Icon = TASK_TYPE_ICONS[params.row.taskType] ?? ClipboardCheck;
        const displayTitle = getTaskDisplayTitle(params.row.taskType, params.row.title);

        return (
          <div className="flex min-w-0 items-start gap-2 py-2">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={params.row.title}>
                {displayTitle}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {TASK_TYPE_LABELS[params.row.taskType] ?? params.row.taskType}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      field: "patientName",
      headerName: "Patient",
      flex: 1,
      minWidth: 210,
      valueFormatter: (value: string | null | undefined) => value || "—",
      renderCell: (params) => (
        <Link
          href={`/patients/${encodeURIComponent(params.row.patientId)}`}
          onClick={(event) => event.stopPropagation()}
          scroll={false}
          title={params.row.patientName || params.row.patientId}
          className="flex min-w-0 items-center gap-2 text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials(params.row.patientName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {params.row.patientName || "Open patient"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {params.row.patientId}
            </span>
          </span>
        </Link>
      ),
    },
    {
      field: "priority",
      headerName: "Priority",
      width: 120,
      renderCell: (params) => (
        <StatusBadge variant={TASK_PRIORITY_VARIANTS[params.row.priority]}>
          {TASK_PRIORITY_LABELS[params.row.priority]}
        </StatusBadge>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <StatusBadge variant={TASK_STATUS_VARIANTS[params.row.status]}>
          {TASK_STATUS_LABELS[params.row.status]}
        </StatusBadge>
      ),
    },
    {
      field: "assignedUserName",
      headerName: "Assigned to",
      width: 180,
      valueGetter: (_value, row) => assigneeLabel(row),
      renderCell: (params) => <AssigneeCell task={params.row} />,
    },
    {
      field: "dueAt",
      headerName: "Due",
      width: 150,
      renderCell: (params) => {
        const overdue =
          params.row.status !== "completed" &&
          params.row.status !== "cancelled" &&
          isTaskOverdue(params.row.dueAt);
        return (
          <span
            className={
              overdue ? "leading-tight text-status-danger-fg" : "leading-tight"
            }
            title={
              params.row.dueAt ? new Date(params.row.dueAt).toISOString() : undefined
            }
          >
            <span className={overdue ? "block font-semibold" : "block"}>
              {formatTaskDate(params.row.dueAt)}
            </span>
            <span
              className={
                overdue ? "block text-xs" : "block text-xs text-muted-foreground"
              }
            >
              {formatTaskDueRelative(params.row.dueAt, params.row.status)}
            </span>
          </span>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 130,
      valueFormatter: (value: string) => formatTaskDate(value),
    },
    {
      field: "actions",
      headerName: "",
      width: 64,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <ActionsCell
          task={params.row}
          onView={() => onRowClick(params.row)}
          onScheduleConsultation={onScheduleConsultation}
        />
      ),
    },
  ];

  const columns = showPatientColumn
    ? allColumns
    : allColumns.filter((column) => column.field !== "patientName");

  const toolbar = (
    <FilterBar
      searchPlaceholder="Search tasks or patients…"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      filters={filters}
      resultCount={total ?? tasks.length}
      resultLabel="tasks"
      trailing={trailing}
    />
  );

  if (!loading && tasks.length === 0) {
    return (
      <div style={{ width: "100%" }}>
        {toolbar}
        <EmptyState
          icon={ClipboardCheck}
          title={emptyTitle}
          description={emptyDescription}
          dashed
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {toolbar}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataGrid
          rows={tasks}
          columns={columns}
          getRowId={(row) => row.taskId}
          loading={loading}
          autoHeight
          pagination
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={44}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={64}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          onRowClick={(params: GridRowParams<Task>) => onRowClick(params.row)}
          sx={dataGridSx}
        />
      </div>
    </div>
  );
}
