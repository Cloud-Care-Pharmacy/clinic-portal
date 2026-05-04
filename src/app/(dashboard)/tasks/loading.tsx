import {
  Check,
  Plus,
  Search,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TABLE_GRID_TEMPLATE =
  "minmax(260px, 1.4fr) minmax(220px, 1.1fr) 116px 132px minmax(180px, 0.9fr) 150px 164px";

const TABLE_HEADERS = [
  "Task",
  "Patient",
  "Priority",
  "Status",
  "Assigned to",
  "Due",
  "Action",
];

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" />
      <p className="-mt-4 max-w-3xl text-sm text-muted-foreground">
        Claim work from the unassigned queue, start a phone call, and log the structured
        outcome without leaving this screen.
      </p>

      <div style={{ width: "100%" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <LoadingPreset icon={UsersRound} label="Unassigned" tone="neutral" />
            <LoadingPreset icon={UserRound} label="Claimed" tone="primary" active />
            <LoadingPreset icon={Check} label="Completed" tone="neutral" />

            <div className="relative h-11 w-full rounded-xl border border-input bg-background text-sm text-muted-foreground sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <span className="absolute left-9 top-1/2 -translate-y-1/2">
                Search tasks or patients...
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <UserRound className="size-3.5" />
              </span>
              Me mode
            </div>
            <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground">
              <Plus className="size-4" />
              New task
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 1220 }}>
              <div
                className="grid h-11 items-center border-b border-border"
                style={{
                  backgroundColor: "var(--table-header)",
                  gridTemplateColumns: TABLE_GRID_TEMPLATE,
                }}
              >
                {TABLE_HEADERS.map((header) => (
                  <div
                    key={header}
                    className="px-4 text-sm font-semibold text-foreground"
                  >
                    {header}
                  </div>
                ))}
              </div>

              {Array.from({ length: 5 }).map((_, index) => (
                <LoadingTaskRow key={index} />
              ))}
            </div>
          </div>

          <div className="flex min-h-14 items-center justify-end gap-6 border-t border-border bg-card px-4 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <span className="tabular-nums">10</span>
            <span className="tabular-nums">Loading rows</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingPreset({
  icon: Icon,
  label,
  tone,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  tone: "neutral" | "primary";
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
        !active && "border-border bg-popover text-muted-foreground",
        active && tone === "primary" && "border-primary bg-primary text-primary-foreground",
        active &&
          tone === "neutral" &&
          "border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg"
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
      <span
        aria-label="Loading task count"
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
          !active && "bg-muted",
          active && tone === "primary" && "bg-primary-foreground/20",
          active && tone === "neutral" && "bg-status-neutral-fg"
        )}
      >
        <Skeleton
          className={cn(
            "h-2.5 w-3.5 rounded-full",
            !active && "bg-muted-foreground/20",
            active && tone === "primary" && "bg-primary-foreground/50",
            active && tone === "neutral" && "bg-background/45"
          )}
        />
      </span>
    </div>
  );
}

function LoadingTaskRow() {
  return (
    <div
      className="grid items-center border-b border-border last:border-b-0"
      style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE, minHeight: 72 }}
    >
      <div className="flex min-w-0 items-center gap-2 px-4">
        <Skeleton className="size-7 shrink-0 rounded-md" />
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 px-4">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="px-4">
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="px-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex min-w-0 items-center gap-2 px-4">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="space-y-2 px-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex items-center gap-2 px-4">
        <Skeleton className="h-11 w-20 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>
    </div>
  );
}
