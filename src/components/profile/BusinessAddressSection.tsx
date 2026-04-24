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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UserProfile, UpdateUserProfilePayload } from "@/types";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

const addressSchema = z.object({
  businessStreetNumber: z.string().max(20).optional().or(z.literal("")),
  businessStreetName: z.string().max(100).optional().or(z.literal("")),
  businessSuburb: z.string().max(100).optional().or(z.literal("")),
  businessState: z.string().max(3).optional().or(z.literal("")),
  businessPostcode: z.string().max(10).optional().or(z.literal("")),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface BusinessAddressSectionProps {
  profile: UserProfile | null;
}

export function BusinessAddressSection({ profile }: BusinessAddressSectionProps) {
  const updateProfile = useUpdateProfile();

  const form = useForm<AddressFormData>({
    defaultValues: {
      businessStreetNumber: "",
      businessStreetName: "",
      businessSuburb: "",
      businessState: "",
      businessPostcode: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        businessStreetNumber: profile.business_street_number ?? "",
        businessStreetName: profile.business_street_name ?? "",
        businessSuburb: profile.business_suburb ?? "",
        businessState: profile.business_state ?? "",
        businessPostcode: profile.business_postcode ?? "",
      });
    }
  }, [profile, form]);

  function onSubmit(data: AddressFormData) {
    const result = addressSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof AddressFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdateUserProfilePayload = {
      businessStreetNumber: result.data.businessStreetNumber || undefined,
      businessStreetName: result.data.businessStreetName || undefined,
      businessSuburb: result.data.businessSuburb || undefined,
      businessState: result.data.businessState || undefined,
      businessPostcode: result.data.businessPostcode || undefined,
    };

    updateProfile.mutate(payload, {
      onSuccess: () => toast.success("Business address updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Business address</CardTitle>
        <CardDescription>Your business practice address.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Search placeholder */}
          <div className="space-y-2">
            <Input placeholder="Search Address" disabled className="bg-muted/30" />
            <p className="text-xs text-muted-foreground">
              Address autocomplete coming soon. Enter details manually below.
            </p>
          </div>

          <Separator />

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
                value={form.watch("businessState") || undefined}
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
