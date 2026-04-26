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
import { useCreateConsultation } from "@/lib/hooks/use-consultations";
import type { ConsultationType } from "@/types";

const schema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  doctorName: z.string().min(1, "Doctor name is required"),
  type: z.string().min(1, "Type is required"),
  scheduledAt: z.string().min(1, "Date & time is required"),
  duration: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface NewConsultationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPatientId?: string;
  defaultPatientName?: string;
}

export function NewConsultationSheet({
  open,
  onOpenChange,
  defaultPatientId,
  defaultPatientName,
}: NewConsultationSheetProps) {
  const createConsultation = useCreateConsultation();
  const fallbackPatientId = useId();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  const form = useForm<FormData>({
    defaultValues: {
      patientName: defaultPatientName ?? "",
      doctorName: "",
      type: "initial",
      scheduledAt: "",
      duration: "30",
      notes: "",
    },
  });
  const typeValue = useWatch({ control: form.control, name: "type" });
  const notesValue = useWatch({ control: form.control, name: "notes" });

  useEffect(() => {
    if (!open) return;
    form.setValue("patientName", defaultPatientName ?? "");
  }, [defaultPatientName, form, open]);

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

    createConsultation.mutate(
      {
        patientId: defaultPatientId ?? fallbackPatientId,
        patientName: result.data.patientName,
        doctorName: result.data.doctorName,
        type: result.data.type as ConsultationType,
        scheduledAt: new Date(result.data.scheduledAt).toISOString(),
        duration: result.data.duration ? parseInt(result.data.duration, 10) : undefined,
        notes: result.data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Consultation scheduled");
          form.reset({
            patientName: defaultPatientName ?? "",
            doctorName: "",
            type: "initial",
            scheduledAt: "",
            duration: "30",
            notes: "",
          });
          setSelectedDate(undefined);
          setHour("09");
          setMinute("00");
          setPeriod("AM");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-[33vw] sm:min-w-100"
      >
        <SheetHeader>
          <SheetTitle>Schedule Consultation</SheetTitle>
          <SheetDescription>Create a new consultation appointment.</SheetDescription>
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
              disabled={!!defaultPatientName}
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
                  {["00", "15", "30", "45"].map((val) => (
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

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.reset();
                setSelectedDate(undefined);
                setHour("09");
                setMinute("00");
                setPeriod("AM");
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createConsultation.isPending}>
              {createConsultation.isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
