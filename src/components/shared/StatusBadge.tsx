import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "info" | "accent" | "neutral";

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-status-success-bg text-status-success-fg border-status-success-border",
  warning: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  danger: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  info: "bg-status-info-bg text-status-info-fg border-status-info-border",
  accent: "bg-status-accent-bg text-status-accent-fg border-status-accent-border",
  neutral: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
};

/**
 * Map legacy status strings to design-system variants.
 * Keeps backward compatibility with existing consumers.
 */
const statusToVariant: Record<string, StatusVariant> = {
  active: "success",
  linked: "success",
  completed: "success",
  processed: "success",
  verified: "success",
  pending: "warning",
  flagged: "danger",
  expired: "danger",
  failed: "danger",
  rejected: "danger",
  cancelled: "neutral",
  "no-show": "danger",
  inactive: "neutral",
  received: "info",
  uploaded: "info",
  scheduled: "info",
};

interface StatusBadgeProps {
  /** Semantic variant — preferred API */
  variant?: StatusVariant;
  /** Legacy string, auto-mapped to a variant */
  status?: string;
  /** Optional leading dot indicator */
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function StatusBadge({
  variant,
  status,
  dot,
  className,
  children,
}: StatusBadgeProps) {
  const resolvedVariant =
    variant ?? statusToVariant[(status ?? "").toLowerCase()] ?? "neutral";
  const label = children ?? status ?? "";

  return (
    <span
      className={cn(
        "inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        variantStyles[resolvedVariant],
        className
      )}
    >
      {dot && <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />}
      {label}
    </span>
  );
}
