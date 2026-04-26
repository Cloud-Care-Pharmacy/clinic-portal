"use client";

import { Pill } from "lucide-react";
import { AppSheet } from "@/components/shared/AppSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ParchmentPrescription, PrescriptionMedication } from "@/types";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatPrescriptionReference(
  prescription: ParchmentPrescription
): string {
  return `RX-${prescription.id.slice(-6).toUpperCase()}`;
}

function MedicationRow({ medication }: { medication: PrescriptionMedication }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-status-accent-border bg-status-accent-bg text-status-accent-fg">
          <Pill className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground wrap-break-word">
              {medication.name}
            </p>
            {medication.dosage && (
              <p className="text-xs text-muted-foreground mt-0.5 wrap-break-word">
                {medication.dosage}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Quantity</dt>
            <dd className="text-right tabular-nums">{medication.quantity ?? "—"}</dd>
            <dt className="text-muted-foreground">Repeats</dt>
            <dd className="text-right tabular-nums">{medication.repeats ?? 0}</dd>
            <dt className="text-muted-foreground">Schedule</dt>
            <dd className="text-right wrap-break-word">{medication.schedule ?? "—"}</dd>
            <dt className="text-muted-foreground">PBS code</dt>
            <dd className="text-right wrap-break-word">{medication.pbsCode ?? "—"}</dd>
          </dl>
          {medication.notes && (
            <p className="text-xs text-muted-foreground wrap-break-word">
              {medication.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PrescriptionDetailSheet({
  prescription,
  onClose,
}: {
  prescription: ParchmentPrescription | null;
  onClose: () => void;
}) {
  if (!prescription) return null;

  const reference = formatPrescriptionReference(prescription);

  return (
    <AppSheet
      open={!!prescription}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={reference}
      description={`Prescription issued ${formatDate(prescription.issuedAt)}`}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <StatusBadge status={prescription.status} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Items</p>
            <p className="mt-1 font-medium tabular-nums">
              {prescription.medications.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prescribed by</p>
            <p className="mt-1 font-medium wrap-break-word">
              {prescription.prescriberName ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="mt-1 font-medium tabular-nums">
              {formatDate(prescription.expiresAt)}
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Medications in this prescription
            </h3>
            <p className="text-xs text-muted-foreground">
              Review each item included in the selected prescription.
            </p>
          </div>
          <div className="space-y-3">
            {prescription.medications.map((medication) => (
              <MedicationRow key={medication.id} medication={medication} />
            ))}
          </div>
        </section>

        {prescription.notes && (
          <section className="rounded-xl border border-border bg-card p-3">
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            <p className="mt-1 text-sm text-muted-foreground wrap-break-word">
              {prescription.notes}
            </p>
          </section>
        )}
      </div>
    </AppSheet>
  );
}
