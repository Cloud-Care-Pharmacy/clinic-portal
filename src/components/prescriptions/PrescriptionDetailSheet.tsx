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
import type { PatientPrescription, PrescriptionMedication } from "@/types";

export { formatPrescriptionReference } from "@/lib/prescriptions";

function MedicationCard({ med }: { med: PrescriptionMedication }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-8  shrink-0 items-center justify-center rounded-lg border border-status-accent-border bg-status-accent-bg text-status-accent-fg">
          <Pill className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-sm font-medium text-foreground wrap-break-word">
              {med.name}
              {med.strength ? (
                <span className="text-muted-foreground"> · {med.strength}</span>
              ) : null}
            </p>
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              {med.schedule}
            </span>
          </div>
          <p className="text-xs text-foreground/90 wrap-break-word">{med.sig}</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Form</dt>
            <dd className="text-right capitalize">{med.form}</dd>
            <dt className="text-muted-foreground">Route</dt>
            <dd className="text-right capitalize">{med.routeAdministration}</dd>
            <dt className="text-muted-foreground">Quantity</dt>
            <dd className="text-right tabular-nums">{med.qty}</dd>
            <dt className="text-muted-foreground">Repeats</dt>
            <dd className="text-right tabular-nums">{med.repeats}</dd>
            <dt className="text-muted-foreground">PBS</dt>
            <dd className="text-right">
              {med.pbs ? (med.pbsCode ?? "Yes") : "No"}
            </dd>
            <dt className="text-muted-foreground">Authority</dt>
            <dd className="text-right">{med.authority ? "Yes" : "No"}</dd>
            <dt className="text-muted-foreground">Brand sub.</dt>
            <dd className="text-right">{med.brandSub ? "Allowed" : "Not allowed"}</dd>
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
  const detailPrescription = data?.data?.prescription ?? stash;
  const meds = detailPrescription?.medications ?? [];

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
            {stash.consultationId && (
              <div>
                <p className="text-xs text-muted-foreground">Consultation</p>
                <p className="mt-1 font-mono text-xs wrap-break-word">
                  {stash.consultationId}
                </p>
              </div>
            )}
          </div>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Medications</h3>
              <p className="text-xs text-muted-foreground">
                Line items on this prescription.
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : error ? (
              <p className="text-destructive text-sm">
                Medication detail unavailable, try again or contact support.
              </p>
            ) : meds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No medications recorded on this prescription.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {meds.map((med) => (
                  <MedicationCard key={med.id} med={med} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </AppSheet>
  );
}
