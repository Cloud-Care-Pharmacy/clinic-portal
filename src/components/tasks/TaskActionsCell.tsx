"use client";

import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Check,
  Eye,
  FileText,
  MoreHorizontal,
  Phone,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/types";

interface TaskActionsCellProps {
  task: Task;
  onView: () => void;
  onScheduleConsultation?: (task: Task) => void;
  onClaimTask?: (task: Task) => void;
  onCallTask?: (task: Task) => void;
  onManualLogTask?: (task: Task) => void;
  currentUserId?: string;
  pending?: boolean;
}

export function isTaskCompleted(task: Task) {
  return task.status === "completed" || task.status === "cancelled";
}

export function isTaskAssignedToCurrentUser(task: Task, currentUserId?: string) {
  return Boolean(
    currentUserId && task.assignedUserId === currentUserId && !task.assignedRole
  );
}

export function isTaskUnassigned(task: Task) {
  return !task.assignedUserId && !task.assignedRole;
}

export function TaskActionsCell({
  task,
  onView,
  onScheduleConsultation,
  onClaimTask,
  onCallTask,
  onManualLogTask,
  currentUserId,
  pending,
}: TaskActionsCellProps) {
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
          className="flex justify-start gap-1"
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
          className="flex justify-start gap-1"
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
