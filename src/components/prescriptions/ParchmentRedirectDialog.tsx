"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, SquarePen } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useCreateParchmentPrescriptionLink,
  buildParchmentPatientUrl,
} from "@/lib/hooks/use-prescriptions";

interface ParchmentRedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string | undefined;
  patientName: string;
}

export function ParchmentRedirectDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
}: ParchmentRedirectDialogProps) {
  const mutation = useCreateParchmentPrescriptionLink();
  const queryClient = useQueryClient();
  // Pre-opened tab reference — opened synchronously on click to avoid popup blockers.
  const pendingTabRef = useRef<Window | null>(null);

  // Reset mutation state when the dialog closes so a fresh attempt is possible next time.
  useEffect(() => {
    if (!open) {
      mutation.reset();
      if (pendingTabRef.current && !pendingTabRef.current.closed) {
        pendingTabRef.current.close();
      }
      pendingTabRef.current = null;
    }
  }, [open, mutation]);

  const isLoading = mutation.isPending;

  function handleAcknowledge() {
    if (!patientId || isLoading) return;

    // Open a blank tab synchronously inside the user gesture to bypass popup blockers.
    // We update its location once Parchment returns the prescriber URL.
    pendingTabRef.current = window.open("about:blank", "_blank");

    mutation.mutate(patientId, {
      onSuccess: (response) => {
        const parchmentPatientId = response.data?.parchmentPatientId;
        if (!parchmentPatientId) {
          toast.error("Parchment did not return a patient identifier");
          if (pendingTabRef.current) pendingTabRef.current.close();
          pendingTabRef.current = null;
          return;
        }
        const url = buildParchmentPatientUrl(parchmentPatientId);
        if (pendingTabRef.current && !pendingTabRef.current.closed) {
          pendingTabRef.current.location.href = url;
          pendingTabRef.current.focus();
        } else {
          // Tab was blocked or closed — fall back to a normal open.
          window.open(url, "_blank", "noopener,noreferrer");
        }
        pendingTabRef.current = null;
        // Refresh patient details so the newly linked Parchment ID is reflected locally.
        if (response.data?.created) {
          queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }
        toast.success(
          response.data?.created
            ? "Patient created in Parchment"
            : "Opened Parchment in a new tab"
        );
        onOpenChange(false);
      },
      onError: (error) => {
        if (pendingTabRef.current && !pendingTabRef.current.closed) {
          pendingTabRef.current.close();
        }
        pendingTabRef.current = null;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to start a Parchment prescribing session"
        );
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isLoading) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!isLoading} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
              <SquarePen className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>Redirect to Parchment</DialogTitle>
              <DialogDescription>
                You&apos;re about to be redirected to the Parchment platform to
                prescribe for{" "}
                <span className="font-medium text-foreground">
                  {patientName || "this patient"}
                </span>
                . A new tab will open once the patient session is ready.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-6 text-center"
          >
            <div className="relative flex size-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
              <SquarePen className="size-5" />
              <Loader2 className="absolute inset-0 m-auto size-12 animate-spin text-primary/70" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">
                Connecting to Parchment…
              </p>
              <p className="text-xs text-muted-foreground">
                Preparing the patient record. This usually takes a few seconds.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleAcknowledge} disabled={!patientId || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Opening Parchment…
              </>
            ) : (
              <>
                <ExternalLink className="size-4" />
                Acknowledge &amp; continue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
