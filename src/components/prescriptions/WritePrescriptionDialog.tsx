"use client";

/**
 * Write Prescription — CRM-authored prescription composer.
 *
 * Can be opened from a patient (no consultation context) or from a completed
 * consultation that has NOT been clinically rejected. Posts to
 * `POST /api/patients/{patientId}/prescriptions`.
 *
 * 422 responses ("clinical decision = reject") are surfaced as an inline
 * banner — the caller should additionally disable the trigger button when the
 * consultation outcome is already "reject".
 */

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AppSheet } from "@/components/shared/AppSheet";
import {
  CreatePrescriptionError,
  useCreatePrescription,
} from "@/lib/hooks/use-prescriptions";
import type {
  CreatePrescriptionMedicationInput,
  PrescriptionMedicationForm,
  PrescriptionMedicationRoute,
  PrescriptionMedicationSchedule,
} from "@/types";

const FORMS: readonly PrescriptionMedicationForm[] = [
  "tablet",
  "capsule",
  "liquid",
  "solution",
  "suspension",
  "cream",
  "ointment",
  "gel",
  "spray",
  "inhaler",
  "patch",
  "injection",
  "suppository",
  "drops",
  "other",
];

const ROUTES: readonly PrescriptionMedicationRoute[] = [
  "oral",
  "topical",
  "sublingual",
  "buccal",
  "rectal",
  "vaginal",
  "ophthalmic",
  "otic",
  "nasal",
  "inhaled",
  "intravenous",
  "intramuscular",
  "subcutaneous",
  "transdermal",
  "other",
];

const SCHEDULES: readonly PrescriptionMedicationSchedule[] = ["S3", "S4", "S8"];

const MAX_MEDS = 20;
const MAX_REPEATS = 12;

interface MedDraft {
  id: string;
  name: string;
  strength: string;
  form: PrescriptionMedicationForm;
  schedule: PrescriptionMedicationSchedule;
  sig: string;
  qty: string;
  repeats: string;
  brandSub: boolean;
  pbs: boolean;
  authority: boolean;
  pbsCode: string;
  routeAdministration: PrescriptionMedicationRoute;
}

