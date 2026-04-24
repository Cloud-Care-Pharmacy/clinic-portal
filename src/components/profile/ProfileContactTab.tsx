"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import type { UserProfile, UpdateUserProfilePayload, UserRole } from "@/types";

const profileSchema = z.object({
  phone: z.string().max(20, "Phone number too long").optional().or(z.literal("")),
});

type ContactFormData = z.infer<typeof profileSchema>;

interface ProfileContactTabProps {
  profile: UserProfile | null;
  role: UserRole;
}

export function ProfileContactTab({ profile, role }: ProfileContactTabProps) {
  const updateProfile = useUpdateProfile();

  const form = useForm<ContactFormData>({
    defaultValues: { phone: "" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({ phone: profile.phone ?? "" });
    }
  }, [profile, form]);

  function onSubmit(data: ContactFormData) {
    const result = profileSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ContactFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdateUserProfilePayload = {
      phone: result.data.phone || undefined,
    };

    if (!profile) {
      payload.role = role;
    }

    updateProfile.mutate(payload, {
      onSuccess: () => toast.success("Contact details updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+61 4XX XXX XXX"
              {...form.register("phone")}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-red-500">
                {form.formState.errors.phone.message}
              </p>
            )}
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
