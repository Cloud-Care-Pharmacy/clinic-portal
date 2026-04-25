"use client";

import { cn } from "@/lib/utils";

interface ExpandableIconButtonProps {
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  disabled?: boolean;
}

export function ExpandableIconButton({
  icon,
  label,
  ariaLabel,
  disabled,
}: ExpandableIconButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-8 items-center justify-center gap-1.5 overflow-hidden rounded-full border bg-muted px-2 text-muted-foreground transition-all duration-[180ms] ease-in-out",
        disabled
          ? "cursor-default opacity-50"
          : "hover:bg-accent hover:pr-3 hover:text-foreground"
      )}
      aria-label={ariaLabel}
      disabled={disabled}
      type="button"
    >
      <span className="flex shrink-0 items-center justify-center size-3.5">{icon}</span>
      {!disabled && (
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-foreground opacity-0 transition-all duration-[180ms] ease-in-out group-hover:max-w-64 group-hover:opacity-100">
          {label}
        </span>
      )}
    </button>
  );
}
