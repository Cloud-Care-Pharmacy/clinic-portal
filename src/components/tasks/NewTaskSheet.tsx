"use client";

import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AppSheet } from "@/components/shared/AppSheet";
import { usePatientSearch } from "@/lib/hooks/use-patients";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useUnsavedChangesGuard } from "@/components/tasks/use-unsaved-changes-guard";
import type { PatientSearchResult, TaskPriority, TaskType, UserRole } from "@/types";
import { TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from "@/components/tasks/task-format";

const TASK_TYPE_OPTIONS = [
  "manual",
  "clinical_follow_up",
  "request_missing_information",
  "schedule_consultation",
  "verify_identity",
  "review_intake",
] as const;

const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"] as const;
const ROLE_OPTIONS = ["unassigned", "staff", "doctor", "admin"] as const;

const schema = z.object({
  patientName: z.string().min(1, "Patient is required"),
  title: z.string().min(1, "Task title is required"),
  taskType: z.enum(TASK_TYPE_OPTIONS),
  description: z.string().optional(),
  priority: z.enum(PRIORITY_OPTIONS),
  assignedRole: z.enum(ROLE_OPTIONS),
  dueAt: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "Enter a valid due date"
    ),
});

type FormData = z.infer<typeof schema>;
type RoleSelectValue = (typeof ROLE_OPTIONS)[number];

interface NewTaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId?: string;
  defaultPatientId?: string;
  defaultPatientName?: string;
}

function getDefaultValues(defaultPatientName?: string): FormData {
  return {
    patientName: defaultPatientName ?? "",
    title: "",
    taskType: "manual",
    description: "",
    priority: "normal",
    assignedRole: "staff",
    dueAt: "",
  };
}

function patientLabel(patient: PatientSearchResult) {
  return (
    patient.displayName || patient.originalEmail || patient.generatedEmail || "Patient"
  );
}

function toIsoDateTime(value?: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function NewTaskSheet({
  open,
  onOpenChange,
  entityId,
  defaultPatientId,
  defaultPatientName,
}: NewTaskSheetProps) {
  const formId = useId();
  const createTask = useCreateTask();
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(
    null
  );
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const form = useForm<FormData>({
    defaultValues: getDefaultValues(defaultPatientName),
  });
  const patientNameValue = useWatch({ control: form.control, name: "patientName" });
  const taskTypeValue = useWatch({ control: form.control, name: "taskType" });
  const priorityValue = useWatch({ control: form.control, name: "priority" });
  const assignedRoleValue = useWatch({ control: form.control, name: "assignedRole" });
  const isDirty = form.formState.isDirty;
  const shouldShowPatientSearch =
    !defaultPatientId &&
    !selectedPatient &&
    Boolean(entityId) &&
    Boolean(patientNameValue?.trim());
  const canSearchPatients = open && shouldShowPatientSearch;
  const { data: patientSearchData, isFetching: searchingPatients } = usePatientSearch(
    canSearchPatients ? entityId : undefined,
    {
      q: patientNameValue?.trim() ?? "",
      limit: 8,
    }
  );
  const patientOptions = patientSearchData?.data?.patients ?? [];

  function resetForm() {
    form.reset(getDefaultValues(defaultPatientName));
    setSelectedPatient(null);
  }

  useUnsavedChangesGuard({
    active: open && isDirty,
    message: "Discard unsaved task draft?",
  });

  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && createTask.isPending) return;

    if (!nextOpen && isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }

    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function discardDraft() {
    resetForm();
    setDiscardConfirmOpen(false);
    onOpenChange(false);
  }

  function setFieldError(issue: z.core.$ZodIssue) {
    const field = issue.path[0] as keyof FormData | undefined;
    if (field) form.setError(field, { message: issue.message });
  }

  function onSubmit(data: FormData) {
    const result = schema.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach(setFieldError);
      return;
    }

    const patientId = defaultPatientId ?? selectedPatient?.id;
    if (!patientId) {
      form.setError("patientName", {
        message: "Select a patient from the search results.",
      });
      return;
    }

    const assignedRole = result.data.assignedRole as RoleSelectValue;

    createTask.mutate(
      {
        patientId,
        taskType: result.data.taskType as TaskType,
        title: result.data.title.trim(),
        description: result.data.description?.trim() || null,
        priority: result.data.priority as TaskPriority,
        assignedRole: assignedRole === "unassigned" ? null : (assignedRole as UserRole),
        dueAt: toIsoDateTime(result.data.dueAt),
      },
      {
        onSuccess: () => {
          toast.success("Task created");
          resetForm();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={requestOpenChange}
        title="New task"
        description="Create a manual follow-up or queue item for a patient."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={createTask.isPending}
              onClick={() => requestOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={createTask.isPending}>
              {createTask.isPending ? "Creating…" : "Create task"}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskPatientName">Patient</Label>
            <Input
              id="taskPatientName"
              placeholder="Search for a patient"
              {...form.register("patientName")}
              disabled={Boolean(defaultPatientId)}
              onChange={(event) => {
                form.setValue("patientName", event.target.value, { shouldDirty: true });
                setSelectedPatient(null);
              }}
            />
            {shouldShowPatientSearch && (
              <div className="rounded-lg border bg-popover p-1 shadow-sm">
                {searchingPatients ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    Searching patients…
                  </p>
                ) : patientOptions.length > 0 ? (
                  patientOptions.map((patient) => {
                    const label = patientLabel(patient);
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
            {!defaultPatientId && !entityId && (
              <p className="text-xs text-muted-foreground">
                Open a patient profile to create a patient-specific task.
              </p>
            )}
            {form.formState.errors.patientName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.patientName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskTitle">Title</Label>
            <Input
              id="taskTitle"
              placeholder="e.g. Follow up missing documents"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskType">Type</Label>
            <Select
              value={taskTypeValue}
              onValueChange={(value) => {
                if (value) {
                  form.setValue("taskType", value as TaskType, { shouldDirty: true });
                }
              }}
            >
              <SelectTrigger id="taskType" className="w-full">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TASK_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taskPriority">Priority</Label>
              <Select
                value={priorityValue}
                onValueChange={(value) => {
                  if (value) {
                    form.setValue("priority", value as TaskPriority, {
                      shouldDirty: true,
                    });
                  }
                }}
              >
                <SelectTrigger id="taskPriority" className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {TASK_PRIORITY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskAssignedRole">Queue</Label>
              <Select
                value={assignedRoleValue}
                onValueChange={(value) => {
                  if (value) {
                    form.setValue("assignedRole", value as RoleSelectValue, {
                      shouldDirty: true,
                    });
                  }
                }}
              >
                <SelectTrigger id="taskAssignedRole" className="w-full">
                  <SelectValue placeholder="Select queue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="staff">Staff queue</SelectItem>
                  <SelectItem value="doctor">Doctor queue</SelectItem>
                  <SelectItem value="admin">Admin queue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskDueAt">Due date</Label>
            <Input id="taskDueAt" type="datetime-local" {...form.register("dueAt")} />
            {form.formState.errors.dueAt && (
              <p className="text-sm text-destructive">
                {form.formState.errors.dueAt.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskDescription">Description</Label>
            <Textarea
              id="taskDescription"
              placeholder="Optional context for the person completing this task."
              className="min-h-28"
              {...form.register("description")}
            />
          </div>
        </form>
      </AppSheet>

      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard task draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the patient, task details, due date, and notes you have
              entered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discardDraft}>
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
