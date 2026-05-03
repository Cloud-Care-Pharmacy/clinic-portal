"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import { StickyFormBar } from "@/components/shared/StickyFormBar";
import { useUpdatePractitioner } from "@/lib/hooks/use-practitioner";
import type { PractitionerProfile, UpdatePractitionerPayload } from "@/types";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

const businessSchema = z.object({
  businessPhone: z.string().max(20).optional().or(z.literal("")),
  businessEmail: z
    .string()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email")
    .optional()
    .or(z.literal("")),
  abn: z.string().max(20).optional().or(z.literal("")),
  streetNumber: z.string().max(20).optional().or(z.literal("")),
  streetName: z.string().max(100).optional().or(z.literal("")),
  suburb: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(3).optional().or(z.literal("")),
  postcode: z.string().max(10).optional().or(z.literal("")),
});

type BusinessFormData = z.infer<typeof businessSchema>;

interface BusinessDetailsSectionProps {
  practitioner: PractitionerProfile | null;
}

export function BusinessDetailsSection({ practitioner }: BusinessDetailsSectionProps) {
  const updatePractitioner = useUpdatePractitioner();

  const form = useForm<BusinessFormData>({
    defaultValues: {
      businessPhone: "",
      businessEmail: "",
      abn: "",
      streetNumber: "",
      streetName: "",
      suburb: "",
      state: "",
      postcode: "",
    },
  });
  const stateValue = useWatch({ control: form.control, name: "state" });

  useEffect(() => {
    const business = practitioner?.business ?? null;
    form.reset({
      businessPhone: business?.businessPhone ?? "",
      businessEmail: business?.businessEmail ?? "",
      abn: business?.abn ?? "",
      streetNumber: business?.address?.streetNumber ?? "",
      streetName: business?.address?.streetName ?? "",
      suburb: business?.address?.suburb ?? "",
      state: business?.address?.state ?? "",
      postcode: business?.address?.postcode ?? "",
    });
  }, [practitioner, form]);

  function onSubmit(data: BusinessFormData) {
    const result = businessSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof BusinessFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdatePractitionerPayload = {
      business: {
        businessPhone: result.data.businessPhone || null,
        businessEmail: result.data.businessEmail || null,
        abn: result.data.abn || null,
        address: {
          streetNumber: result.data.streetNumber || null,
          streetName: result.data.streetName || null,
          suburb: result.data.suburb || null,
          state: result.data.state || null,
          postcode: result.data.postcode || null,
        },
      },
    };

    updatePractitioner.mutate(payload, {
      onSuccess: () => toast.success("Business details updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-base font-semibold">Business details</h3>

          {/* Business contact */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ba-businessPhone">Business phone</Label>
              <Input
                id="ba-businessPhone"
                type="tel"
                placeholder="e.g. +61 2 9000 0000"
                {...form.register("businessPhone")}
              />
              {form.formState.errors.businessPhone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.businessPhone.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-businessEmail">Business email</Label>
              <Input
                id="ba-businessEmail"
                type="email"
                placeholder="clinic@example.com"
                aria-invalid={!!form.formState.errors.businessEmail}
                {...form.register("businessEmail")}
              />
              {form.formState.errors.businessEmail && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.businessEmail.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-abn">ABN</Label>
              <Input
                id="ba-abn"
                placeholder="e.g. 51 824 753 556"
                {...form.register("abn")}
              />
              <p className="text-xs text-muted-foreground">
                Australian Business Number
              </p>
            </div>
          </div>

          <Separator />

          {/* Address fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ba-streetNumber">Street number</Label>
              <Input id="ba-streetNumber" {...form.register("streetNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-streetName">Street name</Label>
              <Input id="ba-streetName" {...form.register("streetName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-suburb">Suburb</Label>
              <Input id="ba-suburb" {...form.register("suburb")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-state">State</Label>
              <Select
                value={stateValue || undefined}
                onValueChange={(v) => {
                  if (v) form.setValue("state", v, { shouldDirty: true });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {AU_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ba-postcode">Postcode</Label>
              <Input id="ba-postcode" maxLength={10} {...form.register("postcode")} />
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
