"use client";

import { useMemo, useState } from "react";
import { Check, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceUsers } from "@/lib/hooks/use-workspace";
import {
  formatWorkspaceRole,
  getWorkspaceUserName,
  getWorkspaceUserStatus,
} from "@/components/workspace/workspace-format";
import { getTaskInitials } from "@/components/tasks/TaskAssigneeCell";
import type { WorkspaceUser } from "@/types";

export interface TaskAssignTarget {
  id: string;
  name: string;
}

interface TaskAssignButtonProps {
  /** Active entity (workspace) to pull assignable staff from. */
  entityId?: string | null;
  /** Currently assigned internal user id, marked as the active selection. */
  assignedUserId?: string | null;
  disabled?: boolean;
  /** Visible button text. Defaults to "Assign". */
  label?: string;
  onAssign: (target: TaskAssignTarget) => void;
}

/**
 * Inline action that assigns/reassigns a task to another staff member. The
 * staff list is only fetched once the popover opens, so opening a task drawer
 * stays cheap.
 */
export function TaskAssignButton({
  entityId,
  assignedUserId,
  disabled,
  label = "Assign",
  onAssign,
}: TaskAssignButtonProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(target: TaskAssignTarget) {
    onAssign(target);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`${label} task to another staff member`}
            disabled={disabled}
          />
        }
      >
        <UserPlus />
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-72 gap-0 p-0">
        {/*
         * Rendered unconditionally: base-ui's Portal unmounts this subtree while
         * the popover is closed (keepMounted defaults to false), so the staff
         * list still fetches only on first open, while the close animation no
         * longer flashes an empty box.
         */}
        <AssigneeList
          entityId={entityId}
          assignedUserId={assignedUserId}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

function userSubtitle(user: WorkspaceUser) {
  const roleLabel = user.role ? formatWorkspaceRole(user.role) : null;
  return [roleLabel, user.email].filter(Boolean).join(" · ") || "—";
}

function AssigneeList({
  entityId,
  assignedUserId,
  onSelect,
}: {
  entityId?: string | null;
  assignedUserId?: string | null;
  onSelect: (target: TaskAssignTarget) => void;
}) {
  const [query, setQuery] = useState("");
  const usersQuery = useWorkspaceUsers(entityId ?? undefined);
  const allUsers = useMemo(() => usersQuery.data?.data?.users ?? [], [usersQuery.data]);

  const assignable = useMemo(() => {
    const active = allUsers.filter(
      (user) => user.id && getWorkspaceUserStatus(user) === "active"
    );
    const q = query.trim().toLowerCase();
    const matched = q
      ? active.filter((user) => {
          const name = getWorkspaceUserName(user).toLowerCase();
          const email = (user.email ?? "").toLowerCase();
          const role = user.role ? formatWorkspaceRole(user.role).toLowerCase() : "";
          return name.includes(q) || email.includes(q) || role.includes(q);
        })
      : active;
    return [...matched].sort((a, b) =>
      getWorkspaceUserName(a).localeCompare(getWorkspaceUserName(b))
    );
  }, [allUsers, query]);

  const hasActiveStaff = allUsers.some(
    (user) => user.id && getWorkspaceUserStatus(user) === "active"
  );

  return (
    <div className="flex flex-col">
      <div className="border-b border-border p-2">
        <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">
          Assign to
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search staff…"
            aria-label="Search staff to assign"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-1">
        {usersQuery.isLoading ? (
          <div className="space-y-1 p-1" aria-label="Loading staff">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-2.5 px-1 py-1.5">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : usersQuery.isError ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Staff list could not be loaded. Try again in a moment.
          </p>
        ) : assignable.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {hasActiveStaff
              ? "No staff match your search."
              : "No active staff are available to assign."}
          </p>
        ) : (
          assignable.map((user) => {
            const name = getWorkspaceUserName(user);
            const isCurrent = !!assignedUserId && user.id === assignedUserId;
            return (
              <button
                key={user.id}
                type="button"
                disabled={isCurrent}
                onClick={() => onSelect({ id: user.id, name })}
                title={isCurrent ? `${name} (already assigned)` : name}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
                  {getTaskInitials(name)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userSubtitle(user)}
                  </span>
                </span>
                {isCurrent ? (
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
