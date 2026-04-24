"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UserProfile, UpdateUserProfilePayload } from "@/types";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const availabilitySchema = z.object({
  availabilityDays: z.array(z.string()).optional(),
});

type AvailabilityFormData = z.infer<typeof availabilitySchema>;

interface ProfileAvailabilityTabProps {
  profile: UserProfile | null;
}

export function ProfileAvailabilityTab({ profile }: ProfileAvailabilityTabProps) {
  const updateProfile = useUpdateProfile();

  const form = useForm<AvailabilityFormData>({
    defaultValues: { availabilityDays: [] },
  });

  useEffect(() => {
    if (profile) {
      form.reset({ availabilityDays: profile.availability_days ?? [] });
    }
  }, [profile, form]);

  function onSubmit(data: AvailabilityFormData) {
    const result = availabilitySchema.safeParse(data);
    if (!result.success) return;

    const payload: UpdateUserProfilePayload = {
      availabilityDays: result.data.availabilityDays?.length
        ? result.data.availabilityDays
        : undefined,
    };

    updateProfile.mutate(payload, {
      onSuccess: () => toast.success("Availability updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
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

      <div className="flex justify-end">
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
