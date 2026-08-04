"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLINICAL_REVIEW_STATUSES,
  type ClinicalReviewStatus,
  type HasClinicalRecordStep,
} from "@/types";
import { Field, TemplatedField } from "../Field";
import type { StepFormProps } from "./types";

/** Sentinel for "no filter" — Select can't hold an empty-string value. */
const ANY_STATUS = "__any__";

export function HasClinicalRecordForm(
  props: StepFormProps<HasClinicalRecordStep>
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
        label="Review status"
        hint="Only count submissions in this state. “Any” answers the plain “have they submitted?” question; “approved” gates on a reviewed intake."
        error={errors?.reviewStatus}
      >
        <Select
          value={step.reviewStatus ?? ANY_STATUS}
          onValueChange={(v) =>
            onChange({
              ...step,
              reviewStatus:
                v === ANY_STATUS ? undefined : (v as ClinicalReviewStatus),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_STATUS}>Any</SelectItem>
            {CLINICAL_REVIEW_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Store as"
        hint="Branch on {{vars.<storeAs>.hasSubmitted}}, or read {{vars.<storeAs>.latest.clinicalRecordId}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="intake"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}
