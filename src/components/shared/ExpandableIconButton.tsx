"use client";

import { cn } from "@/lib/utils";

interface ExpandableIconButtonProps {
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  expandDirection?: "left" | "right";
}

export function ExpandableIconButton({
  icon,
  label,
  ariaLabel,
  disabled,
  expandDirection = "right",
}: ExpandableIconButtonProps) {
  const expandsLeft = expandDirection === "left";
  const iconElement = (
    <span className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
      {icon}
    </span>
  );
  const labelElement = !disabled ? (
    <span
      className={cn(
        "inline-block max-w-0 overflow-hidden whitespace-nowrap text-[13px] leading-none text-foreground opacity-0 transition-[margin,max-width,opacity] duration-180 ease-in-out group-hover:max-w-64 group-hover:opacity-100",
        expandsLeft ? "mr-0 group-hover:mr-1.5" : "ml-0 group-hover:ml-1.5"
      )}
    >
      {label}
    </span>
  ) : null;

  return (
    <button
      className={cn(
        "group relative inline-flex h-9 min-w-9 items-center justify-center overflow-hidden rounded-full border bg-muted px-2.5 text-muted-foreground transition-all duration-180 ease-in-out",
        disabled
          ? "cursor-default opacity-50"
          : cn(
              "hover:bg-accent hover:text-foreground",
              expandsLeft ? "hover:pl-3" : "hover:pr-3"
            )
      )}
      aria-label={ariaLabel}
      disabled={disabled}
      type="button"
    >
      {expandsLeft ? labelElement : iconElement}
      {expandsLeft ? iconElement : labelElement}
    </button>
  );
}
