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
        "group relative inline-flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-full border bg-muted px-2 text-muted-foreground transition-all duration-180 ease-in-out",
        disabled
          ? "cursor-default opacity-50"
          : "hover:bg-accent hover:pr-3 hover:text-foreground"
      )}
      aria-label={ariaLabel}
      disabled={disabled}
      type="button"
    >
      <span className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
        {icon}
      </span>
      {!disabled && (
        <span className="ml-0 inline-block max-w-0 overflow-hidden whitespace-nowrap text-[13px] leading-none text-foreground opacity-0 transition-[margin,max-width,opacity] duration-180 ease-in-out group-hover:ml-1.5 group-hover:max-w-64 group-hover:opacity-100">
          {label}
        </span>
      )}
    </button>
  );
}
