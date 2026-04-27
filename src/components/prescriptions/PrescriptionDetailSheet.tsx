"use client";

import { Pill } from "lucide-react";
import { AppSheet } from "@/components/shared/AppSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import { usePrescription } from "@/lib/hooks/use-prescriptions";
import {
  formatPrescriptionDate,
  formatPrescriptionReference,
} from "@/lib/prescriptions";
import type { ParchmentPrescriptionDetail, PatientPrescription } from "@/types";

export { formatPrescriptionReference } from "@/lib/prescriptions";

function MedicationCard({ detail }: { detail: ParchmentPrescriptionDetail }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-status-accent-border bg-status-accent-bg text-status-accent-fg">
          <Pill className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground wrap-break-word">
              {detail.itemName ?? detail.type ?? "Prescription item"}
            </p>
            {detail.type && detail.itemName && (
              <p className="text-xs text-muted-foreground mt-0.5 wrap-break-word">
                {detail.type}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Quantity</dt>
            <dd className="text-right tabular-nums">{detail.quantity ?? "—"}</dd>
            <dt className="text-muted-foreground">Repeats</dt>
            <dd className="text-right tabular-nums">
              {detail.repeatsAuthorised ?? "—"}
            </dd>
            <dt className="text-muted-foreground">Interval</dt>
            <dd className="text-right wrap-break-word">
              {detail.repeatIntervals ?? "—"}
            </dd>
            <dt className="text-muted-foreground">PBS code</dt>
            <dd className="text-right wrap-break-word">{detail.pbsCode ?? "—"}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function PrescriptionDetailSheet({
  patientId,
  prescription,
  onClose,
}: {
  patientId: string;
  prescription: PatientPrescription | null;
  onClose: () => void;
}) {
  const stash = useLastDefined(prescription);
  const { data, isLoading, error } = usePrescription(patientId, prescription?.id);
  const reference = stash ? formatPrescriptionReference(stash) : "";
  const detail = data?.data?.parchment ?? null;

  return (
    <AppSheet
      open={!!prescription}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={reference}
      description={
        stash
          ? `Prescription dated ${formatPrescriptionDate(stash.prescriptionDate)}`
          : ""
      }
    >
      {stash ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={stash.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prescribed</p>
              <p className="mt-1 font-medium tabular-nums">
                {formatPrescriptionDate(stash.prescriptionDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prescribed by</p>
              <p className="mt-1 font-medium wrap-break-word">
                {stash.prescriberName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Parchment ID</p>
              <p className="mt-1 font-mono text-xs wrap-break-word">
                {stash.parchmentPrescriptionId}
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Medication</h3>
              <p className="text-xs text-muted-foreground">
                Live detail fetched from Parchment.
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : error ? (
              <p className="text-destructive text-sm">
                Medication detail unavailable — try again or contact support.
              </p>
            ) : detail ? (
              <MedicationCard detail={detail} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Medication detail unavailable — try again or contact support.
              </p>
            )}
            {detail?.url && (
              <a
                href={detail.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Open in Parchment
              </a>
            )}
          </section>
        </div>
      ) : null}
    </AppSheet>
  );
}
