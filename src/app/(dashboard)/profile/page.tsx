"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Shield } from "lucide-react";
import { PrescriberHpiSection } from "@/components/profile/PrescriberHpiSection";
import { PrescriberDetailsSection } from "@/components/profile/PrescriberDetailsSection";
import { BusinessAddressSection } from "@/components/profile/BusinessAddressSection";
import type { UpdateUserProfilePayload, UserRole } from "@/types";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// ---- Zod schema (manual safeParse — no @hookform/resolvers) ----

const profileSchema = z.object({
  phone: z.string().max(20, "Phone number too long").optional().or(z.literal("")),
  availabilityDays: z.array(z.string()).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  staff: "Staff",
};

const ROLE_VARIANTS: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  doctor: "secondary",
  staff: "outline",
};

export default function ProfilePage() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const profile = profileData?.data?.profile;
  const role = (clerkUser?.publicMetadata?.role as UserRole) ?? "staff";
  const isDoctor = role === "doctor";

  const form = useForm<ProfileFormData>({
    defaultValues: {
      phone: "",
      availabilityDays: [],
    },
  });

  // Populate form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        phone: profile.phone ?? "",
        availabilityDays: profile.availability_days ?? [],
      });
    }
  }, [profile, form]);

  function onSubmit(data: ProfileFormData) {
    const result = profileSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProfileFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdateUserProfilePayload = {
      phone: result.data.phone || undefined,
      availabilityDays: result.data.availabilityDays?.length
        ? result.data.availabilityDays
        : undefined,
    };

    // Include role so backend knows the user's role (especially on first save)
    if (!profile) {
      payload.role = role;
    }

    updateProfile.mutate(payload, {
      onSuccess: () => {
        toast.success("Profile updated successfully");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  const fullName = clerkUser
    ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "User"
    : "";
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isLoading = !clerkLoaded || profileLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="My Profile" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="My Profile" />

      {/* Account Info — read-only */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Managed by your Google account. Contact an admin to change your role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={clerkUser?.imageUrl} alt={fullName} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{fullName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {email}
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant={ROLE_VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
            <CardDescription>Your direct contact information.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
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
          </CardContent>
        </Card>

        {/* Availability Days */}
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
            <CardDescription>
              Select the days you are available for consultations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DAYS_OF_WEEK.map((day) => {
                const selected = form.watch("availabilityDays") ?? [];
                return (
                  <label
                    key={day}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors has-checked:border-primary has-checked:bg-primary/5"
                  >
                    <Checkbox
                      checked={selected.includes(day)}
                      onCheckedChange={(checked) => {
                        const current = form.getValues("availabilityDays") ?? [];
                        if (checked) {
                          form.setValue("availabilityDays", [...current, day], {
                            shouldDirty: true,
                          });
                        } else {
                          form.setValue(
                            "availabilityDays",
                            current.filter((d) => d !== day),
                            { shouldDirty: true }
                          );
                        }
                      }}
                    />
                    <span className="text-sm font-medium">{day}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Save — contact + availability */}
        <div className="flex justify-end">
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>
      </form>

      {/* Doctor-specific sections — each has its own form/save */}
      {isDoctor && (
        <>
          <Separator className="border-dashed border-red-300" />

          <PrescriberHpiSection
            profile={profile ?? null}
            clerkFirstName={clerkUser?.firstName ?? ""}
            clerkLastName={clerkUser?.lastName ?? ""}
          />

          <Separator className="border-dashed border-red-300" />

          <PrescriberDetailsSection profile={profile ?? null} />

          <Separator className="border-dashed border-red-300" />

          <BusinessAddressSection profile={profile ?? null} />
        </>
      )}
    </div>
  );
}
