"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UpdateUserProfilePayload, UserProfile, UserRole } from "@/types";

const contactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .max(100, "First name must be 100 characters or fewer")
    .optional()
    .default(""),
  lastName: z
    .string()
    .trim()
    .max(100, "Last name must be 100 characters or fewer")
    .optional()
    .default(""),
  email: z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or fewer")
    .refine((v) => v === "" || v.includes("@"), "Email must contain '@'")
    .optional()
    .default(""),
  phone: z
    .string()
    .trim()
    .max(20, "Phone must be 20 characters or fewer")
    .optional()
    .default(""),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ProfileContactTabProps {
  profile: UserProfile | null;
  role: UserRole;
}

export function ProfileContactTab({ profile, role }: ProfileContactTabProps) {
  const updateProfile = useUpdateProfile();
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormValues, string>>>(
    {}
  );

  const defaults: ContactFormValues = {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ContactFormValues>({ defaultValues: defaults });

  useEffect(() => {
    reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.firstName, profile?.lastName, profile?.email, profile?.phone]);

  const onSubmit = (raw: ContactFormValues) => {
    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ContactFormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const data = parsed.data;
    const payload: UpdateUserProfilePayload = {
      firstName: data.firstName ? data.firstName : null,
      lastName: data.lastName ? data.lastName : null,
      email: data.email ? data.email : null,
      phone: data.phone ? data.phone : null,
    };
    if (!profile) payload.role = role;

    updateProfile.mutate(payload, {
      onSuccess: () => {
        toast.success("Profile updated");
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to update profile");
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Details</CardTitle>
        <CardDescription>
          Update the name, email, and phone shown on your profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" {...register("phone")} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset(defaults);
                setErrors({});
              }}
              disabled={!isDirty || updateProfile.isPending}
            >
              Reset
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
