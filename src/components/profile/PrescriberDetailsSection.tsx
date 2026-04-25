"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StickyFormBar } from "@/components/shared/StickyFormBar";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UserProfile, UpdateUserProfilePayload } from "@/types";

const SPECIALTIES = [
  "General Practice",
  "Psychiatry",
  "Respiratory Medicine",
  "Addiction Medicine",
  "Pain Medicine",
  "Dermatology",
  "Internal Medicine",
  "Other",
] as const;

const prescriberSchema = z.object({
  hpii: z
    .string()
    .refine((v) => v === "" || /^\d{16}$/.test(v), "HPII must be exactly 16 digits")
    .optional()
    .or(z.literal("")),
  title: z.string().max(50).optional().or(z.literal("")),
  qualifications: z.string().min(1, "Qualifications are required").max(500),
  specialty: z.string().min(1, "Specialty is required"),
  prescriberNumber: z.string().min(1, "Prescriber number is required").max(10),
  ahpraNumber: z.string().max(20).optional().or(z.literal("")),
  hospitalProviderNumber: z.string().max(20).optional().or(z.literal("")),
  providerNumber: z.string().max(20).optional().or(z.literal("")),
});

type PrescriberFormData = z.infer<typeof prescriberSchema>;

interface PrescriberDetailsSectionProps {
  profile: UserProfile | null;
}

export function PrescriberDetailsSection({ profile }: PrescriberDetailsSectionProps) {
  const updateProfile = useUpdateProfile();

  const form = useForm<PrescriberFormData>({
    defaultValues: {
      hpii: "",
      title: "",
      qualifications: "",
      specialty: "",
      prescriberNumber: "",
      ahpraNumber: "",
      hospitalProviderNumber: "",
      providerNumber: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        hpii: profile.hpii ?? "",
        title: profile.title ?? "",
        qualifications: profile.qualifications ?? "",
        specialty: profile.specialty ?? "",
        prescriberNumber: profile.prescriber_number ?? "",
        ahpraNumber: profile.ahpra_number ?? "",
        hospitalProviderNumber: profile.hospital_provider_number ?? "",
        providerNumber: profile.provider_number ?? "",
      });
    }
  }, [profile, form]);

  function onSubmit(data: PrescriberFormData) {
    const result = prescriberSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PrescriberFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdateUserProfilePayload = {
      hpii: result.data.hpii || undefined,
      title: result.data.title || undefined,
      qualifications: result.data.qualifications,
      specialty: result.data.specialty,
      prescriberNumber: result.data.prescriberNumber,
      ahpraNumber: result.data.ahpraNumber || undefined,
      hospitalProviderNumber: result.data.hospitalProviderNumber || undefined,
      providerNumber: result.data.providerNumber || undefined,
    };

    updateProfile.mutate(payload, {
      onSuccess: () => toast.success("Prescriber details updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-base font-semibold">Prescriber details</h3>

          {/* Row 1: Title, Qualifications*, Specialty*, Prescriber #* */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pd-title">Title</Label>
              <Input id="pd-title" placeholder="e.g. Dr." {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-qualifications">
                Qualifications <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pd-qualifications"
                placeholder="e.g. MBBS, FRACGP"
                aria-invalid={!!form.formState.errors.qualifications}
                {...form.register("qualifications")}
              />
              {form.formState.errors.qualifications && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.qualifications.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-specialty">
                Specialty <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch("specialty") || undefined}
                onValueChange={(v) => {
                  if (v) form.setValue("specialty", v, { shouldDirty: true });
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={!!form.formState.errors.specialty}
                >
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.specialty && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.specialty.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-prescriberNumber">
                Prescriber # <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pd-prescriberNumber"
                placeholder="e.g. 1234567"
                maxLength={10}
                aria-invalid={!!form.formState.errors.prescriberNumber}
                {...form.register("prescriberNumber")}
              />
              {form.formState.errors.prescriberNumber && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.prescriberNumber.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: AHPRA #, Hospital provider #, Provider #, HPI-I */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pd-ahpra">AHPRA #</Label>
              <Input id="pd-ahpra" {...form.register("ahpraNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-hospitalProvider">Hospital provider #</Label>
              <Input
                id="pd-hospitalProvider"
                {...form.register("hospitalProviderNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-providerNumber">Provider #</Label>
              <Input id="pd-providerNumber" {...form.register("providerNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-hpii">HPI-I number</Label>
              <Input
                id="pd-hpii"
                placeholder="16-digit identifier"
                maxLength={16}
                aria-invalid={!!form.formState.errors.hpii}
                {...form.register("hpii")}
              />
              {form.formState.errors.hpii && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.hpii.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Healthcare Provider Identifier — Individual
              </p>
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
