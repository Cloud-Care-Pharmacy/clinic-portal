"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SaveNewVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of in-flight runs that will be orphaned on the current version. */
  inflightCount: number;
  /** The current/latest version. After save, the next version will be N+1. */
  currentVersion: number;
  /** Resolve when the user confirms — the parent runs the actual save. */
  onConfirm: () => void;
  /** Disable confirm while the save mutation is in flight. */
  pending: boolean;
}

/**
 * Pre-save warning shown when the user is about to bump a workflow's
 * `version` while runs are still mid-flight on the current version. Those
 * runs are pinned to the version they started on and will continue to
 * execute the old definition until they finish.
 *
 * NOTE: A "Also cancel all in-flight v{N} runs" opt-in checkbox is
 * intentionally omitted — the backend gateway does not expose a per-run
 * cancel endpoint (`POST /workflows/runs/{runId}/cancel`) yet. When that
 * endpoint ships, add the checkbox here and fan out the cancel calls
 * client-side from `WorkflowDetailClient.handleSave`.
 *
 * The parent guards on `inflightCount > 0` before opening this dialog;
 * pass-through saves (no in-flight runs) skip the modal entirely.
 */
export function SaveNewVersionDialog({
  open,
  onOpenChange,
  inflightCount,
  currentVersion,
  onConfirm,
  pending,
}: SaveNewVersionDialogProps) {
  const nextVersion = currentVersion + 1;
  const noun = inflightCount === 1 ? "run is" : "runs are";
  const pronoun = inflightCount === 1 ? "It" : "They";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save new version?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>
              {inflightCount} {noun} currently mid-flight on v{currentVersion}.
            </strong>{" "}
            {pronoun} will continue running on v{currentVersion} until{" "}
            {inflightCount === 1 ? "it finishes" : "they finish"} or{" "}
            {inflightCount === 1 ? "is" : "are"} cancelled. New runs will use
            v{nextVersion}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={pending}
          >
            {pending ? "Saving…" : `Save v${nextVersion}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