function draftId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `med_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function blankMed(): MedDraft {
  return {
    id: draftId(),
    name: "",
    strength: "",
    form: "tablet",
    schedule: "S4",
    sig: "",
    qty: "1",
    repeats: "0",
    brandSub: true,
    pbs: false,
    authority: false,
    pbsCode: "",
    routeAdministration: "oral",
  };
}

function validateMed(m: MedDraft): string | null {
  if (!m.name.trim()) return "Drug name is required.";
  if (!m.sig.trim()) return "Directions (sig) are required.";
  const qty = Number.parseInt(m.qty, 10);
  if (!Number.isFinite(qty) || qty < 1) return "Quantity must be an integer ≥ 1.";
  const repeats = Number.parseInt(m.repeats, 10);
  if (!Number.isFinite(repeats) || repeats < 0 || repeats > MAX_REPEATS) {
    return `Repeats must be an integer between 0 and ${MAX_REPEATS}.`;
  }
  return null;
}

function toApiMed(m: MedDraft): CreatePrescriptionMedicationInput {
  return {
    name: m.name.trim(),
    strength: m.strength.trim() || null,
    form: m.form,
    schedule: m.schedule,
    sig: m.sig.trim(),
    qty: Number.parseInt(m.qty, 10),
    repeats: Number.parseInt(m.repeats, 10),
    brandSub: m.brandSub,
    pbs: m.pbs,
    authority: m.authority,
    pbsCode: m.pbs && m.pbsCode.trim() ? m.pbsCode.trim() : null,
    routeAdministration: m.routeAdministration,
  };
}

interface WritePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  /** Optional consultation context. When provided, server enforces the clinical-decision gate. */
  consultationId?: string;
  /** Optional practitioner override (admins only — practitioner callers may not change it). */
  prescriberId?: string | null;
  onCreated?: () => void;
}

export function WritePrescriptionDialog({
  open,
  onOpenChange,
  patientId,
  consultationId,
  prescriberId,
  onCreated,
}: WritePrescriptionDialogProps) {
  const [meds, setMeds] = useState<MedDraft[]>(() => [blankMed()]);
  const [rejectedBanner, setRejectedBanner] = useState(false);
  const create = useCreatePrescription(patientId);

  function updateMed(id: string, patch: Partial<MedDraft>) {
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addMed() {
    setMeds((prev) => (prev.length >= MAX_MEDS ? prev : [...prev, blankMed()]));
  }

  function removeMed(id: string) {
    setMeds((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.id !== id)));
  }

  function reset() {
    setMeds([blankMed()]);
    setRejectedBanner(false);
  }

  function handleClose() {
    if (create.isPending) return;
    onOpenChange(false);
    reset();
  }

  function handleSubmit() {
    for (const m of meds) {
      const err = validateMed(m);
      if (err) {
        toast.error(err);
        return;
      }
    }
    create.mutate(
      {
        consultationId: consultationId ?? null,
        prescriberId: prescriberId ?? undefined,
        medications: meds.map(toApiMed),
      },
      {
        onSuccess: () => {
          toast.success("Prescription created");
          onCreated?.();
          onOpenChange(false);
          reset();
        },
        onError: (err: CreatePrescriptionError) => {
          if (err.isClinicallyRejected) {
            setRejectedBanner(true);
          } else {
            toast.error(err.message);
          }
        },
      }
    );
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else onOpenChange(true);
      }}
      title="Write Prescription"
      description={
        consultationId
          ? "Practitioner-authored prescription tied to this consultation."
          : "Practitioner-authored prescription for this patient."
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create prescription"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {rejectedBanner && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            This consultation was clinically rejected; no prescription can be issued.
          </div>
        )}

        {meds.map((med, index) => (
          <div
            key={med.id}
            className="space-y-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Medication {index + 1}
              </p>
              {meds.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMed(med.id)}
                  disabled={create.isPending}
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor={`name-${med.id}`}>Drug</Label>
                <Input
                  id={`name-${med.id}`}
                  value={med.name}
                  onChange={(e) => updateMed(med.id, { name: e.target.value })}
                  placeholder="e.g. Amoxicillin"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`strength-${med.id}`}>Strength</Label>
                <Input
                  id={`strength-${med.id}`}
                  value={med.strength}
                  onChange={(e) => updateMed(med.id, { strength: e.target.value })}
                  placeholder="e.g. 500 mg"
                />
              </div>

              <div className="space-y-1">
                <Label>Schedule</Label>
                <Select
                  value={med.schedule}
                  onValueChange={(v) => {
                    if (v)
                      updateMed(med.id, {
                        schedule: v as PrescriptionMedicationSchedule,
                      });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Form</Label>
                <Select
                  value={med.form}
                  onValueChange={(v) => {
                    if (v) updateMed(med.id, { form: v as PrescriptionMedicationForm });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMS.map((f) => (
                      <SelectItem key={f} value={f} className="capitalize">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Route</Label>
                <Select
                  value={med.routeAdministration}
                  onValueChange={(v) => {
                    if (v)
                      updateMed(med.id, {
                        routeAdministration: v as PrescriptionMedicationRoute,
                      });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor={`sig-${med.id}`}>Sig (directions)</Label>
                <Textarea
                  id={`sig-${med.id}`}
                  value={med.sig}
                  onChange={(e) => updateMed(med.id, { sig: e.target.value })}
                  placeholder="e.g. Take one tablet by mouth three times daily for 7 days"
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`qty-${med.id}`}>Quantity</Label>
                <Input
                  id={`qty-${med.id}`}
                  type="number"
                  min={1}
                  value={med.qty}
                  onChange={(e) => updateMed(med.id, { qty: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`repeats-${med.id}`}>Repeats (0–{MAX_REPEATS})</Label>
                <Input
                  id={`repeats-${med.id}`}
                  type="number"
                  min={0}
                  max={MAX_REPEATS}
                  value={med.repeats}
                  onChange={(e) => updateMed(med.id, { repeats: e.target.value })}
                />
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-4 pt-1">
                <label
                  htmlFor={`brandSub-${med.id}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={`brandSub-${med.id}`}
                    checked={med.brandSub}
                    onCheckedChange={(v) => updateMed(med.id, { brandSub: v === true })}
                  />
                  Brand substitution allowed
                </label>
                <label
                  htmlFor={`pbs-${med.id}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={`pbs-${med.id}`}
                    checked={med.pbs}
                    onCheckedChange={(v) => updateMed(med.id, { pbs: v === true })}
                  />
                  PBS
                </label>
                <label
                  htmlFor={`authority-${med.id}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={`authority-${med.id}`}
                    checked={med.authority}
                    onCheckedChange={(v) =>
                      updateMed(med.id, { authority: v === true })
                    }
                  />
                  Authority
                </label>
              </div>

              {med.pbs && (
                <div className="col-span-2 space-y-1">
                  <Label htmlFor={`pbsCode-${med.id}`}>PBS code</Label>
                  <Input
                    id={`pbsCode-${med.id}`}
                    value={med.pbsCode}
                    onChange={(e) => updateMed(med.id, { pbsCode: e.target.value })}
                    placeholder="e.g. 1234A"
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={addMed}
          disabled={meds.length >= MAX_MEDS || create.isPending}
          className="w-full gap-1.5"
        >
          <Plus className="size-3.5" />
          Add another medication
        </Button>
      </div>
    </AppSheet>
  );
}
