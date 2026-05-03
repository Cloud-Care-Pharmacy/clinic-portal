"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useUpdatePractitioner } from "@/lib/hooks/use-practitioner";
import type { PractitionerProfile, UpdatePractitionerPayload } from "@/types";

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
  qualifications: z.string().max(500).optional().or(z.literal("")),
  specialty: z.string().max(100).optional().or(z.literal("")),
  prescriberNumber: z.string().max(20).optional().or(z.literal("")),
  ahpraNumber: z.string().max(50).optional().or(z.literal("")),
  hospitalProviderNumber: z.string().max(50).optional().or(z.literal("")),
  providerNumber: z.string().max(50).optional().or(z.literal("")),
  hpii: z
    .string()
    .refine((v) => v === "" || v.length === 16, "HPII must be exactly 16 characters")
    .optional()
    .or(z.literal("")),
});

type PrescriberFormData = z.infer<typeof prescriberSchema>;

interface PrescriberDetailsSectionProps {
  practitioner: PractitionerProfile | null;
}

export function PrescriberDetailsSection({
  practitioner,
}: PrescriberDetailsSectionProps) {
  const updatePractitioner = useUpdatePractitioner();

  const form = useForm<PrescriberFormData>({
    defaultValues: {
      title: "",
      qualifications: "",
      specialty: "",
      prescriberNumber: "",
      ahpraNumber: "",
      hospitalProviderNumber: "",
      providerNumber: "",
      hpii: "",
    },
  });
  const specialtyValue = useWatch({ control: form.control, name: "specialty" });

  useEffect(() => {
    form.reset({
      title: practitioner?.title ?? "",
      qualifications: practitioner?.qualifications ?? "",
      specialty: practitioner?.specialty ?? "",
      prescriberNumber: practitioner?.prescriberNumber ?? "",
      ahpraNumber: practitioner?.ahpraNumber ?? "",
      hospitalProviderNumber: practitioner?.hospitalProviderNumber ?? "",
      providerNumber: practitioner?.providerNumber ?? "",
      hpii: practitioner?.hpii ?? "",
    });
  }, [practitioner, form]);

  function onSubmit(data: PrescriberFormData) {
    const result = prescriberSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PrescriberFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdatePractitionerPayload = {
      title: result.data.title || null,
      qualifications: result.data.qualifications || null,
      specialty: result.data.specialty || null,
      prescriberNumber: result.data.prescriberNumber || null,
      ahpraNumber: result.data.ahpraNumber || null,
      hospitalProviderNumber: result.data.hospitalProviderNumber || null,
      providerNumber: result.data.providerNumber || null,
      hpii: result.data.hpii || null,
    };

    updatePractitioner.mutate(payload, {
      onSuccess: () => toast.success("Prescriber details updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {!practitioner && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No practitioner profile yet — fill in the fields below and save to create
              one.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Prescriber details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Title, Qualifications, Specialty, Prescriber # */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pd-title">Title</Label>
              <Input id="pd-title" placeholder="e.g. Dr." {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-qualifications">Qualifications</Label>
              <Input
                id="pd-qualifications"
                placeholder="e.g. MBBS, FRACGP"
                {...form.register("qualifications")}
              />
              {form.formState.errors.qualifications && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.qualifications.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-specialty">Specialty</Label>
              <Select
                value={specialtyValue || undefined}
                onValueChange={(v) => {
                  if (v) form.setValue("specialty", v, { shouldDirty: true });
                }}
              >
                <SelectTrigger className="w-full">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-prescriberNumber">Prescriber #</Label>
              <Input
                id="pd-prescriberNumber"
                placeholder="e.g. 1234567"
                maxLength={20}
                {...form.register("prescriberNumber")}
              />
            </div>
          </div>

          {/* Row 2: AHPRA #, Hospital provider #, Provider #, HPI-I */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pd-ahpra">AHPRA #</Label>
              <Input
                id="pd-ahpra"
                placeholder="e.g. MED0001234567"
                {...form.register("ahpraNumber")}
              />
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
                placeholder="16-character identifier"
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
        isPending={updatePractitioner.isPending}
        onDiscard={() => form.reset()}
      />
    </form>
  );
}
