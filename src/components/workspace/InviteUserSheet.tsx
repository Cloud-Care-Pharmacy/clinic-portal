"use client";

import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { AppSheet } from "@/components/shared/AppSheet";
import { useUnsavedChangesGuard } from "@/components/tasks/use-unsaved-changes-guard";
import { useCreateWorkspaceInvitation } from "@/lib/hooks/use-workspace";
import type { UserRole } from "@/types";
import { WORKSPACE_ROLE_LABELS } from "@/components/workspace/workspace-format";

const ROLE_OPTIONS = ["staff", "doctor", "admin"] as const;

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(ROLE_OPTIONS),
});

type FormData = z.infer<typeof schema>;

interface InviteUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backendUnavailable?: boolean;
}

const DEFAULT_VALUES: FormData = {
  email: "",
  role: "staff",
};

export function InviteUserSheet({
  open,
  onOpenChange,
  backendUnavailable,
}: InviteUserSheetProps) {
  const formId = useId();
  const createInvitation = useCreateWorkspaceInvitation();
  const form = useForm<FormData>({ defaultValues: DEFAULT_VALUES });
  const roleValue = useWatch({ control: form.control, name: "role" });
  const isDirty = form.formState.isDirty;

  useUnsavedChangesGuard({
    active: open && isDirty,
    message: "Discard unsaved invitation draft?",
  });

  function resetForm() {
    form.reset(DEFAULT_VALUES);
  }

  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && createInvitation.isPending) return;
    if (!nextOpen && isDirty && !window.confirm("Discard unsaved invitation draft?")) {
      return;
    }
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
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

    if (backendUnavailable) {
      toast.error("Invitation endpoint unavailable");
      return;
    }

    createInvitation.mutate(
      {
        email: result.data.email,
        role: result.data.role as UserRole,
      },
      {
        onSuccess: () => {
          toast.success("Invitation sent");
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to send invite");
        },
      }
    );
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={requestOpenChange}
      title="Invite user"
      description="Send a workspace invitation once the backend invitation endpoint is available."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={createInvitation.isPending}
            onClick={() => requestOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={createInvitation.isPending || backendUnavailable}
          >
            {createInvitation.isPending ? "Sending…" : "Send invite"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {backendUnavailable ? (
          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
            Invitation submission is disabled until POST /api/staff/invitations is
            available.
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="workspaceInviteEmail">Email</Label>
          <Input
            id="workspaceInviteEmail"
            type="email"
            placeholder="clinician@example.com"
            aria-invalid={!!form.formState.errors.email}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspaceInviteRole">Role</Label>
          <Select
            value={roleValue}
            onValueChange={(value) => {
              if (value) {
                form.setValue("role", value as UserRole, { shouldDirty: true });
              }
            }}
          >
            <SelectTrigger id="workspaceInviteRole" className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>
                  {WORKSPACE_ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.role ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.role.message}
            </p>
          ) : null}
        </div>
      </form>
    </AppSheet>
  );
}
