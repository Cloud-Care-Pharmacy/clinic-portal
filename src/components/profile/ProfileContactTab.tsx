"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UserProfile, UpdateUserProfilePayload, UserRole } from "@/types";

const GENDERS = ["Male", "Female", "Other"] as const;

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
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
      dateOfBirth: "",
      gender: "",
      phone: "",
    },
  });

  useEffect(() => {
    form.reset({
      firstName: clerkFirstName,
      lastName: clerkLastName,
      dateOfBirth: profile?.date_of_birth ?? "",
      gender: profile?.gender ?? "",
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
      dateOfBirth: result.data.dateOfBirth || undefined,
      gender: result.data.gender || undefined,
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
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ct-firstName">First name</Label>
              <Input
                id="ct-firstName"
                readOnly
                className="bg-muted/50"
                {...form.register("firstName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-lastName">Last name</Label>
              <Input
                id="ct-lastName"
                readOnly
                className="bg-muted/50"
                {...form.register("lastName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-dob">Date of birth</Label>
              <Input
                id="ct-dob"
                placeholder="DD/MM/YYYY"
                {...form.register("dateOfBirth")}
              />
              {form.formState.errors.dateOfBirth && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.dateOfBirth.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-gender">Gender</Label>
              <Select
                value={form.watch("gender") || undefined}
                onValueChange={(v) => {
                  if (v) form.setValue("gender", v, { shouldDirty: true });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.gender.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ct-phone">Phone number</Label>
              <Input
                id="ct-phone"
                type="tel"
                placeholder="+61 4XX XXX XXX"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
