"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyFormBar } from "@/components/shared/StickyFormBar";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UpdateUserProfilePayload, UserProfile, UserRole } from "@/types";

/**
 * Backend `users` resource only persists account fields. PUT /api/users/me
 * currently only accepts `phone` and `role` — first/last name are cached on
 * `users` from Clerk and are not writable through this endpoint, so name edits
 * here are not persisted yet.
 */

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().max(20, "Phone number too long").optional().or(z.literal("")),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ProfileContactTabProps {
  profile: UserProfile | null;
  role: UserRole;
  clerkFirstName: string;
  clerkLastName: string;
}

export function ProfileContactTab({
  profile,
  role,
  clerkFirstName,
  clerkLastName,
}: ProfileContactTabProps) {
  const updateProfile = useUpdateProfile();

  const form = useForm<ContactFormData>({
    defaultValues: {
      firstName: clerkFirstName,
      lastName: clerkLastName,
      phone: "",
    },
  });

  useEffect(() => {
    form.reset({
      firstName: clerkFirstName,
      lastName: clerkLastName,
      phone: profile?.phone ?? "",
    });
  }, [profile, clerkFirstName, clerkLastName, form]);

  function onSubmit(data: ContactFormData) {
    const result = contactSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ContactFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdateUserProfilePayload = {
      phone: result.data.phone || undefined,
    };

    if (!profile) {
      payload.role = role;
    }

    updateProfile.mutate(payload, {
      onSuccess: () => toast.success("Contact details updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-base font-semibold">Contact Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ct-firstName">First name</Label>
              <Input
                id="ct-firstName"
                aria-invalid={!!form.formState.errors.firstName}
                {...form.register("firstName")}
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-lastName">Last name</Label>
              <Input
                id="ct-lastName"
                aria-invalid={!!form.formState.errors.lastName}
                {...form.register("lastName")}
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-phone">Phone number</Label>
              <Input
                id="ct-phone"
                type="tel"
                placeholder="+61 4XX XXX XXX"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <StickyFormBar
        isDirty={form.formState.isDirty}
        isPending={updateProfile.isPending}
        onDiscard={() => form.reset()}
      />
    </form>
  );
}

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyFormBar } from "@/components/shared/StickyFormBar";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UpdateUserProfilePayload, UserProfile, UserRole } from "@/types";

/**
 * Backend `users` resource only persists account fields. After the
 * users/practitioners split, PUT /api/users/me only accepts `phone` and `role`.
 *
 * First/last name are owned by Clerk; we update them via the Clerk SDK and a
 * Clerk webhook syncs them back into `users.first_name` / `users.last_name`.
 */

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(20, "Phone number too long").optional().or(z.literal("")),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ProfileContactTabProps {
  profile: UserProfile | null;
  role: UserRole;
  clerkFirstName: string;
  clerkLastName: string;
}

export function ProfileContactTab({
  profile,
  role,
  clerkFirstName,
  clerkLastName,
}: ProfileContactTabProps) {
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();

  const form = useForm<ContactFormData>({
    defaultValues: {
      firstName: clerkFirstName,
      lastName: clerkLastName,
      phone: "",
    },
  });

  useEffect(() => {
    form.reset({
      firstName: clerkFirstName,
      lastName: clerkLastName,
      phone: profile?.phone ?? "",
    });
  }, [profile, clerkFirstName, clerkLastName, form]);

  async function onSubmit(data: ContactFormData) {
    const result = contactSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ContactFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const nameChanged =
      result.data.firstName !== clerkFirstName ||
      result.data.lastName !== clerkLastName;
    const phoneChanged = (result.data.phone ?? "") !== (profile?.phone ?? "");

    try {
      if (nameChanged) {
        if (!clerkUser) {
          throw new Error("Sign-in required to update your name");
        }
        await clerkUser.update({
          firstName: result.data.firstName,
          lastName: result.data.lastName,
        });
        // Profile cache mirrors Clerk-synced names; refresh after webhook fires.
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }

      if (phoneChanged || !profile) {
        const payload: UpdateUserProfilePayload = {
          phone: result.data.phone || undefined,
        };
        if (!profile) payload.role = role;
        await updateProfile.mutateAsync(payload);
      }

      toast.success("Contact details updated");
      form.reset({
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        phone: result.data.phone ?? "",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update contact details";
      toast.error(message);
    }
  }

  const isPending = form.formState.isSubmitting || updateProfile.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-base font-semibold">Contact Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ct-firstName">First name</Label>
              <Input
                id="ct-firstName"
                aria-invalid={!!form.formState.errors.firstName}
                {...form.register("firstName")}
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-lastName">Last name</Label>
              <Input
                id="ct-lastName"
                aria-invalid={!!form.formState.errors.lastName}
                {...form.register("lastName")}
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-phone">Phone number</Label>
              <Input
                id="ct-phone"
                type="tel"
                placeholder="+61 4XX XXX XXX"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <StickyFormBar
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onDiscard={() => form.reset()}
      />
    </form>
  );
}
