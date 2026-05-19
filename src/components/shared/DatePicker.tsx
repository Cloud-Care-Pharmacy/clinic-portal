"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Parse an ISO `YYYY-MM-DD` string as a local-time Date (avoids UTC shift).
 */
function parseIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Format a Date back to ISO `YYYY-MM-DD` using its local components.
 */
function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface DatePickerProps {
  /** ISO date string `YYYY-MM-DD`. */
  value?: string | null;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  /** ISO `YYYY-MM-DD` minimum (inclusive). */
  min?: string;
  /** ISO `YYYY-MM-DD` maximum (inclusive). */
  max?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  className?: string;
  /** Locale string passed to `toLocaleDateString`. Defaults to `en-AU`. */
  locale?: string;
}

export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  min,
  max,
  disabled,
  ariaInvalid,
  className,
  locale = "en-AU",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseIsoDate(value);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-10 w-full min-w-0 items-center justify-between rounded-sm border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">
          {selected
            ? selected.toLocaleDateString(locale, {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : placeholder}
        </span>
        <CalendarIcon className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(formatIsoDate(date));
              setOpen(false);
            }
          }}
          defaultMonth={selected ?? minDate ?? new Date()}
          disabled={
            minDate || maxDate
              ? (date) =>
                  (minDate ? date < minDate : false) ||
                  (maxDate ? date > maxDate : false)
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
}
