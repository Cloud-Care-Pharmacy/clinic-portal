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
import { Loader2 } from "lucide-react";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UserProfile, UpdateUserProfilePayload } from "@/types";

const hpiSchema = z.object({
  hpii: z
    .string()
    .refine((v) => v === "" || /^\d{16}$/.test(v), "HPII must be exactly 16 digits")
    .optional()
    .or(z.literal("")),
});

type HpiFormData = z.infer<typeof hpiSchema>;

interface PrescriberHpiSectionProps {
  profile: UserProfile | null;
}

export function PrescriberHpiSection({ profile }: PrescriberHpiSectionProps) {
  const updateProfile = useUpdateProfile();

  const form = useForm<HpiFormData>({
    defaultValues: { hpii: "" },
  });

  useEffect(() => {
    form.reset({ hpii: profile?.hpii ?? "" });
  }, [profile, form]);

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
              <Label htmlFor="hpi-hpii">HPII number</Label>
              <Input
                id="hpi-hpii"
                placeholder="16-digit identifier"
                maxLength={16}
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
