"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        patientId: defaultPatientId ?? `p-${Date.now()}`,
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
          form.reset();
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
        className="flex flex-col w-full sm:max-w-[33vw] sm:min-w-[400px]"
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
              <p className="text-sm text-red-500">
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
              <p className="text-sm text-red-500">
                {form.formState.errors.doctorName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(v) => {
                if (v) form.setValue("type", v);
              }}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="initial">Initial Assessment</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="renewal">Prescription Renewal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Date & Time</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              {...form.register("scheduledAt")}
            />
            {form.formState.errors.scheduledAt && (
              <p className="text-sm text-red-500">
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes for this consultation…"
              rows={3}
              {...form.register("notes")}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.reset();
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
