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
        "group relative inline-flex h-8 items-center gap-0 overflow-hidden rounded-full border bg-muted/50 px-2 text-muted-foreground transition-all duration-300 ease-in-out",
        disabled
          ? "cursor-default opacity-50"
          : "hover:gap-2 hover:bg-muted hover:pr-3 hover:text-foreground"
      )}
      aria-label={ariaLabel}
      disabled={disabled}
      type="button"
    >
      <span className="shrink-0">{icon}</span>
      {!disabled && (
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-all duration-300 ease-in-out group-hover:max-w-64 group-hover:opacity-100">
          {label}
        </span>
      )}
    </button>
  );
}
