"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { SIG_QUICK_FILLS } from "./data";
import { RxFlagToggle } from "./RxFlagToggle";
import {
  isMedValid,
  MAX_REPEATS,
  MED_FORMS,
  type Medication,
  type MedForm,
} from "./types";

export interface RxMedCardProps {
  med: Medication;
  editing: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (next: Medication) => void;
  onRemove: () => void;
}

const SUB_LABEL_CLASS =
  "text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground";

const INPUT_CLASS =
  "h-9 rounded-sm border-border bg-background text-[13px] focus-visible:border-primary";

/**
 * Single medication row. Renders a compact summary by default; expands inline
 * with full edit controls when `editing` is true.
 */
export function RxMedCard({
  med,
  editing,
  onOpen,
  onClose,
  onChange,
  onRemove,
}: RxMedCardProps) {
  const sigRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize the SIG textarea to fit content while editing.
  useEffect(() => {
    if (!editing) return;
    const el = sigRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 60)}px`;
  }, [editing, med.sig]);

  const valid = isMedValid(med);
  const scheduleClass =
    med.schedule === "S4"
      ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
      : "border-status-info-border bg-status-info-bg text-status-info-fg";

  const summary = (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold text-foreground">
            {med.name || "Unnamed medication"}
          </span>
          {med.strength && (
            <span className="text-[13.5px] font-semibold text-foreground">
              {med.strength}
            </span>
          )}
          <ChipTag>{med.form.toLowerCase()}</ChipTag>
          <ChipTag className={scheduleClass}>{med.schedule}</ChipTag>
          {med.authority && (
            <ChipTag className="border-status-warning-border bg-status-warning-bg text-status-warning-fg">
              Authority
            </ChipTag>
          )}
          {med.pbs && (
            <ChipTag className="border-status-success-border bg-status-success-bg text-status-success-fg">
              PBS
            </ChipTag>
          )}
        </div>
        <p className="line-clamp-1 text-[12.5px] text-muted-foreground">
          {summarySig(med.sig) || "No directions yet"}
          {med.qty && (
            <>
              <span className="px-1.5 text-muted-foreground/60">·</span>
              Qty {med.qty}
            </>
          )}
          {med.repeats && (
            <>
              <span className="px-1.5 text-muted-foreground/60">·</span>
              {med.repeats} repeats
            </>
          )}
        </p>
        {!valid && !editing && (
          <p className="text-[11px] font-medium text-destructive">
            Missing required details
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!editing && (
          <button
            type="button"
            onClick={onOpen}
            aria-label="Edit medication"
            className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label="Remove medication"
          className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-sm border bg-popover transition-colors",
        editing
          ? "border-primary/45 shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_12%,transparent)]"
          : "border-border hover:bg-muted/40"
      )}
    >
      {editing ? (
        <button
          type="button"
          onClick={onClose}
          className="block w-full cursor-default text-left"
          aria-expanded
        >
          {summary}
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="block w-full text-left"
          aria-expanded={false}
        >
          {summary}
        </button>
      )}

      {editing && (
        <div className="border-t border-border px-3 pb-3 pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_140px]">
            <Field label="Medication">
              <Input
                value={med.name}
                onChange={(event) => onChange({ ...med, name: event.target.value })}
                className={INPUT_CLASS}
                aria-invalid={!med.name.trim()}
              />
            </Field>
            <Field label="Strength">
              <Input
                value={med.strength}
                onChange={(event) => onChange({ ...med, strength: event.target.value })}
                placeholder="e.g. 20 mg/mL"
                className={INPUT_CLASS}
                aria-invalid={!med.strength.trim()}
              />
            </Field>
            <Field label="Form">
              <div className="relative">
                <select
                  value={med.form}
                  onChange={(event) =>
                    onChange({
                      ...med,
                      form: event.target.value as MedForm,
                    })
                  }
                  className={cn(
                    INPUT_CLASS,
                    "w-full appearance-none border bg-background pr-8 pl-3 text-[13px] outline-none transition-colors focus:border-primary"
                  )}
                >
                  {MED_FORMS.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Direction (SIG)">
              <Textarea
                ref={sigRef}
                value={med.sig}
                onChange={(event) => onChange({ ...med, sig: event.target.value })}
                placeholder="Patient instructions"
                className="min-h-[60px] resize-y rounded-sm border-border bg-background text-[13px] leading-snug focus-visible:border-primary"
                aria-invalid={!med.sig.trim()}
              />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SIG_QUICK_FILLS.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...med,
                      sig: appendSig(med.sig, phrase),
                    })
                  }
                  className="inline-flex h-7 items-center rounded-sm border border-border bg-popover px-2.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  + {phrase}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                value={med.qty}
                onChange={(event) => onChange({ ...med, qty: event.target.value })}
                onBlur={(event) => {
                  const n = Number.parseInt(event.target.value, 10);
                  if (!Number.isFinite(n) || n < 1) {
                    onChange({ ...med, qty: "1" });
                  }
                }}
                className={INPUT_CLASS}
                aria-invalid={
                  !Number.isFinite(Number.parseInt(med.qty, 10)) ||
                  Number.parseInt(med.qty, 10) < 1
                }
              />
            </Field>
            <Field label="Repeats">
              <Input
                type="number"
                min={0}
                max={MAX_REPEATS}
                inputMode="numeric"
                value={med.repeats}
                onChange={(event) => onChange({ ...med, repeats: event.target.value })}
                onBlur={(event) => {
                  const n = Number.parseInt(event.target.value, 10);
                  if (!Number.isFinite(n) || n < 0) {
                    onChange({ ...med, repeats: "0" });
                  } else if (n > MAX_REPEATS) {
                    onChange({ ...med, repeats: String(MAX_REPEATS) });
                  }
                }}
                className={INPUT_CLASS}
              />
              {Number.parseInt(med.repeats, 10) > MAX_REPEATS && (
                <p className="mt-1 text-[11px] text-destructive">
                  Max {MAX_REPEATS} repeats
                </p>
              )}
            </Field>
          </div>

          <div className="mt-3">
            <span className={SUB_LABEL_CLASS}>Flags</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <RxFlagToggle
                label="PBS subsidised"
                checked={med.pbs}
                onChange={(v) => onChange({ ...med, pbs: v })}
              />
              <RxFlagToggle
                label="Allow brand substitution"
                checked={med.brandSub}
                onChange={(v) => onChange({ ...med, brandSub: v })}
              />
              <RxFlagToggle
                label="Authority required"
                tone="warning"
                checked={med.authority}
                onChange={(v) => onChange({ ...med, authority: v })}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 rounded-sm px-3 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 rounded-sm px-3 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="h-8 rounded-sm px-3 text-xs font-medium"
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={SUB_LABEL_CLASS}>{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ChipTag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-border bg-muted px-1.5 py-px text-[10.5px] font-medium uppercase leading-none tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

function summarySig(sig: string): string {
  const trimmed = sig.trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 99)}…`;
}

function appendSig(current: string, phrase: string): string {
  if (!current.trim()) return phrase;
  return `${current.trimEnd()} ${phrase}`;
}
