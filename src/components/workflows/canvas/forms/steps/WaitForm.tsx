"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WaitStep, WorkflowStep } from "@/types";
import { Field } from "../Field";
import { StepIdField } from "./shared";
import type { StepFormProps } from "./types";

const WAIT_UNITS = [
  { value: "seconds", label: "Seconds", multiplier: 1 },
  { value: "minutes", label: "Minutes", multiplier: 60 },
  { value: "hours", label: "Hours", multiplier: 3600 },
  { value: "days", label: "Days", multiplier: 86_400 },
] as const;

type WaitUnit = (typeof WAIT_UNITS)[number]["value"];

const MAX_WAIT_SECONDS = 2_592_000;

function pickWaitUnit(seconds: number): WaitUnit {
  if (seconds > 0 && seconds % 86_400 === 0) return "days";
  if (seconds > 0 && seconds % 3600 === 0) return "hours";
  if (seconds > 0 && seconds % 60 === 0) return "minutes";
  return "seconds";
}

export function WaitForm(props: StepFormProps<WaitStep>) {
  const { step, onChange, errors } = props;
  const seconds = step.seconds ?? 0;
  const [unit, setUnit] = useState<WaitUnit>(() => pickWaitUnit(seconds));
  const multiplier = WAIT_UNITS.find((u) => u.value === unit)?.multiplier ?? 1;
  const amount = multiplier > 0 ? Math.floor(seconds / multiplier) : 0;
  const maxAmount = Math.floor(MAX_WAIT_SECONDS / multiplier);

  return (
    <>
      <Field label="Amount" error={errors?.seconds}>
        <Input
          type="number"
          min={1}
          max={maxAmount}
          value={amount || ""}
          onChange={(e) => {
            const next = Number(e.target.value) || 0;
            onChange({ ...step, seconds: next * multiplier });
          }}
        />
      </Field>
      <Field label="Unit">
        <Select
          value={unit}
          onValueChange={(v) => {
            if (!v) return;
            const nextUnit = v as WaitUnit;
            const nextMultiplier =
              WAIT_UNITS.find((u) => u.value === nextUnit)?.multiplier ?? 1;
            setUnit(nextUnit);
            onChange({ ...step, seconds: amount * nextMultiplier });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {WAIT_UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <p className="mb-4 -mt-2 text-[11px] text-muted-foreground">
        Note: The maximum duration per step is 30 days.
      </p>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}
