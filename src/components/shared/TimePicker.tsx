"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  /** `HH:MM` 24-hour string. */
  value?: string | null;
  onChange: (value: string) => void;
  id?: string;
  /** Minute granularity. Defaults to 15. */
  step?: 5 | 10 | 15 | 30 | 60;
  /** Display as 12-hour (am/pm). Underlying value stays `HH:MM` 24-hour. */
  display?: "12h" | "24h";
  placeholder?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  className?: string;
  /** Inclusive lower bound `HH:MM`. */
  min?: string;
  /** Inclusive upper bound `HH:MM`. */
  max?: string;
}

function format12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${mStr} ${period}`;
}

function compareTimes(a: string, b: string): number {
  return a.localeCompare(b);
}

export function TimePicker({
  value,
  onChange,
  id,
  step = 15,
  display = "24h",
  placeholder = "Pick a time",
  disabled,
  ariaInvalid,
  className,
  min,
  max,
}: TimePickerProps) {
  const options = React.useMemo(() => {
    const out: string[] = [];
    for (let total = 0; total < 24 * 60; total += step) {
      const h = Math.floor(total / 60);
      const m = total % 60;
      const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      if (min && compareTimes(hhmm, min) < 0) continue;
      if (max && compareTimes(hhmm, max) > 0) continue;
      out.push(hhmm);
    }
    return out;
  }, [step, min, max]);

  // Ensure current value is selectable even if it's outside the standard step grid.
  const allOptions = React.useMemo(() => {
    if (value && !options.includes(value)) {
      return [...options, value].sort(compareTimes);
    }
    return options;
  }, [options, value]);

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid}
        className={cn("tabular-nums", className)}
      >
        <Clock className="size-4 shrink-0 opacity-50" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {allOptions.map((opt) => (
          <SelectItem key={opt} value={opt} className="tabular-nums">
            {display === "12h" ? format12h(opt) : opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
