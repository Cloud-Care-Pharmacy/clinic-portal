"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Video, Building2, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { StickyFormBar } from "@/components/shared/StickyFormBar";
import { useUpdateAvailability } from "@/lib/hooks/use-profile";
import type { AvailabilityDayKey, UserProfile } from "@/types";

const DAYS_OF_WEEK = [
  { label: "Monday", key: "monday" },
  { label: "Tuesday", key: "tuesday" },
  { label: "Wednesday", key: "wednesday" },
  { label: "Thursday", key: "thursday" },
  { label: "Friday", key: "friday" },
  { label: "Saturday", key: "saturday" },
  { label: "Sunday", key: "sunday" },
] as const;

const CONSULT_TYPES = [
  { id: "telehealth", name: "Telehealth", desc: "Video & phone consults", icon: Video },
  { id: "in-person", name: "In-person", desc: "Clinic appointments", icon: Building2 },
  {
    id: "home-visit",
    name: "Home visits",
    desc: "Off-site consultations",
    icon: House,
  },
] as const;

const daySchema = z.object({
  day: z.string(),
  key: z.string(),
  enabled: z.boolean(),
  start: z.string(),
  end: z.string(),
});

const availabilitySchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
  days: z.array(daySchema),
});

type AvailabilityFormData = z.infer<typeof availabilitySchema>;

interface ProfileAvailabilityTabProps {
  profile: UserProfile | null;
}

export function ProfileAvailabilityTab({ profile }: ProfileAvailabilityTabProps) {
  const updateAvailability = useUpdateAvailability();

  const form = useForm<AvailabilityFormData>({
    defaultValues: {
      timezone: "Australia/Sydney",
      days: DAYS_OF_WEEK.map((d) => ({
        day: d.label,
        key: d.key,
        enabled: false,
        start: "09:00",
        end: "17:00",
      })),
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: "days" });
  const watchedDays = useWatch({ control: form.control, name: "days" });

  useEffect(() => {
    if (profile) {
      const activeDays = profile.availability_days ?? [];
      form.reset({
        timezone: "Australia/Sydney",
        days: DAYS_OF_WEEK.map((d) => ({
          day: d.label,
          key: d.key,
          enabled: activeDays.includes(d.label),
          start: "09:00",
          end: "17:00",
        })),
      });
    }
  }, [profile, form]);

  function onSubmit(data: AvailabilityFormData) {
    const result = availabilitySchema.safeParse(data);
    if (!result.success) return;

    const availability = DAYS_OF_WEEK.reduce(
      (acc, day) => {
        const row = result.data.days.find((d) => d.key === day.key);
        acc[day.key] = row?.enabled ? [{ start: row.start, end: row.end }] : [];
        return acc;
      },
      {} as Record<AvailabilityDayKey, { start: string; end: string }[]>
    );

    updateAvailability.mutate(
      { timezone: result.data.timezone, availability },
      {
        onSuccess: () => toast.success("Availability updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Working hours */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-base font-semibold">Working hours</h3>
            <div className="w-full space-y-2 sm:w-56">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="timezone"
              >
                Timezone
              </label>
              <Input id="timezone" className="h-9" {...form.register("timezone")} />
            </div>
          </div>
          <div className="space-y-0">
            {fields.map((field, idx) => {
              const enabled = watchedDays?.[idx]?.enabled ?? false;
              return (
                <div
                  key={field.id}
                  className={cn(
                    "grid items-center gap-3 py-2.5",
                    "grid-cols-[120px_auto_120px_12px_120px]",
                    idx < fields.length - 1 && "border-b"
                  )}
                >
                  <span className="text-sm font-medium">{field.day}</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      form.setValue(`days.${idx}.enabled`, !!checked, {
                        shouldDirty: true,
                      })
                    }
                  />
                  <Input
                    type="time"
                    className={cn(
                      "h-9 text-[13px]",
                      !enabled && "opacity-35 pointer-events-none"
                    )}
                    {...form.register(`days.${idx}.start`)}
                  />
                  <span
                    className={cn(
                      "text-center text-muted-foreground",
                      !enabled && "opacity-35"
                    )}
                  >
                    &ndash;
                  </span>
                  <Input
                    type="time"
                    className={cn(
                      "h-9 text-[13px]",
                      !enabled && "opacity-35 pointer-events-none"
                    )}
                    {...form.register(`days.${idx}.end`)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Consultation types */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-base font-semibold">Consultation types</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CONSULT_TYPES.map((t, idx) => {
              const isOn = idx < 2; // default: first two enabled (static for now)
              const Icon = t.icon;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors",
                    isOn
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leave & unavailability */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold">Leave &amp; unavailability</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Block out dates when you&apos;re unavailable for consultations.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button type="button" variant="outline" className="border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              Add leave period
            </Button>
            <span className="text-[13px] text-muted-foreground">
              No upcoming leave scheduled.
            </span>
          </div>
        </CardContent>
      </Card>

      <StickyFormBar
        isDirty={form.formState.isDirty}
        isPending={updateAvailability.isPending}
        onDiscard={() => form.reset()}
      />
    </form>
  );
}
