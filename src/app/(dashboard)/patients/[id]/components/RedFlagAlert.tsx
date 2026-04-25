"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertBody } from "@/components/ui/alert";
import type { RedFlagResult } from "@/components/patients/red-flag-utils";

interface RedFlagAlertProps {
  redFlags: RedFlagResult;
  onReview?: () => void;
}

export function RedFlagAlert({ redFlags, onReview }: RedFlagAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!redFlags.hasRedFlag || dismissed) return null;

  return (
    <Alert variant="danger">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <AlertTitle>Doctor review required</AlertTitle>
          <AlertBody>{redFlags.triggers.join(". ")}</AlertBody>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-status-danger-border text-status-danger-fg hover:bg-status-danger-bg/80"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </Button>
          <Button size="sm" onClick={onReview}>
            Review now
          </Button>
        </div>
      </div>
    </Alert>
  );
}
