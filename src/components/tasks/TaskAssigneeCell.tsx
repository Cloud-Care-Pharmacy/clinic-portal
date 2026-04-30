import { UsersRound } from "lucide-react";
import type { Task, UserRole } from "@/types";

export function formatTaskRole(role?: UserRole | null) {
  if (!role) return "—";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getTaskAssigneeLabel(task: Task) {
  if (task.assignedUserName) return task.assignedUserName;
  if (task.assignedUserId) return "Assigned user";
  if (task.assignedRole) return `${formatTaskRole(task.assignedRole)} queue`;
  return "Unassigned";
}

export function getTaskInitials(value?: string | null) {
  if (!value) return "—";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "—"
  );
}

export function TaskAssigneeCell({ task }: { task: Task }) {
  const label = getTaskAssigneeLabel(task);

  if (task.assignedUserName || task.assignedUserId) {
    return (
      <div className="flex min-w-0 items-center gap-2" title={label}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
          {getTaskInitials(label)}
        </span>
        <span className="truncate text-sm">{label}</span>
      </div>
    );
  }

  if (task.assignedRole) {
    return (
      <div
        className="flex min-w-0 items-center gap-2"
        title={`${formatTaskRole(task.assignedRole)} queue`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg">
          <UsersRound className="size-3.5" />
        </span>
        <span className="truncate text-sm italic text-muted-foreground">
          {formatTaskRole(task.assignedRole)} queue
        </span>
      </div>
    );
  }

  return <span className="text-sm italic text-muted-foreground">Unassigned</span>;
}
