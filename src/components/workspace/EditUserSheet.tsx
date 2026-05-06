"use client";

import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSheet } from "@/components/shared/AppSheet";
import { useUnsavedChangesGuard } from "@/components/tasks/use-unsaved-changes-guard";
import {
  useUpdateWorkspaceUser,
  type UpdateWorkspaceUserPayload,
} from "@/lib/hooks/use-workspace";
import type { WorkspaceUser } from "@/types";

const schema = z.object({
  firstName: z.string().trim().max(100, "Too long").optional().or(z.literal("")),
  lastName: z.string().trim().max(100, "Too long").optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(40, "Too long").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface EditUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: WorkspaceUser | null;
}

function toFormData(user: WorkspaceUser | null): FormData {
  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  };
}

export function EditUserSheet({ open, onOpenChange, user }: EditUserSheetProps) {
  const formId = useId();
  const updateUser = useUpdateWorkspaceUser();
  const form = useForm<FormData>({ defaultValues: toFormData(user) });
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (open) form.reset(toFormData(user));
  }, [open, user, form]);

  useUnsavedChangesGuard({
    active: open && isDirty,
    message: "Discard unsaved user changes?",
  });

  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && updateUser.isPending) return;
    if (!nextOpen && isDirty && !window.confirm("Discard unsaved user changes?")) {
      return;
    }
    onOpenChange(nextOpen);
  }

  function setFieldError(issue: z.core.$ZodIssue) {
    const field = issue.path[0] as keyof FormData | undefined;
    if (field) form.setError(field, { message: issue.message });
  }

  function onSubmit(data: FormData) {
    if (!user) return;
    const result = schema.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach(setFieldError);
      return;
    }

    const payload: UpdateWorkspaceUserPayload = {};
    const firstName = result.data.firstName?.trim() ?? "";
    const lastName = result.data.lastName?.trim() ?? "";
    const email = result.data.email?.trim() ?? "";
    const phone = result.data.phone?.trim() ?? "";

    if (firstName !== (user.firstName ?? "")) payload.firstName = firstName || null;
    if (lastName !== (user.lastName ?? "")) payload.lastName = lastName || null;
    if (email !== (user.email ?? "")) payload.email = email || null;
    if (phone !== (user.phone ?? "")) payload.phone = phone || null;

    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    updateUser.mutate(
      { userId: user.id, data: payload },
      {
        onSuccess: () => {
          toast.success("User updated");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to update user");
        },
      }
    );
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={requestOpenChange}
      title="Edit user"
      description="Update the workspace user's profile details. Changes sync to Clerk where applicable."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={updateUser.isPending}
            onClick={() => requestOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={updateUser.isPending || !user}
          >
            {updateUser.isPending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="workspaceEditFirstName">First name</Label>
            <Input
              id="workspaceEditFirstName"
              autoComplete="given-name"
              aria-invalid={!!form.formState.errors.firstName}
              {...form.register("firstName")}
            />
            {form.formState.errors.firstName ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.firstName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspaceEditLastName">Last name</Label>
            <Input
              id="workspaceEditLastName"
              autoComplete="family-name"
              aria-invalid={!!form.formState.errors.lastName}
              {...form.register("lastName")}
            />
            {form.formState.errors.lastName ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.lastName.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspaceEditEmail">Email</Label>
          <Input
            id="workspaceEditEmail"
            type="email"
            autoComplete="email"
            placeholder="user@example.com"
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
          <Label htmlFor="workspaceEditPhone">Phone</Label>
          <Input
            id="workspaceEditPhone"
            type="tel"
            autoComplete="tel"
            placeholder="+61 400 000 000"
            aria-invalid={!!form.formState.errors.phone}
            {...form.register("phone")}
          />
          {form.formState.errors.phone ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.phone.message}
            </p>
          ) : null}
        </div>
      </form>
    </AppSheet>
  );
}
