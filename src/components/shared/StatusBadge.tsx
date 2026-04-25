import { cn } from "@/lib/utils";

type StatusType =
  | "active"
  | "linked"
  | "pending"
  | "flagged"
  | "expired"
  | "inactive"
  | "received"
  | "processed"
  | "failed"
  | "uploaded"
  | "verified"
  | "rejected"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no-show";

const statusStyles: Record<StatusType, string> = {
  active: "bg-status-success-bg text-status-success-fg border-status-success-border",
  linked: "bg-status-success-bg text-status-success-fg border-status-success-border",
  pending: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  flagged: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  expired: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  inactive: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
  received: "bg-status-info-bg text-status-info-fg border-status-info-border",
  processed: "bg-status-success-bg text-status-success-fg border-status-success-border",
  failed: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  uploaded: "bg-status-info-bg text-status-info-fg border-status-info-border",
  verified: "bg-status-success-bg text-status-success-fg border-status-success-border",
  rejected: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  scheduled: "bg-status-info-bg text-status-info-fg border-status-info-border",
  completed: "bg-status-success-bg text-status-success-fg border-status-success-border",
  cancelled: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
  "no-show": "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style =
    statusStyles[status.toLowerCase() as StatusType] ?? statusStyles.inactive;
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-sm border px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap",
        style,
        className
      )}
    >
      {status}
    </span>
  );
}
