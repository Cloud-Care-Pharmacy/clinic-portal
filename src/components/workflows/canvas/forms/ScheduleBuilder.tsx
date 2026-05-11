"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Field } from "./Field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cronWarnings } from "../lib/workflow-schema";
import { cn } from "@/lib/utils";

type Mode = "minutes" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

interface ScheduleBuilderProps {
  cron: string;
  onChange: (cron: string) => void;
  error?: string;
}

const MODE_OPTIONS: { value: Mode; label: string; description: string }[] = [
  { value: "minutes", label: "Every few minutes", description: "Fixed interval" },
  { value: "hourly", label: "Every hour", description: "At a chosen minute" },
  { value: "daily", label: "Every day", description: "At a chosen time" },
  { value: "weekly", label: "Every week", description: "On a chosen weekday" },
  { value: "monthly", label: "Every month", description: "On a chosen day" },
  { value: "custom", label: "Custom (cron)", description: "Raw 5-field cron" },
];

const MINUTE_INTERVALS = [5, 10, 15, 20, 30] as const;
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function hourLabel(h: number): string {
  if (h === 0) return "12:00 AM (midnight)";
  if (h === 12) return "12:00 PM (noon)";
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

function minuteLabel(m: number): string {
  return `:${pad(m)}`;
}

interface Decoded {
  mode: Mode;
  intervalMinutes: number;
  minute: number;
  hour: number;
  dayOfWeek: number;
  dayOfMonth: number;
  excludeWeekends: boolean;
}

const DEFAULTS: Decoded = {
  mode: "daily",
  intervalMinutes: 5,
  minute: 0,
  hour: 9,
  dayOfWeek: 1,
  dayOfMonth: 1,
  excludeWeekends: false,
};

/** Best-effort cron → friendly state. Falls back to "custom" mode. */
function decodeCron(cron: string): Decoded {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return { ...DEFAULTS, mode: "custom" };
  const [m, h, dom, mon, dow] = parts;

  // Every N minutes: */N * * * *  (and weekday-restricted variant)
  const intervalMatch = /^\*\/(\d+)$/.exec(m);
  if (intervalMatch && h === "*" && dom === "*" && mon === "*") {
    const interval = Number(intervalMatch[1]);
    if (MINUTE_INTERVALS.includes(interval as (typeof MINUTE_INTERVALS)[number])) {
      if (dow === "*" || dow === "1-5") {
        return {
          ...DEFAULTS,
          mode: "minutes",
          intervalMinutes: interval,
          excludeWeekends: dow === "1-5",
        };
      }
    }
  }

  const numericMinute = /^\d+$/.test(m) ? Number(m) : NaN;
  const numericHour = /^\d+$/.test(h) ? Number(h) : NaN;

  // Hourly: M * * * *
  if (
    !Number.isNaN(numericMinute) &&
    h === "*" &&
    dom === "*" &&
    mon === "*" &&
    (dow === "*" || dow === "1-5") &&
    MINUTE_OPTIONS.includes(numericMinute)
  ) {
    return {
      ...DEFAULTS,
      mode: "hourly",
      minute: numericMinute,
      excludeWeekends: dow === "1-5",
    };
  }

  // Daily: M H * * *  (or 1-5 for weekdays)
  if (
    !Number.isNaN(numericMinute) &&
    !Number.isNaN(numericHour) &&
    dom === "*" &&
    mon === "*" &&
    (dow === "*" || dow === "1-5") &&
    MINUTE_OPTIONS.includes(numericMinute) &&
    HOUR_OPTIONS.includes(numericHour)
  ) {
    return {
      ...DEFAULTS,
      mode: "daily",
      minute: numericMinute,
      hour: numericHour,
      excludeWeekends: dow === "1-5",
    };
  }

  // Weekly: M H * * D  (single weekday)
  const numericDow = /^\d+$/.test(dow) ? Number(dow) : NaN;
  if (
    !Number.isNaN(numericMinute) &&
    !Number.isNaN(numericHour) &&
    dom === "*" &&
    mon === "*" &&
    !Number.isNaN(numericDow) &&
    numericDow >= 0 &&
    numericDow <= 6 &&
    MINUTE_OPTIONS.includes(numericMinute) &&
    HOUR_OPTIONS.includes(numericHour)
  ) {
    return {
      ...DEFAULTS,
      mode: "weekly",
      minute: numericMinute,
      hour: numericHour,
      dayOfWeek: numericDow,
    };
  }

  // Monthly: M H D * *
  const numericDom = /^\d+$/.test(dom) ? Number(dom) : NaN;
  if (
    !Number.isNaN(numericMinute) &&
    !Number.isNaN(numericHour) &&
    !Number.isNaN(numericDom) &&
    numericDom >= 1 &&
    numericDom <= 31 &&
    mon === "*" &&
    dow === "*" &&
    MINUTE_OPTIONS.includes(numericMinute) &&
    HOUR_OPTIONS.includes(numericHour)
  ) {
    return {
      ...DEFAULTS,
      mode: "monthly",
      minute: numericMinute,
      hour: numericHour,
      dayOfMonth: numericDom,
    };
  }

  return { ...DEFAULTS, mode: "custom" };
}

function encodeCron(state: Decoded): string {
  const dow = state.excludeWeekends ? "1-5" : "*";
  switch (state.mode) {
    case "minutes":
      return `*/${state.intervalMinutes} * * * ${dow}`;
    case "hourly":
      return `${state.minute} * * * ${dow}`;
    case "daily":
      return `${state.minute} ${state.hour} * * ${dow}`;
    case "weekly":
      return `${state.minute} ${state.hour} * * ${state.dayOfWeek}`;
    case "monthly":
      return `${state.minute} ${state.hour} ${state.dayOfMonth} * *`;
    case "custom":
      return ""; // handled by raw input
  }
}

function describe(state: Decoded): string {
  const time = `${pad(state.hour)}:${pad(state.minute)} UTC`;
  const weekendNote = state.excludeWeekends ? ", weekdays only" : "";
  switch (state.mode) {
    case "minutes":
      return `Runs every ${state.intervalMinutes} minutes${weekendNote}.`;
    case "hourly":
      return `Runs at minute ${pad(state.minute)} of every hour${weekendNote}.`;
    case "daily":
      return `Runs daily at ${time}${weekendNote}.`;
    case "weekly": {
      const day = WEEKDAYS.find((d) => d.value === state.dayOfWeek)?.label ?? "";
      return `Runs every ${day} at ${time}.`;
    }
    case "monthly":
      return `Runs on day ${state.dayOfMonth} of every month at ${time}.`;
    case "custom":
      return "Custom cron expression.";
  }
}

export function ScheduleBuilder({ cron, onChange, error }: ScheduleBuilderProps) {
  // `mode` is a user-driven UI choice that may not be perfectly inferrable from
  // a cron string (e.g. "0 9 * * *" decodes to "daily" but the user may have
  // selected "custom"). Track it explicitly; everything else is derived.
  const decoded = useMemo(() => decodeCron(cron), [cron]);
  const [explicitMode, setExplicitMode] = useState<Mode | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const mode: Mode = explicitMode ?? decoded.mode;
  const state: Decoded = { ...decoded, mode };

  function update(patch: Partial<Decoded>) {
    const next = { ...state, ...patch };
    if (next.mode !== "custom") {
      onChange(encodeCron(next));
    }
  }

  function setMode(nextMode: Mode) {
    setExplicitMode(nextMode);
    if (nextMode === "custom") {
      if (!cron) onChange("*/5 * * * *");
      return;
    }
    onChange(encodeCron({ ...state, mode: nextMode }));
  }

  const supportsWeekendToggle =
    mode === "minutes" || mode === "hourly" || mode === "daily";

  const warnings = useMemo(() => (cron ? cronWarnings(cron) : []), [cron]);

  return (
    <div className="space-y-0">
      <Field label="Frequency">
        <Select value={state.mode} onValueChange={(v) => v && setMode(v as Mode)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex flex-col text-left">
                  <span>{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {opt.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {state.mode === "minutes" && (
        <Field label="Interval">
          <Select
            value={String(state.intervalMinutes)}
            onValueChange={(v) => v && update({ intervalMinutes: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTE_INTERVALS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Every {n} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {state.mode === "hourly" && (
        <Field label="Minute of the hour">
          <Select
            value={String(state.minute)}
            onValueChange={(v) => v && update({ minute: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTE_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {minuteLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {(state.mode === "daily" ||
        state.mode === "weekly" ||
        state.mode === "monthly") && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hour">
            <Select
              value={String(state.hour)}
              onValueChange={(v) => v && update({ hour: Number(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {hourLabel(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Minute">
            <Select
              value={String(state.minute)}
              onValueChange={(v) => v && update({ minute: Number(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTE_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {minuteLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {state.mode === "weekly" && (
        <Field label="Day of the week">
          <Select
            value={String(state.dayOfWeek)}
            onValueChange={(v) => v && update({ dayOfWeek: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {state.mode === "monthly" && (
        <Field
          label="Day of the month"
          hint="Months without this day (e.g. Feb 30) will be skipped."
        >
          <Select
            value={String(state.dayOfMonth)}
            onValueChange={(v) => v && update({ dayOfMonth: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_MONTH.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Day {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {supportsWeekendToggle && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
          <div className="flex flex-col">
            <span className="text-xs font-medium">Skip weekends</span>
            <span className="text-[11px] text-muted-foreground">
              Run only Monday – Friday (UTC).
            </span>
          </div>
          <Switch
            checked={state.excludeWeekends}
            onCheckedChange={(v) => update({ excludeWeekends: v })}
          />
        </div>
      )}

      {state.mode === "custom" && (
        <Field
          label="Cron expression (UTC)"
          hint="Standard 5-field cron. The evaluator runs every 5 minutes."
          error={error}
        >
          <Input
            value={cron}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0 9 * * *"
            className="font-mono text-xs"
          />
        </Field>
      )}

      <div
        className={cn(
          "mb-3 rounded-md border px-3 py-2 text-[11px]",
          warnings.length > 0
            ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
            : "border-border bg-muted/40 text-muted-foreground"
        )}
      >
        <p className="font-medium text-foreground">{describe(state)}</p>
        {cron && (
          <p className="mt-0.5 font-mono">
            cron: <span className="text-foreground">{cron}</span>
          </p>
        )}
        {warnings.map((w) => (
          <p key={w} className="mt-1">
            {w}
          </p>
        ))}
      </div>

      {state.mode !== "custom" && (
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {showAdvanced ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          Advanced
        </button>
      )}

      {state.mode !== "custom" && showAdvanced && (
        <div className="mt-2">
          <Field
            label="Raw cron (read-only)"
            hint="Switch to Custom (cron) above to edit directly."
          >
            <Input
              readOnly
              value={cron}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
          </Field>
        </div>
      )}

      {error && state.mode !== "custom" && (
        <p className="-mt-1 mb-3 text-[11px] font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
