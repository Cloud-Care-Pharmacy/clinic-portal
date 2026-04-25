"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RedFlagResult } from "@/components/patients/red-flag-utils";

interface RedFlagAlertProps {
  redFlags: RedFlagResult;
  onReview?: () => void;
}

export function RedFlagAlert({ redFlags, onReview }: RedFlagAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!redFlags.hasRedFlag || dismissed) return null;

  return (
    <div className="flex gap-3 items-center rounded-2xl border border-status-danger-border bg-status-danger-bg px-5 py-4 text-status-danger-fg">
      <ShieldAlert className="size-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold">Doctor review required</p>
        <p className="text-[13px] leading-[1.5] opacity-90 mt-0.5">
          {redFlags.triggers.join(". ")}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setDismissed(true)}
          className="text-[13px] font-medium text-status-danger-fg hover:underline underline-offset-2"
        >
          Dismiss
        </button>
        {onReview && (
          <Button
            size="sm"
            onClick={onReview}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            Review now
          </Button>
        )}
      </div>
    </div>
  );
}
