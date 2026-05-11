"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RECORD_ACTIVITY_STEP_ENTITY_TYPES,
  RECORD_ACTIVITY_STEP_TYPES,
  type RecordActivityStep,
  type RecordActivityStepEntityType,
  type RecordActivityStepType,
  type WorkflowStep,
} from "@/types";
import { Field, TemplatedField } from "../Field";
import { StepIdField } from "./shared";
import type { StepFormProps } from "./types";

export function RecordActivityForm(props: StepFormProps<RecordActivityStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Patient id"
        value={step.patientId ?? ""}
        onChange={(v) => onChange({ ...step, patientId: v })}
        error={errors?.patientId}
      />
      <Field label="Type" error={errors?.type}>
        <Select
          value={step.type ?? ""}
          onValueChange={(v) => {
            if (v) onChange({ ...step, type: v as RecordActivityStepType });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select activity type" />
          </SelectTrigger>
          <SelectContent>
            {RECORD_ACTIVITY_STEP_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Entity type" error={errors?.entityType}>
        <Select
          value={step.entityType ?? ""}
          onValueChange={(v) => {
            if (v)
              onChange({
                ...step,
                entityType: v as RecordActivityStepEntityType,
              });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select entity type" />
          </SelectTrigger>
          <SelectContent>
            {RECORD_ACTIVITY_STEP_ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <TemplatedField
        label="Title"
        value={step.title ?? ""}
        onChange={(v) => onChange({ ...step, title: v })}
        error={errors?.title}
      />
      <TemplatedField
        label="Description (optional)"
        value={step.description ?? ""}
        onChange={(v) => onChange({ ...step, description: v })}
        multiline
        rows={3}
        error={errors?.description}
      />
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}
