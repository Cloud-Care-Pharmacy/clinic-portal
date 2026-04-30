"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskQueueBulkActionsProps {
  selectedCount: number;
  pending: boolean;
  canClaim: boolean;
  onClear: () => void;
  onClaim: () => void;
}

function pluralizeTask(count: number) {
  return `task${count === 1 ? "" : "s"}`;
}

export function TaskQueueBulkActions({
  selectedCount,
  pending,
  canClaim,
  onClear,
  onClaim,
}: TaskQueueBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium tabular-nums">{selectedCount} selected</span>
      <Button variant="outline" onClick={onClear} disabled={pending}>
        Clear
      </Button>
      <Button onClick={onClaim} disabled={!canClaim || pending}>
        <Check className="size-4" />
        Claim {selectedCount} {pluralizeTask(selectedCount)}
      </Button>
    </div>
  );
}
