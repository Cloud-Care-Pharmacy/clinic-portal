"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Copy, Video, Building2, House, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StickyFormBar } from "@/components/shared/StickyFormBar";
import { useUpdatePractitionerAvailability } from "@/lib/hooks/use-practitioner";
import type {
  AvailabilityDayEntry,
  AvailabilityDayKey,
  AvailabilitySchedule,
  AvailabilitySlot,
  ConsultationModality,
  PractitionerProfile,
} from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK = [
  { label: "Monday", key: "monday" },
  { label: "Tuesday", key: "tuesday" },
  { label: "Wednesday", key: "wednesday" },
  { label: "Thursday", key: "thursday" },
  { label: "Friday", key: "friday" },
  { label: "Saturday", key: "saturday" },
  { label: "Sunday", key: "sunday" },
] as const satisfies ReadonlyArray<{ label: string; key: AvailabilityDayKey }>;

const CONSULT_TYPES = [
  {
    id: "telehealth",
    name: "Telehealth",
    desc: "Video & phone consults",
    icon: Video,
  },
  {
    id: "in_person",
    name: "In-person",
    desc: "Clinic appointments",
    icon: Building2,
  },
  {
    id: "home_visit",
    name: "Home visits",
    desc: "Off-site consultations",
    icon: House,
  },
] as const satisfies ReadonlyArray<{
  id: ConsultationModality;
  name: string;
  desc: string;
  icon: typeof Video;
}>;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_SLOT: AvailabilitySlot = { startTime: "09:00", endTime: "17:00" };
const MAX_SLOTS_PER_DAY = 10;
const MIN_SLOT_MINUTES = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toMinutes(t: string): number | null {
  if (!TIME_REGEX.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isAlignedToGrid(t: string): boolean {
  const m = toMinutes(t);
  if (m == null) return false;
  return m % MIN_SLOT_MINUTES === 0;
}

function formatDuration(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function dayDurationMinutes(slots: AvailabilitySlot[]): number {
  return slots.reduce((acc, s) => {
    const a = toMinutes(s.startTime);
    const b = toMinutes(s.endTime);
    if (a == null || b == null || b <= a) return acc;
    return acc + (b - a);
  }, 0);
}

/**
 * Normalises a schedule entry from either the new multi-slot shape or the
 * legacy single `startTime`/`endTime` fields into a flat list of slots.
 */
function entryToSlots(entry: AvailabilityDayEntry | undefined): AvailabilitySlot[] {
  if (!entry) return [];
  if (entry.slots && entry.slots.length > 0) {
    return entry.slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
  }
  if (entry.enabled && entry.startTime && entry.endTime) {
    return [{ startTime: entry.startTime, endTime: entry.endTime }];
  }
  return [];
}

interface DayForm {
  key: AvailabilityDayKey;
  label: string;
  enabled: boolean;
  slots: AvailabilitySlot[];
  /** Slots stashed when day is toggled off; restored when toggled back on. */
  stash: AvailabilitySlot[];
}

interface AvailabilityFormData {
  timezone: string;
  days: DayForm[];
  consultationTypes: ConsultationModality[];
}

function buildDefaultDays(practitioner: PractitionerProfile | null): DayForm[] {
  const schedule = practitioner?.availability?.schedule ?? {};
  return DAYS_OF_WEEK.map((d) => {
    const entry = schedule[d.key];
    const slots = entryToSlots(entry);
    const enabled = (entry?.enabled ?? false) && slots.length > 0;
    return {
      key: d.key,
      label: d.label,
      enabled,
      slots: enabled ? slots : [],
      stash: !enabled && slots.length > 0 ? slots : [],
    };
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface SlotIssue {
  start?: string;
  end?: string;
  /** Row-level issue (e.g. overlap with another slot). */
  row?: string;
}

interface DayIssues {
  /** Day-level issue (e.g. too many slots). */
  day?: string;
  slots: Record<number, SlotIssue>;
}

const ERROR_OVERLAP =
  "Overlaps another slot. Slots on the same day must not intersect.";
const ERROR_END_BEFORE_START =
  "End time must be after start. Cross-midnight ranges aren't supported — split into two days.";
const ERROR_GRANULARITY = "Times must be on the 15-minute grid (00, 15, 30, 45).";
const ERROR_FORMAT = "Use a valid HH:MM time.";
const ERROR_TOO_SHORT = `Slot must be at least ${MIN_SLOT_MINUTES} minutes long.`;
const ERROR_TOO_MANY = `A day can have at most ${MAX_SLOTS_PER_DAY} time ranges.`;

function validateDay(day: DayForm): DayIssues {
  const issues: DayIssues = { slots: {} };
  if (!day.enabled) return issues;

  if (day.slots.length > MAX_SLOTS_PER_DAY) issues.day = ERROR_TOO_MANY;

  day.slots.forEach((slot, idx) => {
    const slotIssue: SlotIssue = {};
    const startOk = TIME_REGEX.test(slot.startTime);
    const endOk = TIME_REGEX.test(slot.endTime);
    if (!startOk) slotIssue.start = ERROR_FORMAT;
    else if (!isAlignedToGrid(slot.startTime)) slotIssue.start = ERROR_GRANULARITY;
    if (!endOk) slotIssue.end = ERROR_FORMAT;
    else if (!isAlignedToGrid(slot.endTime)) slotIssue.end = ERROR_GRANULARITY;

    if (startOk && endOk) {
      const a = toMinutes(slot.startTime)!;
      const b = toMinutes(slot.endTime)!;
      if (b <= a) slotIssue.row = ERROR_END_BEFORE_START;
      else if (b - a < MIN_SLOT_MINUTES) slotIssue.row = ERROR_TOO_SHORT;
    }
    if (slotIssue.start || slotIssue.end || slotIssue.row) {
      issues.slots[idx] = slotIssue;
    }
  });

  // Overlap detection between slots that already parse correctly.
  const ranges = day.slots
    .map((s, idx) => ({
      idx,
      a: toMinutes(s.startTime),
      b: toMinutes(s.endTime),
    }))
    .filter(
      (r): r is { idx: number; a: number; b: number } =>
        r.a != null && r.b != null && r.b > r.a
    );

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const A = ranges[i];
      const B = ranges[j];
      // Touching (A.end === B.start) is allowed.
      const overlap = A.a < B.b && B.a < A.b;
      if (overlap) {
        if (!issues.slots[A.idx]) issues.slots[A.idx] = {};
        if (!issues.slots[B.idx]) issues.slots[B.idx] = {};
        issues.slots[A.idx].row = ERROR_OVERLAP;
        issues.slots[B.idx].row = ERROR_OVERLAP;
      }
    }
  }

  return issues;
}

function hasAnyIssue(issues: DayIssues): boolean {
  return !!issues.day || Object.keys(issues.slots).length > 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProfileAvailabilityTabProps {
  practitioner: PractitionerProfile | null;
}

const timezoneSchema = z.string().min(1, "Timezone is required");

export function ProfileAvailabilityTab({ practitioner }: ProfileAvailabilityTabProps) {
  const updateAvailability = useUpdatePractitionerAvailability();
  const [activeDay, setActiveDay] = useState(0);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState<Record<AvailabilityDayKey, boolean>>(
    () =>
      DAYS_OF_WEEK.reduce(
        (acc, d) => ({ ...acc, [d.key]: false }),
        {} as Record<AvailabilityDayKey, boolean>
      )
  );

  const form = useForm<AvailabilityFormData>({
    defaultValues: {
      timezone: practitioner?.availability?.timezone ?? "Australia/Sydney",
      days: buildDefaultDays(practitioner),
      consultationTypes: practitioner?.availability?.consultationTypes ?? [],
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: "days" });
  const watchedDays = useWatch({ control: form.control, name: "days" });
  const watchedConsultTypes = useWatch({
    control: form.control,
    name: "consultationTypes",
  });

  useEffect(() => {
    form.reset({
      timezone: practitioner?.availability?.timezone ?? "Australia/Sydney",
      days: buildDefaultDays(practitioner),
      consultationTypes: practitioner?.availability?.consultationTypes ?? [],
    });
  }, [practitioner, form]);

  function setDay(idx: number, updater: (d: DayForm) => DayForm) {
    const current = form.getValues(`days.${idx}`);
    form.setValue(`days.${idx}`, updater(current), {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  function toggleDay(idx: number, next: boolean) {
    setDay(idx, (d) => {
      if (next) {
        const restored = d.stash.length > 0 ? d.stash : [{ ...DEFAULT_SLOT }];
        return { ...d, enabled: true, slots: restored, stash: [] };
      }
      return { ...d, enabled: false, slots: [], stash: d.slots };
    });
  }

  function addSlot(idx: number) {
    setDay(idx, (d) => {
      if (d.slots.length >= MAX_SLOTS_PER_DAY) return d;
      return {
        ...d,
        slots: [...d.slots, { startTime: "09:00", endTime: "10:00" }],
      };
    });
  }

  function removeSlot(idx: number, slotIdx: number) {
    setDay(idx, (d) => ({
      ...d,
      slots: d.slots.filter((_, i) => i !== slotIdx),
    }));
  }

  function updateSlot(
    idx: number,
    slotIdx: number,
    field: "startTime" | "endTime",
    value: string
  ) {
    setDay(idx, (d) => ({
      ...d,
      slots: d.slots.map((s, i) => (i === slotIdx ? { ...s, [field]: value } : s)),
    }));
  }

  function toggleConsultType(id: ConsultationModality) {
    const current = form.getValues("consultationTypes") ?? [];
    const next = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    form.setValue("consultationTypes", next, { shouldDirty: true });
  }

  function openCopyPopover() {
    const fresh = DAYS_OF_WEEK.reduce(
      (acc, d) => ({ ...acc, [d.key]: false }),
      {} as Record<AvailabilityDayKey, boolean>
    );
    // Default-check the next 3 days (Mon → Tue/Wed/Thu pattern from spec).
    for (let offset = 1; offset <= 3; offset++) {
      const tIdx = (activeDay + offset) % DAYS_OF_WEEK.length;
      fresh[DAYS_OF_WEEK[tIdx].key] = true;
    }
    setCopyTargets(fresh);
    setCopyOpen(true);
  }

  function applyCopy() {
    const source = form.getValues(`days.${activeDay}`);
    if (!source) return;
    DAYS_OF_WEEK.forEach((d, i) => {
      if (i === activeDay) return;
      if (!copyTargets[d.key]) return;
      setDay(i, (existing) => ({
        ...existing,
        enabled: source.slots.length > 0,
        slots: source.slots.map((s) => ({ ...s })),
        stash: [],
      }));
    });
    setCopyOpen(false);
  }

  const dayIssues = useMemo(
    () => (watchedDays ?? []).map((d) => validateDay(d)),
    [watchedDays]
  );
  const hasErrors = dayIssues.some(hasAnyIssue);

  const totals = useMemo(() => {
    const days = (watchedDays ?? []).filter(
      (d) => d.enabled && d.slots.length > 0
    ).length;
    const slots = (watchedDays ?? []).reduce(
      (acc, d) => acc + (d.enabled ? d.slots.length : 0),
      0
    );
    return { days, slots };
  }, [watchedDays]);

  const copyCount = Object.values(copyTargets).filter(Boolean).length;

  function onSubmit(data: AvailabilityFormData) {
    const tzResult = timezoneSchema.safeParse(data.timezone);
    if (!tzResult.success) {
      form.setError("timezone", { message: tzResult.error.issues[0]?.message });
      return;
    }
    if (hasErrors) {
      toast.error("Fix the highlighted rows to save.");
      return;
    }

    const schedule = DAYS_OF_WEEK.reduce((acc, day, i) => {
      const row = data.days[i];
      const enabled = !!row?.enabled && row.slots.length > 0;
      if (enabled) {
        acc[day.key] = {
          enabled: true,
          slots: row.slots.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
          })),
          // Mirror first slot to legacy fields for back-compat with older
          // backends that don't yet read `slots`.
          startTime: row.slots[0].startTime,
          endTime: row.slots[0].endTime,
        };
      } else {
        acc[day.key] = { enabled: false, slots: [] };
      }
      return acc;
    }, {} as AvailabilitySchedule);

    updateAvailability.mutate(
      {
        timezone: tzResult.data,
        availability: schedule,
        consultationTypes:
          data.consultationTypes.length > 0
            ? (data.consultationTypes as ConsultationModality[])
            : null,
      },
      {
        onSuccess: () => toast.success("Availability updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  const activeDayValue = watchedDays?.[activeDay];
  const activeDayIssues = dayIssues[activeDay] ?? { slots: {} };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Working hours */}
      <Card>
        <CardHeader>
          <CardTitle>Working hours</CardTitle>
          <CardDescription>
            Pick a day on the left to edit its time ranges on the right. Toggles disable
            a day without losing its slots.
          </CardDescription>
          <CardAction>
            <div className="w-full space-y-2 sm:w-56">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="timezone"
              >
                Timezone
              </label>
              <Input id="timezone" className="h-9" {...form.register("timezone")} />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 overflow-hidden rounded-xl border md:grid-cols-[240px_1fr]">
            {/* Day list */}
            <div className="bg-card md:border-r">
              {fields.map((field, idx) => {
                const value = watchedDays?.[idx];
                const isActive = idx === activeDay;
                const enabled = value?.enabled ?? false;
                const dur = enabled ? dayDurationMinutes(value?.slots ?? []) : 0;
                const dayHasError = hasAnyIssue(dayIssues[idx] ?? { slots: {} });
                return (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => setActiveDay(idx)}
                    className={cn(
                      "relative flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0",
                      isActive
                        ? "bg-primary/5 before:absolute before:left-0 before:top-0 before:h-full before:w-0.75 before:bg-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <Switch
                      checked={enabled}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(checked) => toggleDay(idx, !!checked)}
                      aria-label={`Toggle ${field.label}`}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium",
                        isActive && "text-primary",
                        !enabled && !isActive && "text-muted-foreground"
                      )}
                    >
                      {field.label}
                    </span>
                    {dayHasError ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {enabled ? formatDuration(dur) : "Off"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Editor */}
            <div className="min-h-80 p-6">
              {activeDayValue ? (
                <DayEditor
                  day={activeDayValue}
                  issues={activeDayIssues}
                  activeIdx={activeDay}
                  copyOpen={copyOpen}
                  setCopyOpen={setCopyOpen}
                  copyTargets={copyTargets}
                  setCopyTargets={setCopyTargets}
                  copyCount={copyCount}
                  onAddSlot={() => addSlot(activeDay)}
                  onRemoveSlot={(slotIdx) => removeSlot(activeDay, slotIdx)}
                  onUpdateSlot={(slotIdx, field, value) =>
                    updateSlot(activeDay, slotIdx, field, value)
                  }
                  onOpenCopy={openCopyPopover}
                  onApplyCopy={applyCopy}
                />
              ) : null}
            </div>
          </div>

          {form.formState.isDirty ? (
            <p className="text-xs text-muted-foreground tabular-nums text-right">
              {totals.days} day{totals.days === 1 ? "" : "s"} · {totals.slots} slot
              {totals.slots === 1 ? "" : "s"}
              {hasErrors ? " · fix highlighted rows to save" : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Consultation types */}
      <Card>
        <CardHeader>
          <CardTitle>Consultation types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CONSULT_TYPES.map((t) => {
              const isOn = (watchedConsultTypes ?? []).includes(t.id);
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleConsultType(t.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                    isOn
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leave & unavailability */}
      <Card>
        <CardHeader>
          <CardTitle>Leave &amp; unavailability</CardTitle>
          <CardDescription>
            Block out dates when you&apos;re unavailable for consultations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button type="button" variant="outline" className="border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              Add leave period
            </Button>
            <span className="text-[13px] text-muted-foreground">
              No upcoming leave scheduled.
            </span>
          </div>
        </CardContent>
      </Card>

      <StickyFormBar
        isDirty={form.formState.isDirty}
        isPending={updateAvailability.isPending}
        onDiscard={() => form.reset()}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// DayEditor
// ---------------------------------------------------------------------------

interface DayEditorProps {
  day: DayForm;
  issues: DayIssues;
  activeIdx: number;
  copyOpen: boolean;
  setCopyOpen: (open: boolean) => void;
  copyTargets: Record<AvailabilityDayKey, boolean>;
  setCopyTargets: React.Dispatch<
    React.SetStateAction<Record<AvailabilityDayKey, boolean>>
  >;
  copyCount: number;
  onAddSlot: () => void;
  onRemoveSlot: (slotIdx: number) => void;
  onUpdateSlot: (
    slotIdx: number,
    field: "startTime" | "endTime",
    value: string
  ) => void;
  onOpenCopy: () => void;
  onApplyCopy: () => void;
}

function DayEditor({
  day,
  issues,
  activeIdx,
  copyOpen,
  setCopyOpen,
  copyTargets,
  setCopyTargets,
  copyCount,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
  onOpenCopy,
  onApplyCopy,
}: DayEditorProps) {
  const dur = dayDurationMinutes(day.slots);
  const atCap = day.slots.length >= MAX_SLOTS_PER_DAY;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-semibold">{day.label}</h4>
        <p className="text-sm text-muted-foreground mt-1">
          {day.enabled && day.slots.length > 0
            ? `${day.slots.length} time range${
                day.slots.length === 1 ? "" : "s"
              } · ${formatDuration(dur)}`
            : "This day is currently off — toggle it on or add a time range below to begin."}
        </p>
      </div>

      {issues.day ? (
        <p className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {issues.day}
        </p>
      ) : null}

      {day.enabled && day.slots.length > 0 ? (
        <div className="flex flex-col gap-2 max-w-xl">
          {day.slots.map((slot, slotIdx) => {
            const issue = issues.slots[slotIdx];
            const a = toMinutes(slot.startTime);
            const b = toMinutes(slot.endTime);
            const dMin = a != null && b != null && b > a ? b - a : null;
            return (
              <div key={slotIdx} className="flex flex-col gap-1">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg",
                    issue?.row && "bg-destructive/5 px-2 py-1.5"
                  )}
                >
                  <Input
                    type="time"
                    step={900}
                    value={slot.startTime}
                    aria-invalid={!!issue?.start || !!issue?.row}
                    onChange={(e) => onUpdateSlot(slotIdx, "startTime", e.target.value)}
                    className="h-9 w-33 text-[13px] tabular-nums"
                  />
                  <span className="text-muted-foreground" aria-hidden>
                    &ndash;
                  </span>
                  <Input
                    type="time"
                    step={900}
                    value={slot.endTime}
                    aria-invalid={!!issue?.end || !!issue?.row}
                    onChange={(e) => onUpdateSlot(slotIdx, "endTime", e.target.value)}
                    className="h-9 w-33 text-[13px] tabular-nums"
                  />
                  <span className="ml-2 min-w-15 text-right text-xs tabular-nums text-muted-foreground">
                    {dMin != null ? formatDuration(dMin) : "—"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveSlot(slotIdx)}
                    aria-label="Remove time range"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {issue?.start ? (
                  <p className="ml-1 text-xs text-destructive">{issue.start}</p>
                ) : null}
                {issue?.end ? (
                  <p className="ml-1 text-xs text-destructive">{issue.end}</p>
                ) : null}
                {issue?.row ? (
                  <p className="ml-1 flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {issue.row}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed"
          onClick={onAddSlot}
          disabled={!day.enabled || atCap}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add time range
        </Button>
        {day.enabled && day.slots.length > 0 ? (
          <Popover open={copyOpen} onOpenChange={setCopyOpen}>
            <PopoverTrigger
              render={
                <Button type="button" variant="ghost" size="sm" onClick={onOpenCopy}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy to…
                </Button>
              }
            />
            <PopoverContent align="start" className="w-60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Copy times to
              </p>
              <div className="flex flex-col gap-1">
                {DAYS_OF_WEEK.map((d, i) => {
                  if (i === activeIdx) return null;
                  const checked = !!copyTargets[d.key];
                  return (
                    <label
                      key={d.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setCopyTargets((prev) => ({
                            ...prev,
                            [d.key]: v === true,
                          }))
                        }
                      />
                      <span>{d.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 border-t pt-2 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCopyOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={copyCount === 0}
                  onClick={onApplyCopy}
                >
                  Apply to {copyCount} day{copyCount === 1 ? "" : "s"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}
