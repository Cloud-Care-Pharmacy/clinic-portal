"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeModeToggleProps {
  active: boolean;
  onToggle: (next: boolean) => void;
  imageUrl?: string | null;
  label?: string;
  disabled?: boolean;
}

/**
 * Right-aligned toggle that filters the task list to "tasks assigned to me".
 * When inactive (default), the table shows all tasks regardless of assignee.
 */
export function MeModeToggle({
  active,
  onToggle,
  imageUrl,
  label = "Me mode",
  disabled,
}: MeModeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={disabled}
      onClick={() => onToggle(!active)}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-2.5 pr-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <UserRound className="size-3.5" />
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}
