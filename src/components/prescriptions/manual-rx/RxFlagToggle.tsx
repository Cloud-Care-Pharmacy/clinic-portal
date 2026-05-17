"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RxFlagToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  tone?: "default" | "warning";
  disabled?: boolean;
}

/**
 * Pill-shaped binary toggle (used for PBS / brand-sub / authority flags).
 * Renders as a real <button role="switch"> for a11y.
 */
export function RxFlagToggle({
  label,
  checked,
  onChange,
  tone = "default",
  disabled,
}: RxFlagToggleProps) {
  const activeTone =
    tone === "warning"
      ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
      : "border-primary/50 bg-primary/10 text-primary";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? activeTone
          : "border-border bg-popover text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-[3px] border",
          checked
            ? tone === "warning"
              ? "border-status-warning-fg/60 bg-status-warning-fg/10"
              : "border-primary/60 bg-primary/15"
            : "border-border bg-background"
        )}
        aria-hidden="true"
      >
        {checked && <Check className="size-2.5" />}
      </span>
      {label}
    </button>
  );
}
