"use client";

import { Input } from "@/components/ui/input";
import type { LookupPatientConsultationsStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import { Collapsible } from "./shared";
import type { StepFormProps } from "./types";

export function LookupPatientConsultationsForm(
  props: StepFormProps<LookupPatientConsultationsStep>
) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Patient id"
        value={step.patientId ?? ""}
        onChange={(v) => onChange({ ...step, patientId: v })}
        placeholder="{{event.payload.patientId}}"
        error={errors?.patientId}
      />
      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="consultations"
          className="font-mono text-xs"
        />
      </Field>

      <Collapsible label="Filters (optional)">
        <TemplatedField
          label="Status"
          value={step.status ?? ""}
          onChange={(v) => onChange({ ...step, status: v ? v : undefined })}
          placeholder="scheduled"
          error={errors?.status}
        />
        <TemplatedField
          label="Type"
          value={step.type ?? ""}
          onChange={(v) => onChange({ ...step, type: v ? v : undefined })}
          placeholder="initial"
          error={errors?.type}
        />
        <TemplatedField
          label="Doctor id"
          value={step.doctorId ?? ""}
          onChange={(v) => onChange({ ...step, doctorId: v ? v : undefined })}
          placeholder="{{vars.doctorId}}"
          error={errors?.doctorId}
        />
        <TemplatedField
          label="From (ISO date)"
          value={step.from ?? ""}
          onChange={(v) => onChange({ ...step, from: v ? v : undefined })}
          placeholder="2026-01-01"
          error={errors?.from}
        />
        <TemplatedField
          label="To (ISO date)"
          value={step.to ?? ""}
          onChange={(v) => onChange({ ...step, to: v ? v : undefined })}
          placeholder="2026-12-31"
          error={errors?.to}
        />
        <TemplatedField
          label="Sort"
          value={step.sort ?? ""}
          onChange={(v) => onChange({ ...step, sort: v ? v : undefined })}
          placeholder="scheduledAt"
          error={errors?.sort}
        />
        <TemplatedField
          label="Order"
          value={step.order ?? ""}
          onChange={(v) => onChange({ ...step, order: v ? v : undefined })}
          placeholder="asc"
          error={errors?.order}
        />
        <Field label="Limit" error={errors?.limit}>
          <Input
            type="number"
            min={1}
            max={500}
            value={step.limit ?? ""}
            onChange={(e) => {
              const n = e.target.value ? Number(e.target.value) : undefined;
              onChange({
                ...step,
                limit: typeof n === "number" && Number.isFinite(n) ? n : undefined,
              });
            }}
            placeholder="50"
            className="font-mono text-xs"
          />
        </Field>
        <Field label="Offset" error={errors?.offset}>
          <Input
            type="number"
            min={0}
            value={step.offset ?? ""}
            onChange={(e) => {
              const n = e.target.value ? Number(e.target.value) : undefined;
              onChange({
                ...step,
                offset: typeof n === "number" && Number.isFinite(n) ? n : undefined,
              });
            }}
            placeholder="0"
            className="font-mono text-xs"
          />
        </Field>
      </Collapsible>
    </>
  );
}
