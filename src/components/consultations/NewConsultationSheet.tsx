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
  useConsultationConflicts,
  ConsultationApiError,
} from "@/lib/hooks/use-consultations";
import { usePatientSearch } from "@/lib/hooks/use-patients";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import {
  usePractitioners,
  usePractitionerFreeSlots,
} from "@/lib/hooks/use-practitioner";
import { useProfile } from "@/lib/hooks/use-profile";
import type {
  Consultation,
  ConsultationConflict,
  ConsultationStatus,
  ConsultationType,
  PatientSearchResult,
  UserRole,
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

function formatLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const schema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  doctorId: z.string().min(1, "Doctor is required"),
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
  consultation?: Consultation | null,
  defaultDoctorId?: string
): FormData {
  return {
    patientName: consultation?.patientName ?? defaultPatientName ?? "",
    doctorId: consultation?.doctorId ?? defaultDoctorId ?? "",
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
  const profileQuery = useProfile();
  const currentProfile = profileQuery.data?.data?.profile ?? null;
  // `users.id` (NOT Clerk's authId) — this is what consultations.doctorId stores.
  const currentUserId = currentProfile?.id;
  const currentUserRole: UserRole =
    currentProfile?.role ??
    (user?.publicMetadata?.role as UserRole | undefined) ??
    "staff";
  const isAdmin = currentUserRole === "admin";
  const practitionersQuery = usePractitioners({ role: "doctor" }, open);
  const practitioners = practitionersQuery.data?.data?.practitioners ?? [];
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
    conflicts: ConsultationConflict[];
  } | null>(null);

  const form = useForm<FormData>({
    defaultValues: getDefaultValues(defaultPatientName, consultation, currentUserId),
  });
  const patientNameValue = useWatch({ control: form.control, name: "patientName" });
  const doctorIdValue = useWatch({ control: form.control, name: "doctorId" });
  const selectedDoctor = practitioners.find((p) => p.userId === doctorIdValue);
  const currentUserDoctor = practitioners.find((p) => p.userId === currentUserId);
  const selectedDoctorName =
    selectedDoctor?.displayName ??
    consultation?.doctorName ??
    currentUserDoctor?.displayName ??
    "";
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
  const isSubmitting = createConsultation.isPending || updateConsultation.isPending;
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

  // Live conflict warning — server is the authoritative check at submit time.
  const scheduledAtValue = useWatch({
    control: form.control,
    name: "scheduledAt",
  });
  const liveDoctorId = doctorIdValue || consultation?.doctorId || currentUserId;
  const liveDuration = durationValue ? parseInt(durationValue, 10) : undefined;
  const liveConflictsQuery = useConsultationConflicts(
    {
      doctorId: liveDoctorId,
      scheduledAt: scheduledAtValue || undefined,
      duration: liveDuration,
      excludeId: consultation?.id,
    },
    open && !conflictPending
  );
  const liveConflicts = liveConflictsQuery.data ?? [];

  // Open booking windows for the selected doctor on the selected date.
  const dateForSlots = selectedDate ? formatLocalDate(selectedDate) : undefined;
  const freeSlotsQuery = usePractitionerFreeSlots(
    liveDoctorId,
    dateForSlots,
    liveDuration,
    undefined,
    open
  );
  const freeSlots = freeSlotsQuery.data?.data?.slots ?? [];
  const freeSlotsLoading = freeSlotsQuery.isFetching;

  useEffect(() => {
    if (!open || isEditing) return;
    form.setValue("patientName", defaultPatientName ?? "");
  }, [defaultPatientName, form, isEditing, open]);

  useEffect(() => {
    if (!open || isEditing || !currentUserId) return;
    if (form.getValues("doctorId")) return;
    // Only auto-default to the current user when they are actually a doctor
    // in the directory — otherwise leave it blank so admins/staff pick someone.
    if (practitioners.some((p) => p.userId === currentUserId)) {
      form.setValue("doctorId", currentUserId);
    }
  }, [open, isEditing, currentUserId, practitioners, form]);

  // When a different consultation is selected, refresh the form & time state.
  // Done as derived state during render to avoid setState-in-effect cascades.
  const incomingId = consultationInput?.id ?? null;
  const [trackedId, setTrackedId] = useState<string | null>(incomingId);
  if (consultationInput && incomingId !== trackedId) {
    setTrackedId(incomingId);
    form.reset(
      getDefaultValues(defaultPatientName, consultationInput, currentUserId)
    );
    const parts = getTimeParts(consultationInput.scheduledAt);
    setSelectedDate(parts.selectedDate);
    setHour(parts.hour);
    setMinute(parts.minute);
    setPeriod(parts.period);
  }

  const resetNewConsultationState = useCallback(() => {
    form.reset(getDefaultValues(defaultPatientName, null, currentUserId));
    setSelectedPatient(null);
    setSelectedDate(undefined);
    setHour("09");
    setMinute("00");
    setPeriod("AM");
  }, [defaultPatientName, currentUserId, form]);

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

  // Selecting a server-computed free slot is authoritative — use the UTC
  // `startsAt` directly and sync the AM/PM display state from it.
  const handleFreeSlotSelect = useCallback(
    (startsAt: string) => {
      const parts = getTimeParts(startsAt);
      if (parts.selectedDate) setSelectedDate(parts.selectedDate);
      setHour(parts.hour);
      setMinute(parts.minute);
      setPeriod(parts.period);
      form.setValue("scheduledAt", startsAt, { shouldDirty: true });
      form.clearErrors("scheduledAt");
    },
    [form]
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

  async function runSubmit(data: FormData, force = false) {
    const duration = data.duration ? parseInt(data.duration, 10) : undefined;
    const scheduledAt = new Date(data.scheduledAt).toISOString();
    const patientId = defaultPatientId ?? selectedPatient?.id;
    const doctorId = data.doctorId || consultation?.doctorId || currentUserId || undefined;

    if (!consultation && !patientId) {
      form.setError("patientName", {
        message: "Select a patient from the search results.",
      });
      return;
    }

    if (consultation) {
      const status = (data.status ?? consultation.status) as ConsultationStatus;
      updateConsultation.mutate(
        {
          id: consultation.id,
          doctorId,
          type: data.type as ConsultationType,
          scheduledAt,
          duration: duration ?? null,
          notes: data.notes || null,
          status,
          outcome: data.outcome || null,
          force: force && isAdmin ? true : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Consultation updated");
            onOpenChange(false);
          },
          onError: (err) => handleMutationError(err, data),
        }
      );
      return;
    }

    createConsultation.mutate(
      {
        patientId: patientId!,
        doctorId,
        type: data.type as ConsultationType,
        scheduledAt,
        duration,
        notes: data.notes || null,
        force: force && isAdmin ? true : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Consultation scheduled");
          resetNewConsultationState();
          onOpenChange(false);
        },
        onError: (err) => handleMutationError(err, data),
      }
    );
  }

  function handleMutationError(err: Error, data: FormData) {
    if (err instanceof ConsultationApiError) {
      if (err.code === "CONSULTATION_CONFLICT") {
        const details = err.details as
          | { conflicts?: ConsultationConflict[] }
          | undefined;
        const conflicts = details?.conflicts ?? [];
        setConflictPending({ data, conflicts });
        return;
      }
      if (err.code === "INVALID_STATUS_TRANSITION") {
        form.setError("status", { message: err.message });
        toast.error(err.message);
        return;
      }
      if (err.code === "FORBIDDEN_DOCTOR_ASSIGNMENT") {
        toast.error(err.message);
        return;
      }
    }
    toast.error(err.message);
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
            <Label htmlFor="doctorId">
              Doctor <span className="text-destructive">*</span>
            </Label>
            <UISelect
              value={doctorIdValue || ""}
              onValueChange={(v) => {
                if (v) form.setValue("doctorId", v, { shouldDirty: true });
              }}
            >
              <UISelectTrigger id="doctorId">
                <UISelectValue
                  placeholder={
                    practitionersQuery.isLoading ? "Loading doctors…" : "Select doctor"
                  }
                >
                  {(value) => {
                    if (!value || typeof value !== "string") return null;
                    const match = practitioners.find((p) => p.userId === value);
                    if (match) return match.displayName;
                    if (consultation?.doctorId === value) {
                      return consultation.doctorName || "Unknown doctor";
                    }
                    // Fallback while the directory is loading — show a neutral
                    // label rather than the raw UUID.
                    return practitionersQuery.isLoading
                      ? "Loading doctors…"
                      : "Select doctor";
                  }}
                </UISelectValue>
              </UISelectTrigger>
              <UISelectContent>
                {practitioners.map((p) => (
                  <UISelectItem key={p.userId} value={p.userId}>
                    {p.displayName}
                  </UISelectItem>
                ))}
                {/* Editing an old consultation whose doctor isn’t in the active list. */}
                {consultation?.doctorId &&
                  !practitioners.some((p) => p.userId === consultation.doctorId) && (
                    <UISelectItem value={consultation.doctorId}>
                      {consultation.doctorName || "Unknown doctor"}
                    </UISelectItem>
                  )}
              </UISelectContent>
            </UISelect>
            {form.formState.errors.doctorId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.doctorId.message}
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
              {!liveDoctorId || !selectedDate ? (
                <p className="text-xs text-muted-foreground">
                  Pick a doctor and date to see open slots.
                </p>
              ) : freeSlotsLoading ? (
                <p className="text-xs text-muted-foreground">Loading open slots…</p>
              ) : freeSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No open slots on this day.
                </p>
              ) : (
                freeSlots.map((slot) => {
                  const isActive = scheduledAtValue === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => handleFreeSlotSelect(slot.startsAt)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        isActive
                          ? "border-primary text-primary"
                          : "border-input text-foreground hover:border-foreground/30"
                      )}
                    >
                      {slot.startTime}
                    </button>
                  );
                })
              )}
            </div>
            {selectedDoctorName && selectedDate && freeSlots.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Slots shown are {selectedDoctorName.replace(/^Dr\.?\s*/i, "")}&rsquo;s
                open windows on this day.
              </p>
            )}

            {liveConflicts.length > 0 && (
              <p className="text-xs text-status-warning-fg">
                Heads up: this slot overlaps {liveConflicts.length}{" "}
                {liveConflicts.length === 1 ? "consultation" : "consultations"} on this
                doctor&rsquo;s calendar.
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
              {selectedDoctorName || "This doctor"} already has{" "}
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
            {isAdmin && (
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
                Book anyway
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
