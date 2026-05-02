"use client";

import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
}: SegmentedControlProps<T>) {
  const itemHeight = size === "sm" ? "h-7" : "h-8";
  const itemPadding = size === "sm" ? "px-2.5" : "px-3";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-muted p-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
              itemHeight,
              itemPadding,
              text,
              active
                ? "bg-background text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
