"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANCH_OPS, isUnaryBranchOp } from "@/types";
import type { BranchIfStep, WorkflowStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import { StepIdField } from "./shared";
import type { StepFormProps } from "./types";

export function BranchIfForm(props: StepFormProps<BranchIfStep>) {
  const { step, onChange, errors, otherSteps = [] } = props;
  const targets = [{ id: "", label: "(fall through)" }, ...otherSteps];
  return (
    <>
      <TemplatedField
        label="Left"
        value={step.left ?? ""}
        onChange={(v) => onChange({ ...step, left: v })}
        placeholder="{{vars.outreach.outcome}}"
        error={errors?.left}
      />
      <Field label="Operator" error={errors?.op}>
        <Select
          value={step.op}
          onValueChange={(v) => v && onChange({ ...step, op: v as BranchIfStep["op"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANCH_OPS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {!isUnaryBranchOp(step.op) && (
        <TemplatedField
          label="Right"
          value={step.right ?? ""}
          onChange={(v) => onChange({ ...step, right: v })}
          placeholder='"reached"'
          error={errors?.right}
        />
      )}
      <Field label="Goto if true" hint="Pick a step id to jump to.">
        <Select
          value={step.gotoIfTrue ?? ""}
          onValueChange={(v) => onChange({ ...step, gotoIfTrue: v || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="(fall through)" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t.id || "_"} value={t.id || "_none"}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Goto if false">
        <Select
          value={step.gotoIfFalse ?? ""}
          onValueChange={(v) => onChange({ ...step, gotoIfFalse: v || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="(fall through)" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t.id || "_"} value={t.id || "_none"}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}
