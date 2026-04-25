"use client";

import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RedFlagResult } from "@/components/patients/red-flag-utils";

interface RedFlagAlertProps {
  redFlags: RedFlagResult;
}

export function RedFlagAlert({ redFlags }: RedFlagAlertProps) {
  if (!redFlags.hasRedFlag) return null;

  return (
    <div
      className="rounded-lg border-l-[3px] border-l-destructive px-4 py-3"
      style={{
        background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
      }}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Red flag — doctor review required</p>
          <p className="text-sm text-muted-foreground mt-0.5">{redFlags.triggers[0]}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm">
            Dismiss
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Review
          </Button>
        </div>
      </div>
    </div>
  );
}
