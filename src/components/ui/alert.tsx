import * as React from "react";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Circle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger" | "accent" | "neutral";

const variantStyles: Record<AlertVariant, string> = {
  info: "border-status-info-border bg-status-info-bg text-status-info-fg",
  success: "border-status-success-border bg-status-success-bg text-status-success-fg",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
  accent: "border-status-accent-border bg-status-accent-bg text-status-accent-fg",
  neutral: "border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg",
};

const variantIcons: Record<
  AlertVariant,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertOctagon,
  accent: Sparkles,
  neutral: Circle,
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  onClose?: () => void;
}

function Alert({
  variant = "neutral",
  onClose,
  className,
  children,
  ...props
}: AlertProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      role="alert"
      className={cn(
        "grid grid-cols-[16px_1fr] gap-x-2.5 rounded-[10px] border p-3 text-sm",
        onClose && "grid-cols-[16px_1fr_14px]",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 size-3.5 shrink-0 cursor-pointer opacity-50 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={cn("text-sm font-medium leading-snug", className)} {...props} />
  );
}

function AlertBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[13px] font-normal leading-snug opacity-90", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertBody };
export type { AlertVariant };
