"use client";

import { useState, useCallback, useEffect, useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { CalendarIcon, User as UserIcon, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select as UISelect,
  SelectContent as UISelectContent,
  SelectItem as UISelectItem,
  SelectTrigger as UISelectTrigger,
  SelectValue as UISelectValue,
} from "@/components/ui/select";
import { SimpleEditor } from "@/components/shared/SimpleEditor";
import { AppSheet } from "@/components/shared/AppSheet";
import { cn } from "@/lib/utils";
import {
  useCreateConsultation,
  useUpdateConsultation,
} from "@/lib/hooks/use-consultations";
import { usePatientSearch } from "@/lib/hooks/use-patients";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import type {
  Consultation,
  ConsultationStatus,
  ConsultationType,
  ConsultationsListResponse,
  PatientSearchResult,
} from "@/types";

const MINUTE_OPTIONS = ["00", "15", "30", "45"];

const STATUS_LABELS: Record<ConsultationStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

const TYPE_OPTIONS: Array<{
  value: ConsultationType;
  label: string;
  description: string;
  duration: number;
  dotClass: string;
}> = [
  {
    value: "initial",
    label: "Initial",
    description: "First visit · 45 min",
    duration: 45,
    dotClass: "bg-status-info-fg",
  },
  {
    value: "follow-up",
    label: "Follow-up",
    description: "Review · 30 min",
    duration: 30,
    dotClass: "bg-status-accent-fg",
  },
  {
    value: "renewal",
    label: "Renewal",
    description: "Script renewal · 15 min",
    duration: 15,
    dotClass: "bg-status-success-fg",
  },
];

const DURATION_OPTIONS = ["15", "30", "45", "60"];

const DELIVERY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "telehealth-video", label: "Telehealth (video)" },
  { value: "telehealth-phone", label: "Telehealth (phone)" },
  { value: "in-person", label: "In-person" },
];

// Suggested time slots — placeholder until a doctor-availability endpoint exists.
const SUGGESTED_SLOTS: Array<{
  hour: string;
  minute: string;
  period: "AM" | "PM";
  label: string;
}> = [
  { hour: "08", minute: "30", period: "AM", label: "8:30" },
  { hour: "09", minute: "00", period: "AM", label: "9:00" },
  { hour: "10", minute: "15", period: "AM", label: "10:15" },
  { hour: "11", minute: "00", period: "AM", label: "11:00" },
  { hour: "02", minute: "30", period: "PM", label: "2:30" },
  { hour: "04", minute: "00", period: "PM", label: "4:00" },
];

const schema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  doctorName: z.string().min(1, "Doctor name is required"),
  type: z.string().min(1, "Type is required"),
  scheduledAt: z.string().min(1, "Date & time is required"),
  duration: z.string().optional(),
  delivery: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  outcome: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function getTimeParts(value?: string | null) {
  const date = value ? new Date(value) : undefined;
  if (!date || Number.isNaN(date.getTime())) {
    return {
      selectedDate: undefined,
      hour: "09",
      minute: "00",
      period: "AM" as const,
    };
  }

  const hour24 = date.getHours();
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return {
    selectedDate: date,
    hour: String(hour12).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
    period,
  };
}

function getDefaultValues(
  defaultPatientName?: string,
  consultation?: Consultation | null
): FormData {
  return {
    patientName: consultation?.patientName ?? defaultPatientName ?? "",
    doctorName: consultation?.doctorName ?? "",
    type: consultation?.type ?? "initial",
    scheduledAt: consultation?.scheduledAt ?? "",
    duration: consultation?.duration
      ? String(consultation.duration)
      : String(
          TYPE_OPTIONS.find((t) => t.value === (consultation?.type ?? "initial"))
            ?.duration ?? 30
        ),
    delivery: "telehealth-video",
    notes: consultation?.notes ?? "",
    status: consultation?.status ?? "scheduled",
    outcome: consultation?.outcome ?? "",
  };
}

interface NewConsultationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId?: string;
  defaultPatientId?: string;
  defaultPatientName?: string;
  consultation?: Consultation | null;
}

