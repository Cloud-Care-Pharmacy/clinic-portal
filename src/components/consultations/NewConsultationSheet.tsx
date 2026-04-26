"use client";

import { useState, useCallback, useEffect, useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select as UISelect,
  SelectContent as UISelectContent,
  SelectItem as UISelectItem,
  SelectTrigger as UISelectTrigger,
  SelectValue as UISelectValue,
} from "@/components/ui/select";
import { SimpleEditor } from "@/components/shared/SimpleEditor";
import { cn } from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  useCreateConsultation,
  useUpdateConsultation,
} from "@/lib/hooks/use-consultations";
import type { Consultation, ConsultationStatus, ConsultationType } from "@/types";

const MINUTE_OPTIONS = ["00", "15", "30", "45"];

const STATUS_LABELS: Record<ConsultationStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

const schema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  doctorName: z.string().min(1, "Doctor name is required"),
  type: z.string().min(1, "Type is required"),
  scheduledAt: z.string().min(1, "Date & time is required"),
  duration: z.string().optional(),
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
    duration: consultation?.duration ? String(consultation.duration) : "30",
    notes: consultation?.notes ?? "",
    status: consultation?.status ?? "scheduled",
    outcome: consultation?.outcome ?? "",
  };
}

interface NewConsultationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPatientId?: string;
  defaultPatientName?: string;
  consultation?: Consultation | null;
}

export function NewConsultationSheet({
  open,
  onOpenChange,
  defaultPatientId,
  defaultPatientName,
  consultation,
}: NewConsultationSheetProps) {
  const createConsultation = useCreateConsultation();
  const updateConsultation = useUpdateConsultation();
  const fallbackPatientId = useId();
  const isEditing = Boolean(consultation);
  const initialTimeParts = getTimeParts(consultation?.scheduledAt);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialTimeParts.selectedDate
  );
  const [hour, setHour] = useState(initialTimeParts.hour);
  const [minute, setMinute] = useState(initialTimeParts.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initialTimeParts.period);

  const form = useForm<FormData>({
    defaultValues: getDefaultValues(defaultPatientName, consultation),
  });
  const typeValue = useWatch({ control: form.control, name: "type" });
  const notesValue = useWatch({ control: form.control, name: "notes" });
  const statusValue = useWatch({ control: form.control, name: "status" });
  const outcomeValue = useWatch({ control: form.control, name: "outcome" });
  const minuteOptions = MINUTE_OPTIONS.includes(minute)
    ? MINUTE_OPTIONS
    : [minute, ...MINUTE_OPTIONS];
  const isSubmitting = createConsultation.isPending || updateConsultation.isPending;

  useEffect(() => {
    if (!open || isEditing) return;
    form.setValue("patientName", defaultPatientName ?? "");
  }, [defaultPatientName, form, isEditing, open]);

  const resetNewConsultationState = useCallback(() => {
    form.reset(getDefaultValues(defaultPatientName));
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

    const duration = result.data.duration
      ? parseInt(result.data.duration, 10)
      : undefined;
    const scheduledAt = new Date(result.data.scheduledAt).toISOString();

    if (consultation) {
      const status = (result.data.status ?? consultation.status) as ConsultationStatus;

      updateConsultation.mutate(
        {
          id: consultation.id,
          doctorName: result.data.doctorName,
          type: result.data.type as ConsultationType,
          scheduledAt,
          duration: duration ?? null,
          notes: result.data.notes || null,
          status,
          outcome: result.data.outcome || null,
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
        patientId: defaultPatientId ?? fallbackPatientId,
        patientName: result.data.patientName,
        doctorName: result.data.doctorName,
        type: result.data.type as ConsultationType,
        scheduledAt,
        duration,
        notes: result.data.notes || undefined,
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

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isEditing) resetNewConsultationState();
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-[33vw] sm:min-w-100"
      >
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Update Consultation" : "Schedule Consultation"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update appointment details and consultation outcome."
              : "Create a new consultation appointment."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          <div className="space-y-2">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input
              id="patientName"
              placeholder="Enter patient name"
              {...form.register("patientName")}
              disabled={isEditing || !!defaultPatientName}
            />
            {form.formState.errors.patientName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.patientName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctorName">Doctor</Label>
            <Input
              id="doctorName"
              placeholder="Enter doctor name"
              {...form.register("doctorName")}
            />
            {form.formState.errors.doctorName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.doctorName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <UISelect
              value={typeValue}
              onValueChange={(v) => {
                if (v) form.setValue("type", v);
              }}
            >
              <UISelectTrigger id="type">
                <UISelectValue placeholder="Select type" />
              </UISelectTrigger>
              <UISelectContent>
                <UISelectItem value="initial">Initial Assessment</UISelectItem>
                <UISelectItem value="follow-up">Follow-up</UISelectItem>
                <UISelectItem value="renewal">Prescription Renewal</UISelectItem>
              </UISelectContent>
            </UISelect>
          </div>

          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  !displayValue && "text-muted-foreground",
                  form.formState.errors.scheduledAt &&
                    "border-destructive ring-3 ring-destructive/20"
                )}
              >
                <span>{displayValue ?? "Pick a date & time"}</span>
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

            <div className="flex items-center gap-2">
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

            {form.formState.errors.scheduledAt && (
              <p className="text-sm text-destructive">
                {form.formState.errors.scheduledAt.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="5"
              max="120"
              {...form.register("duration")}
            />
          </div>

          <div className="flex-1 space-y-2">
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

              <div className="flex-1 space-y-2">
                <Label>Outcome</Label>
                <SimpleEditor
                  content={outcomeValue ?? ""}
                  onChange={(html) => form.setValue("outcome", html)}
                  placeholder="Optional outcome or summary…"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end pt-2">
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Saving…"
                  : "Scheduling…"
                : isEditing
                  ? "Save changes"
                  : "Schedule"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
