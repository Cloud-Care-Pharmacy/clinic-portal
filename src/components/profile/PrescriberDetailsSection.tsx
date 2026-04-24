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
  title: z.string().max(50).optional().or(z.literal("")),
  qualifications: z.string().min(1, "Qualifications are required").max(500),
  specialty: z.string().min(1, "Specialty is required"),
  prescriberNumber: z.string().min(1, "Prescriber number is required").max(10),
  ahpraNumber: z.string().max(20).optional().or(z.literal("")),
  hospitalProviderNumber: z.string().max(20).optional().or(z.literal("")),
  businessPhone: z.string().min(1, "Business phone is required").max(20),
  businessEmail: z.string().email("Invalid email").or(z.literal("")).optional(),
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
      title: "",
      qualifications: "",
      specialty: "",
      prescriberNumber: "",
      ahpraNumber: "",
      hospitalProviderNumber: "",
      businessPhone: "",
      businessEmail: "",
      providerNumber: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        title: profile.title ?? "",
        qualifications: profile.qualifications ?? "",
        specialty: profile.specialty ?? "",
        prescriberNumber: profile.prescriber_number ?? "",
        ahpraNumber: profile.ahpra_number ?? "",
        hospitalProviderNumber: profile.hospital_provider_number ?? "",
        businessPhone: profile.business_phone ?? "",
        businessEmail: profile.business_email ?? "",
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
      title: result.data.title || undefined,
      qualifications: result.data.qualifications,
      specialty: result.data.specialty,
      prescriberNumber: result.data.prescriberNumber,
      ahpraNumber: result.data.ahpraNumber || undefined,
      hospitalProviderNumber: result.data.hospitalProviderNumber || undefined,
      businessPhone: result.data.businessPhone,
      businessEmail: result.data.businessEmail || undefined,
      providerNumber: result.data.providerNumber || undefined,
    };

    updateProfile.mutate(payload, {
      onSuccess: () => toast.success("Prescriber details updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Prescriber details</CardTitle>
        <CardDescription>
          Your professional credentials and registration information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pd-title">Title</Label>
              <Input id="pd-title" placeholder="e.g. Dr." {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-qualifications">
                Qualifications <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pd-qualifications"
                placeholder="e.g. MBBS, FRACGP"
                aria-invalid={!!form.formState.errors.qualifications}
                {...form.register("qualifications")}
              />
              {form.formState.errors.qualifications && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.qualifications.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-specialty">
                Specialty <span className="text-red-500">*</span>
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
                <p className="text-sm text-red-500">
                  {form.formState.errors.specialty.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-prescriberNumber">
                Prescriber # <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pd-prescriberNumber"
                placeholder="e.g. 1234567"
                maxLength={10}
                aria-invalid={!!form.formState.errors.prescriberNumber}
                {...form.register("prescriberNumber")}
              />
              {form.formState.errors.prescriberNumber && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.prescriberNumber.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pd-ahpra">AHPRA #</Label>
              <Input id="pd-ahpra" placeholder="" {...form.register("ahpraNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-hospitalProvider">Hospital provider #</Label>
              <Input
                id="pd-hospitalProvider"
                placeholder=""
                {...form.register("hospitalProviderNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-businessPhone">
                Business phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pd-businessPhone"
                type="tel"
                placeholder="e.g. 0434966529"
                aria-invalid={!!form.formState.errors.businessPhone}
                {...form.register("businessPhone")}
              />
              {form.formState.errors.businessPhone && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.businessPhone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-businessEmail">Business email</Label>
              <Input
                id="pd-businessEmail"
                type="email"
                placeholder=""
                {...form.register("businessEmail")}
              />
              {form.formState.errors.businessEmail && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.businessEmail.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pd-providerNumber">Provider #</Label>
              <Input
                id="pd-providerNumber"
                placeholder=""
                {...form.register("providerNumber")}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
