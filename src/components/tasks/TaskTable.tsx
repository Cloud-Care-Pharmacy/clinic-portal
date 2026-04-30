"use client";

import { useMemo, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Check,
  ClipboardCheck,
  Eye,
  FileQuestion,
  FileText,
  HeartPulse,
  IdCard,
  ListTodo,
  MoreHorizontal,
  Phone,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  DataGridPro,
  type GridColDef,
  type GridRowParams,
  type GridRowSelectionModel,
} from "@mui/x-data-grid-pro";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task, TaskPriority, TaskStatus, TaskType, UserRole } from "@/types";
import {
  formatTaskDueRelative,
  formatTaskDate,
  getTaskDisplayTitle,
  getTaskPatientPhone,
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
const ASSIGNMENT_OPTIONS = ["mine", "unassigned"] as const;

export type TaskAssignmentFilter = (typeof ASSIGNMENT_OPTIONS)[number];

const TASK_ASSIGNMENT_LABELS: Record<TaskAssignmentFilter, string> = {
  mine: "My tasks",
  unassigned: "Unassigned",
};

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
  assignmentFilters?: TaskAssignmentFilter[];
  onAssignmentFiltersChange?: (value: TaskAssignmentFilter[]) => void;
  currentUserId?: string;
  onRowClick: (task: Task) => void;
  onScheduleConsultation?: (task: Task) => void;
  showPatientColumn?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: ReactNode;
  quickFilters?: ReactNode;
  showFilterControls?: boolean;
  onClaimTask?: (task: Task) => void;
  onCallTask?: (task: Task) => void;
  onManualLogTask?: (task: Task) => void;
  pendingActionIds?: string[];
  pendingUpdates?: Record<string, { assignee?: boolean; status?: boolean }>;
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
  if (task.assignedUserId) return "Assigned user";
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
  const label = assigneeLabel(task);

  if (task.assignedUserName || task.assignedUserId) {
    return (
      <div className="flex min-w-0 items-center gap-2" title={label}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
          {initials(label)}
        </span>
        <span className="truncate text-sm">{label}</span>
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

function isTaskCompleted(task: Task) {
  return task.status === "completed" || task.status === "cancelled";
}

function isTaskAssignedToCurrentUser(task: Task, currentUserId?: string) {
  return Boolean(
    currentUserId && task.assignedUserId === currentUserId && !task.assignedRole
  );
}

function isTaskUnassigned(task: Task) {
  return !task.assignedUserId && !task.assignedRole;
}

function ActionsCell({
  task,
  onView,
  onScheduleConsultation,
  onClaimTask,
  onCallTask,
  onManualLogTask,
  currentUserId,
  pending,
}: {
  task: Task;
  onView: () => void;
  onScheduleConsultation?: (task: Task) => void;
  onClaimTask?: (task: Task) => void;
  onCallTask?: (task: Task) => void;
  onManualLogTask?: (task: Task) => void;
  currentUserId?: string;
  pending?: boolean;
}) {
  const router = useRouter();
  const completed = isTaskCompleted(task);
  const unassigned = isTaskUnassigned(task);
  const mine = isTaskAssignedToCurrentUser(task, currentUserId);

  if (onClaimTask || onCallTask || onManualLogTask) {
    if (completed) {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Check className="size-3.5" />
          {task.status === "cancelled" ? "Closed" : "Done"}
        </span>
      );
    }

    if (unassigned) {
      return (
        <div
          className="flex justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          {onClaimTask && (
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-full px-3"
              disabled={pending}
              onClick={() => onClaimTask(task)}
            >
              <UserRound className="size-3.5" />
              {pending ? "Claiming…" : "Claim"}
            </Button>
          )}
          {onManualLogTask && (
            <Button
              size="icon-sm"
              variant="outline"
              className="size-11 rounded-full"
              disabled={pending}
              onClick={() => onManualLogTask(task)}
              aria-label="Log call outcome manually"
              title="Log call outcome manually"
            >
              <FileText className="size-3.5" />
            </Button>
          )}
        </div>
      );
    }

    if (mine) {
      return (
        <div
          className="flex justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          {onCallTask && (
            <Button
              size="sm"
              className="h-11 rounded-full px-3"
              disabled={pending}
              onClick={() => onCallTask(task)}
            >
              <Phone className="size-3.5" />
              Call
            </Button>
          )}
          {onManualLogTask && (
            <Button
              size="icon-sm"
              variant="outline"
              className="size-11 rounded-full"
              disabled={pending}
              onClick={() => onManualLogTask(task)}
              aria-label="Log call outcome manually"
              title="Log call outcome manually"
            >
              <FileText className="size-3.5" />
            </Button>
          )}
        </div>
      );
    }
  }

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
  assignmentFilters = [],
  onAssignmentFiltersChange,
  currentUserId,
  onRowClick,
  onScheduleConsultation,
  showPatientColumn = true,
  selectionEnabled = false,
  selectedIds,
  onSelectionChange,
  bulkActions,
  quickFilters,
  showFilterControls = true,
  onClaimTask,
  onCallTask,
  onManualLogTask,
  pendingActionIds = [],
  pendingUpdates,
  emptyTitle = "No tasks found",
  emptyDescription = "New intake review tasks will appear here after patients submit intake forms.",
  trailing,
}: TaskTableProps) {
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilters.length > 0 ||
    assignmentFilters.length > 0 ||
    priorityFilters.length > 0 ||
    typeFilters.length > 0 ||
    roleFilters.length > 0;

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (statusFilters.length > 0 && !statusFilters.includes(task.status)) {
          return false;
        }
        if (assignmentFilters.length > 0) {
          const matchesMine = Boolean(
            currentUserId && task.assignedUserId === currentUserId && !task.assignedRole
          );
          const matchesUnassigned = !task.assignedUserId && !task.assignedRole;

          if (
            !(
              (assignmentFilters.includes("mine") && matchesMine) ||
              (assignmentFilters.includes("unassigned") && matchesUnassigned)
            )
          ) {
            return false;
          }
        }
        if (priorityFilters.length > 0 && !priorityFilters.includes(task.priority)) {
          return false;
        }
        if (typeFilters.length > 0 && !typeFilters.includes(task.taskType)) {
          return false;
        }
        if (
          roleFilters.length > 0 &&
          (!task.assignedRole || !roleFilters.includes(task.assignedRole))
        ) {
          return false;
        }

        return matchesSearchQuery(searchQuery, [
          task.title,
          getTaskDisplayTitle(task.taskType, task.title),
          task.description,
          task.patientName,
          task.patientId,
          task.taskId,
          task.source,
          task.assignedUserName,
          assigneeLabel(task),
          task.assignedRole ? formatRole(task.assignedRole) : undefined,
          TASK_STATUS_LABELS[task.status],
          TASK_PRIORITY_LABELS[task.priority],
          TASK_TYPE_LABELS[task.taskType],
          task.status,
          task.priority,
          task.taskType,
          task.dueAt,
          task.createdAt,
          task.metadata,
        ]);
      }),
    [
      assignmentFilters,
      currentUserId,
      priorityFilters,
      roleFilters,
      searchQuery,
      statusFilters,
      tasks,
      typeFilters,
    ]
  );

  const clearFilters = () => {
    onSearchChange("");
    onStatusFiltersChange([]);
    onAssignmentFiltersChange?.([]);
    onPriorityFiltersChange([]);
    onTypeFiltersChange([]);
    onRoleFiltersChange([]);
  };

  const filters: FilterDefinition[] = [
    {
      key: "status",
      label: "Status",
      options: STATUS_OPTIONS,
      value: statusFilters,
      onChange: (value) => onStatusFiltersChange(value as TaskStatus[]),
      formatOption: (option) => TASK_STATUS_LABELS[option as TaskStatus],
    },
    ...(onAssignmentFiltersChange
      ? [
          {
            key: "assignment",
            label: "Assignment",
            options: [...ASSIGNMENT_OPTIONS],
            value: assignmentFilters,
            onChange: (value: string[]) =>
              onAssignmentFiltersChange(value as TaskAssignmentFilter[]),
            formatOption: (option: string) =>
              TASK_ASSIGNMENT_LABELS[option as TaskAssignmentFilter],
          },
        ]
      : []),
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
      flex: 1.25,
      minWidth: 220,
      valueFormatter: (value: string | null | undefined) => value || "—",
      renderCell: (params) => {
        const phone = getTaskPatientPhone(params.row);
        return (
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
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {phone ?? params.row.patientId}
              </span>
            </span>
          </Link>
        );
      },
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
      renderCell: (params) => {
        if (pendingUpdates?.[params.row.taskId]?.status) {
          return <Skeleton className="h-5 w-20 rounded-full" />;
        }
        return (
          <StatusBadge variant={TASK_STATUS_VARIANTS[params.row.status]}>
            {TASK_STATUS_LABELS[params.row.status]}
          </StatusBadge>
        );
      },
    },
    {
      field: "assignedUserName",
      headerName: "Assigned to",
      width: 180,
      valueGetter: (_value, row) => assigneeLabel(row),
      renderCell: (params) => {
        if (pendingUpdates?.[params.row.taskId]?.assignee) {
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          );
        }
        return <AssigneeCell task={params.row} />;
      },
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
      headerName: "Action",
      width: 170,
      align: "right",
      headerAlign: "right",
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <ActionsCell
          task={params.row}
          onView={() => onRowClick(params.row)}
          onScheduleConsultation={onScheduleConsultation}
          onClaimTask={onClaimTask}
          onCallTask={onCallTask}
          onManualLogTask={onManualLogTask}
          currentUserId={currentUserId}
          pending={pendingActionIds.includes(params.row.taskId)}
        />
      ),
    },
  ];

  const columns = showPatientColumn
    ? allColumns
    : allColumns.filter((column) => column.field !== "patientName");

  const toolbar = (
    <FilterBar
      leading={quickFilters}
      searchPlaceholder="Search tasks or patients…"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      filters={showFilterControls ? filters : []}
      resultCount={
        bulkActions
          ? undefined
          : hasActiveFilters
            ? visibleTasks.length
            : (total ?? tasks.length)
      }
      resultLabel="tasks"
      trailing={
        bulkActions || trailing ? (
          <div className="flex items-center gap-2">
            {bulkActions}
            {trailing}
          </div>
        ) : undefined
      }
    />
  );

  if (!loading && tasks.length === 0 && !hasActiveFilters) {
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

  if (!loading && visibleTasks.length === 0) {
    return (
      <div style={{ width: "100%" }}>
        {toolbar}
        <EmptyState
          icon={ClipboardCheck}
          title="No tasks match your filters"
          description="Adjust or clear the search and filters to see more records."
          actionLabel="Clear filters"
          onAction={clearFilters}
          dashed
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {toolbar}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataGridPro
          rows={visibleTasks}
          columns={columns}
          getRowId={(row) => row.taskId}
          loading={loading}
          autoHeight
          pagination
          checkboxSelection={selectionEnabled}
          isRowSelectable={(params) =>
            isTaskUnassigned(params.row) && !isTaskCompleted(params.row)
          }
          rowSelectionModel={
            selectionEnabled
              ? { type: "include", ids: new Set<string>(selectedIds ?? []) }
              : undefined
          }
          onRowSelectionModelChange={
            selectionEnabled && onSelectionChange
              ? (model: GridRowSelectionModel) => {
                  if (model.type === "include") {
                    onSelectionChange(Array.from(model.ids).map(String));
                  } else {
                    const excluded = model.ids;
                    onSelectionChange(
                      visibleTasks
                        .map((task) => task.taskId)
                        .filter((id) => !excluded.has(id))
                    );
                  }
                }
              : undefined
          }
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={44}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={72}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            pinnedColumns: { right: ["actions"] },
          }}
          onRowClick={(params: GridRowParams<Task>) => onRowClick(params.row)}
          sx={dataGridSx}
        />
      </div>
    </div>
  );
}