export function NewConsultationSheet({
  open,
  onOpenChange,
  entityId,
  defaultPatientId,
  defaultPatientName,
  consultation: consultationInput,
}: NewConsultationSheetProps) {
  const createConsultation = useCreateConsultation();
  const updateConsultation = useUpdateConsultation();
  const { user } = useUser();
  const currentUserId = user?.id;
  const currentDoctorName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "";
  const formId = useId();
  // Keep the previous consultation visible during the close transition so the
  // sheet can animate out without flashing to the empty "Schedule" form.
  const consultation = useLastDefined(consultationInput);
  const isEditing = Boolean(consultation);
  const initialTimeParts = getTimeParts(consultation?.scheduledAt);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialTimeParts.selectedDate
  );
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(
    null
  );
  const [hour, setHour] = useState(initialTimeParts.hour);
  const [minute, setMinute] = useState(initialTimeParts.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initialTimeParts.period);
  const [conflictPending, setConflictPending] = useState<{
    data: FormData;
    conflicts: Consultation[];
  } | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const form = useForm<FormData>({
    defaultValues: getDefaultValues(defaultPatientName, consultation),
  });
  const patientNameValue = useWatch({ control: form.control, name: "patientName" });
  const doctorNameValue = useWatch({ control: form.control, name: "doctorName" });
  const typeValue = useWatch({ control: form.control, name: "type" });
  const durationValue = useWatch({ control: form.control, name: "duration" });
  const deliveryValue = useWatch({ control: form.control, name: "delivery" });
  const notesValue = useWatch({ control: form.control, name: "notes" });
  const statusValue = useWatch({ control: form.control, name: "status" });
  const outcomeValue = useWatch({ control: form.control, name: "outcome" });
  const durationOptions = DURATION_OPTIONS.includes(durationValue ?? "")
    ? DURATION_OPTIONS
    : [...(durationValue ? [durationValue] : []), ...DURATION_OPTIONS];
  const minuteOptions = MINUTE_OPTIONS.includes(minute)
    ? MINUTE_OPTIONS
    : [minute, ...MINUTE_OPTIONS];
  const isSubmitting =
    createConsultation.isPending || updateConsultation.isPending || checkingConflict;
  const shouldShowPatientSearch =
    !isEditing &&
    !defaultPatientId &&
    !selectedPatient &&
    Boolean(entityId) &&
    Boolean(patientNameValue?.trim());
  const canSearchPatients = open && shouldShowPatientSearch;
  const { data: patientSearchData, isFetching: searchingPatients } = usePatientSearch(
    canSearchPatients ? entityId : undefined,
    { q: patientNameValue?.trim() ?? "", limit: 8 }
  );
  const patientOptions = patientSearchData?.data?.patients ?? [];

  useEffect(() => {
    if (!open || isEditing) return;
    form.setValue("patientName", defaultPatientName ?? "");
  }, [defaultPatientName, form, isEditing, open]);

  useEffect(() => {
    if (!open || isEditing || !currentDoctorName) return;
    if (!form.getValues("doctorName")) {
      form.setValue("doctorName", currentDoctorName);
    }
  }, [open, isEditing, currentDoctorName, form]);

  // When a different consultation is selected, refresh the form & time state.
  // Done as derived state during render to avoid setState-in-effect cascades.
  const incomingId = consultationInput?.id ?? null;
  const [trackedId, setTrackedId] = useState<string | null>(incomingId);
  if (consultationInput && incomingId !== trackedId) {
    setTrackedId(incomingId);
    form.reset(getDefaultValues(defaultPatientName, consultationInput));
    const parts = getTimeParts(consultationInput.scheduledAt);
    setSelectedDate(parts.selectedDate);
    setHour(parts.hour);
    setMinute(parts.minute);
    setPeriod(parts.period);
  }

  const resetNewConsultationState = useCallback(() => {
    form.reset(getDefaultValues(defaultPatientName));
    setSelectedPatient(null);
    setSelectedDate(undefined);
    setHour("09");
    setMinute("00");
    setPeriod("AM");
  }, [defaultPatientName, form]);

  const updateScheduledAt = useCallback(
    (date: Date | undefined, h: string, m: string, p: "AM" | "PM") => {
      if (!date) {
        form.setValue("scheduledAt", "");
        return;
      }
      let hour24 = parseInt(h, 10);
      if (p === "AM" && hour24 === 12) hour24 = 0;
      if (p === "PM" && hour24 !== 12) hour24 += 12;
      const d = new Date(date);
      d.setHours(hour24, parseInt(m, 10), 0, 0);
      form.setValue("scheduledAt", d.toISOString(), { shouldDirty: true });
      form.clearErrors("scheduledAt");
    },
    [form]
  );

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      setSelectedDate(date);
      updateScheduledAt(date, hour, minute, period);
      if (date) setCalendarOpen(false);
    },
    [hour, minute, period, updateScheduledAt]
  );

  const handleSlotSelect = useCallback(
    (h: string, m: string, p: "AM" | "PM") => {
      setHour(h);
      setMinute(m);
      setPeriod(p);
      const date = selectedDate ?? new Date();
      if (!selectedDate) setSelectedDate(date);
      updateScheduledAt(date, h, m, p);
    },
    [selectedDate, updateScheduledAt]
  );

  const displayValue = selectedDate
    ? `${selectedDate.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })} at ${hour}:${minute} ${period}`
    : null;

  function onSubmit(data: FormData) {
    const result = schema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    void runSubmit(result.data);
  }

  async function runSubmit(data: FormData, skipConflictCheck = false) {
    const duration = data.duration ? parseInt(data.duration, 10) : undefined;
    const scheduledAt = new Date(data.scheduledAt).toISOString();
    const patientId = defaultPatientId ?? selectedPatient?.id;
    const doctorId = consultation?.doctorId || currentUserId || undefined;

    if (!consultation && !patientId) {
      form.setError("patientName", {
        message: "Select a patient from the search results.",
      });
      return;
    }

    if (!skipConflictCheck && doctorId) {
      const conflicts = await findConflicts({
        doctorId,
        scheduledAt,
        duration: duration ?? 30,
        excludeId: consultation?.id,
      });
      if (conflicts.length > 0) {
        setConflictPending({ data, conflicts });
        return;
      }
    }

    if (consultation) {
      const status = (data.status ?? consultation.status) as ConsultationStatus;
      updateConsultation.mutate(
        {
          id: consultation.id,
          doctorId,
          doctorName: data.doctorName,
          type: data.type as ConsultationType,
          scheduledAt,
          duration: duration ?? null,
          notes: data.notes || null,
          status,
          outcome: data.outcome || null,
          completedAt:
            status === "completed"
              ? (consultation.completedAt ?? new Date().toISOString())
              : null,
        },
        {
          onSuccess: () => {
            toast.success("Consultation updated");
            onOpenChange(false);
          },
          onError: (err) => {
            toast.error(err.message);
          },
        }
      );
      return;
    }

    createConsultation.mutate(
      {
        patientId: patientId!,
        patientName: data.patientName,
        doctorId,
        doctorName: data.doctorName,
        type: data.type as ConsultationType,
        scheduledAt,
        duration,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Consultation scheduled");
          resetNewConsultationState();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }

  async function findConflicts({
    doctorId,
    scheduledAt,
    duration,
    excludeId,
  }: {
    doctorId: string;
    scheduledAt: string;
    duration: number;
    excludeId?: string;
  }): Promise<Consultation[]> {
    setCheckingConflict(true);
    try {
      const target = new Date(scheduledAt);
      const dayStart = new Date(target);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(target);
      dayEnd.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        doctorId,
        from: dayStart.toISOString(),
        to: dayEnd.toISOString(),
        limit: "100",
        status: "scheduled",
      });
      const res = await fetch(`/api/proxy/consultations?${params.toString()}`);
      if (!res.ok) return [];
      const json = (await res.json()) as ConsultationsListResponse;
      const start = target.getTime();
      const end = start + duration * 60_000;
      return (json.data?.consultations ?? []).filter((c) => {
        if (excludeId && c.id === excludeId) return false;
        if (c.status !== "scheduled") return false;
        const cStart = new Date(c.scheduledAt).getTime();
        const cEnd = cStart + (c.duration ?? 30) * 60_000;
        return cStart < end && cEnd > start;
      });
    } catch {
      return [];
    } finally {
      setCheckingConflict(false);
    }
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isEditing) resetNewConsultationState();
          onOpenChange(nextOpen);
        }}
        title={isEditing ? "Update Consultation" : "Schedule Consultation"}
        description={
          isEditing
            ? "Update appointment details and consultation outcome."
            : "Create a new consultation appointment."
        }
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!isEditing) resetNewConsultationState();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Saving…"
                  : "Scheduling…"
                : isEditing
                  ? "Save changes"
                  : "Schedule"}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientName">
              Patient <span className="text-destructive">*</span>
            </Label>
            {selectedPatient || isEditing || defaultPatientName ? (
              <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm">
                <UserIcon
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{patientNameValue || "Patient"}</span>
                {!isEditing && !defaultPatientName && (
                  <button
                    type="button"
                    aria-label="Clear patient"
                    className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      form.setValue("patientName", "", { shouldDirty: true });
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <Input
                id="patientName"
                placeholder="Enter patient name"
                {...form.register("patientName")}
                onChange={(event) => {
                  form.setValue("patientName", event.target.value, {
                    shouldDirty: true,
                  });
                  setSelectedPatient(null);
                }}
              />
            )}
            {shouldShowPatientSearch && (
              <div className="rounded-lg border bg-popover p-1 shadow-sm">
                {searchingPatients ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    Searching patients…
                  </p>
                ) : patientOptions.length > 0 ? (
                  patientOptions.map((patient) => {
                    const label =
                      patient.displayName ||
                      patient.originalEmail ||
                      patient.generatedEmail ||
                      "Patient";
                    return (
                      <button
                        type="button"
                        key={patient.id}
                        className="flex min-h-11 w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        onClick={() => {
                          setSelectedPatient(patient);
                          form.setValue("patientName", label, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          form.clearErrors("patientName");
                        }}
                      >
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">
                          {patient.dateOfBirth ?? "DOB not recorded"}
                          {patient.halaxyPatientId
                            ? ` · PMS ${patient.halaxyPatientId}`
                            : " · PMS pending"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No matching patients found.
                  </p>
                )}
              </div>
            )}
            {form.formState.errors.patientName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.patientName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctorName">
              Doctor <span className="text-destructive">*</span>
            </Label>
            <UISelect
              value={doctorNameValue || currentDoctorName}
              onValueChange={(v) => {
                if (v) form.setValue("doctorName", v, { shouldDirty: true });
              }}
            >
              <UISelectTrigger id="doctorName">
                <UISelectValue placeholder="Select doctor" />
              </UISelectTrigger>
              <UISelectContent>
                {currentDoctorName && (
                  <UISelectItem value={currentDoctorName}>
                    {currentDoctorName}
                  </UISelectItem>
                )}
                {doctorNameValue && doctorNameValue !== currentDoctorName && (
                  <UISelectItem value={doctorNameValue}>{doctorNameValue}</UISelectItem>
                )}
              </UISelectContent>
            </UISelect>
            {form.formState.errors.doctorName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.doctorName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <div
              role="radiogroup"
              aria-label="Consultation type"
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {TYPE_OPTIONS.map((option) => {
                const selected = typeValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      form.setValue("type", option.value, { shouldDirty: true });
                      form.setValue("duration", String(option.duration), {
                        shouldDirty: true,
                      });
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border bg-transparent p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected
                        ? "border-primary ring-1 ring-primary"
                        : "border-input hover:border-foreground/30"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        aria-hidden="true"
                        className={cn("h-2 w-2 rounded-full", option.dotClass)}
                      />
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Date &amp; time <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger
                  className={cn(
                    "flex h-10 min-w-0 flex-1 items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    !displayValue && "text-muted-foreground",
                    form.formState.errors.scheduledAt &&
                      "border-destructive ring-3 ring-destructive/20"
                  )}
                >
                  <span>
                    {selectedDate
                      ? selectedDate.toLocaleDateString("en-AU", {
                          weekday: "short",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "Pick a date"}
                  </span>
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    defaultMonth={selectedDate ?? new Date()}
                    startMonth={new Date()}
                    endMonth={new Date(2030, 11)}
                  />
                </PopoverContent>
              </Popover>

              <UISelect
                value={hour}
                onValueChange={(v) => {
                  if (v) {
                    setHour(v);
                    updateScheduledAt(selectedDate, v, minute, period);
                  }
                }}
              >
                <UISelectTrigger className="w-17.5">
                  <UISelectValue />
                </UISelectTrigger>
                <UISelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const val = String(i + 1).padStart(2, "0");
                    return (
                      <UISelectItem key={val} value={val}>
                        {val}
                      </UISelectItem>
                    );
                  })}
                </UISelectContent>
              </UISelect>
              <span className="text-sm font-medium">:</span>
              <UISelect
                value={minute}
                onValueChange={(v) => {
                  if (v) {
                    setMinute(v);
                    updateScheduledAt(selectedDate, hour, v, period);
                  }
                }}
              >
                <UISelectTrigger className="w-17.5">
                  <UISelectValue />
                </UISelectTrigger>
                <UISelectContent>
                  {minuteOptions.map((val) => (
                    <UISelectItem key={val} value={val}>
                      {val}
                    </UISelectItem>
                  ))}
                </UISelectContent>
              </UISelect>
              <UISelect
                value={period}
                onValueChange={(v) => {
                  if (v) {
                    setPeriod(v as "AM" | "PM");
                    updateScheduledAt(selectedDate, hour, minute, v as "AM" | "PM");
                  }
                }}
              >
                <UISelectTrigger className="w-17.5">
                  <UISelectValue />
                </UISelectTrigger>
                <UISelectContent>
                  <UISelectItem value="AM">AM</UISelectItem>
                  <UISelectItem value="PM">PM</UISelectItem>
                </UISelectContent>
              </UISelect>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SLOTS.map((slot) => {
                const isActive =
                  hour === slot.hour &&
                  minute === slot.minute &&
                  period === slot.period;
                return (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() =>
                      handleSlotSelect(slot.hour, slot.minute, slot.period)
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      isActive
                        ? "border-primary text-primary"
                        : "border-input text-foreground hover:border-foreground/30"
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
            {currentDoctorName && (
              <p className="text-xs text-muted-foreground">
                Slots shown are {currentDoctorName.replace(/^Dr\.?\s*/i, "")}&rsquo;s
                open windows on this day.
              </p>
            )}

            {form.formState.errors.scheduledAt && (
              <p className="text-sm text-destructive">
                {form.formState.errors.scheduledAt.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Duration &amp; delivery</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <UISelect
                value={durationValue ?? ""}
                onValueChange={(v) => {
                  if (v) form.setValue("duration", v, { shouldDirty: true });
                }}
              >
                <UISelectTrigger>
                  <UISelectValue placeholder="Duration" />
                </UISelectTrigger>
                <UISelectContent>
                  {durationOptions.map((val) => (
                    <UISelectItem key={val} value={val}>
                      {val} minutes
                    </UISelectItem>
                  ))}
                </UISelectContent>
              </UISelect>
              <UISelect
                value={deliveryValue ?? ""}
                onValueChange={(v) => {
                  if (v) form.setValue("delivery", v, { shouldDirty: true });
                }}
              >
                <UISelectTrigger>
                  <UISelectValue placeholder="Delivery" />
                </UISelectTrigger>
                <UISelectContent>
                  {DELIVERY_OPTIONS.map((option) => (
                    <UISelectItem key={option.value} value={option.value}>
                      {option.label}
                    </UISelectItem>
                  ))}
                </UISelectContent>
              </UISelect>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <SimpleEditor
              content={notesValue ?? ""}
              onChange={(html) => form.setValue("notes", html)}
              placeholder="Optional notes for this consultation…"
            />
          </div>

          {isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <UISelect
                  value={statusValue}
                  onValueChange={(v) => {
                    if (v) form.setValue("status", v);
                  }}
                >
                  <UISelectTrigger id="status">
                    <UISelectValue placeholder="Select status" />
                  </UISelectTrigger>
                  <UISelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <UISelectItem key={value} value={value}>
                        {label}
                      </UISelectItem>
                    ))}
                  </UISelectContent>
                </UISelect>
              </div>

              <div className="space-y-2">
                <Label>Outcome</Label>
                <SimpleEditor
                  content={outcomeValue ?? ""}
                  onChange={(html) => form.setValue("outcome", html)}
                  placeholder="Optional outcome or summary…"
                />
              </div>
            </>
          )}
        </form>
      </AppSheet>

      <AlertDialog
        open={!!conflictPending}
        onOpenChange={(o) => {
          if (!o) setConflictPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possible double-booking</AlertDialogTitle>
            <AlertDialogDescription>
              {doctorNameValue || "This doctor"} already has{" "}
              {conflictPending?.conflicts.length === 1
                ? "a consultation"
                : `${conflictPending?.conflicts.length} consultations`}{" "}
              that overlap this time slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
            {conflictPending?.conflicts.map((c) => {
              const start = new Date(c.scheduledAt);
              const end = new Date(start.getTime() + (c.duration ?? 30) * 60_000);
              const fmt: Intl.DateTimeFormatOptions = {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              };
              return (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{c.patientName}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {start.toLocaleTimeString("en-AU", fmt)} –{" "}
                    {end.toLocaleTimeString("en-AU", fmt)}
                  </span>
                </li>
              );
            })}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Pick another time</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (conflictPending) {
                  const pending = conflictPending;
                  setConflictPending(null);
                  void runSubmit(pending.data, true);
                }
              }}
            >
              Schedule anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
