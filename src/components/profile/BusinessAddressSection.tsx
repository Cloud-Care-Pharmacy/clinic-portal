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
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UserProfile, UpdateUserProfilePayload } from "@/types";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

const businessSchema = z.object({
  businessPhone: z.string().min(1, "Business phone is required").max(20),
  businessEmail: z.string().email("Invalid email").or(z.literal("")).optional(),
  businessStreetNumber: z.string().max(20).optional().or(z.literal("")),
  businessStreetName: z.string().max(100).optional().or(z.literal("")),
  businessSuburb: z.string().max(100).optional().or(z.literal("")),
  businessState: z.string().max(3).optional().or(z.literal("")),
  businessPostcode: z.string().max(10).optional().or(z.literal("")),
});

type BusinessFormData = z.infer<typeof businessSchema>;

interface BusinessAddressSectionProps {
  profile: UserProfile | null;
}

export function BusinessAddressSection({ profile }: BusinessAddressSectionProps) {
  const updateProfile = useUpdateProfile();

  const form = useForm<BusinessFormData>({
    defaultValues: {
      businessPhone: "",
      businessEmail: "",
      businessStreetNumber: "",
      businessStreetName: "",
      businessSuburb: "",
      businessState: "",
      businessPostcode: "",
    },
  });
  const businessStateValue = useWatch({
    control: form.control,
    name: "businessState",
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        businessPhone: profile.businessPhone ?? "",
        businessEmail: profile.businessEmail ?? "",
        businessStreetNumber: profile.businessStreetNumber ?? "",
        businessStreetName: profile.businessStreetName ?? "",
        businessSuburb: profile.businessSuburb ?? "",
        businessState: profile.businessState ?? "",
        businessPostcode: profile.businessPostcode ?? "",
      });
    }
  }, [profile, form]);

  function onSubmit(data: BusinessFormData) {
    const result = businessSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof BusinessFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdateUserProfilePayload = {
      businessPhone: result.data.businessPhone,
      businessEmail: result.data.businessEmail || undefined,
      businessStreetNumber: result.data.businessStreetNumber || undefined,
      businessStreetName: result.data.businessStreetName || undefined,
      businessSuburb: result.data.businessSuburb || undefined,
      businessState: result.data.businessState || undefined,
      businessPostcode: result.data.businessPostcode || undefined,
    };

    updateProfile.mutate(payload, {
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
              <Label htmlFor="ba-businessPhone">
                Business phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ba-businessPhone"
                type="tel"
                placeholder="e.g. 0434966529"
                aria-invalid={!!form.formState.errors.businessPhone}
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
                {...form.register("businessEmail")}
              />
              {form.formState.errors.businessEmail && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.businessEmail.message}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Address search placeholder */}
          <div className="space-y-2">
            <Input
              placeholder="Search Address"
              disabled
              className="bg-muted/30 text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Address autocomplete coming soon. Enter details manually below.
            </p>
          </div>

          {/* Address fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ba-streetNumber">Street number</Label>
              <Input id="ba-streetNumber" {...form.register("businessStreetNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-streetName">Street name</Label>
              <Input id="ba-streetName" {...form.register("businessStreetName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-suburb">Suburb</Label>
              <Input id="ba-suburb" {...form.register("businessSuburb")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-state">State</Label>
              <Select
                value={businessStateValue || undefined}
                onValueChange={(v) => {
                  if (v) form.setValue("businessState", v, { shouldDirty: true });
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
              <Input
                id="ba-postcode"
                maxLength={10}
                {...form.register("businessPostcode")}
              />
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
