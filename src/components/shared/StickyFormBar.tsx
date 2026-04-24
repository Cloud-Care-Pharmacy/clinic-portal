"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StickyFormBarProps {
  isDirty: boolean;
  isPending: boolean;
  onDiscard: () => void;
}

export function StickyFormBar({ isDirty, isPending, onDiscard }: StickyFormBarProps) {
  if (!isDirty) return null;

  return (
    <div
      className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border bg-background px-4 py-3"
      style={{ boxShadow: "0 10px 30px -10px rgba(0,0,0,.15)" }}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" />
        Unsaved changes
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" onClick={onDiscard} disabled={isPending}>
          Discard
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
