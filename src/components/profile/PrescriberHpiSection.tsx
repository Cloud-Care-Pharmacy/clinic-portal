"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import type { UserProfile, UpdateUserProfilePayload } from "@/types";

const GENDERS = ["Male", "Female", "Other"] as const;

const hpiSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  hpii: z
    .string()
    .refine((v) => v === "" || /^\d{16}$/.test(v), "HPII must be exactly 16 digits")
    .optional()
    .or(z.literal("")),
});

type HpiFormData = z.infer<typeof hpiSchema>;

interface PrescriberHpiSectionProps {
  profile: UserProfile | null;
  clerkFirstName: string;
  clerkLastName: string;
}

export function PrescriberHpiSection({
  profile,
  clerkFirstName,
  clerkLastName,
}: PrescriberHpiSectionProps) {
  const updateProfile = useUpdateProfile();

  const form = useForm<HpiFormData>({
    defaultValues: {
      firstName: clerkFirstName,
      lastName: clerkLastName,
      dateOfBirth: "",
      gender: "",
      hpii: "",
    },
  });

  useEffect(() => {
    form.reset({
      firstName: clerkFirstName,
      lastName: clerkLastName,
      dateOfBirth: profile?.date_of_birth ?? "",
      gender: profile?.gender ?? "",
      hpii: profile?.hpii ?? "",
    });
  }, [profile, clerkFirstName, clerkLastName, form]);

  function onSubmit(data: HpiFormData) {
    const result = hpiSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof HpiFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdateUserProfilePayload = {
      hpii: result.data.hpii || undefined,
      dateOfBirth: result.data.dateOfBirth || undefined,
      gender: result.data.gender || undefined,
    };

    updateProfile.mutate(payload, {
      onSuccess: () => toast.success("HPI-I details validated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Prescriber HPI-I details</CardTitle>
        <CardDescription>
          Your Healthcare Provider Identifier — Individual details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="hpi-firstName">First name</Label>
              <Input
                id="hpi-firstName"
                readOnly
                className="bg-muted/50"
                {...form.register("firstName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hpi-lastName">Last name</Label>
              <Input
                id="hpi-lastName"
                readOnly
                className="bg-muted/50"
                {...form.register("lastName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hpi-dob">Date of birth</Label>
              <Input
                id="hpi-dob"
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
              <Label htmlFor="hpi-gender">Gender</Label>
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

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Validate
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
