"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useUnsavedChangesGuard } from "@/components/tasks/use-unsaved-changes-guard";
import { useUpdateWorkspaceEntitySettings } from "@/lib/hooks/use-workspace";
import type {
  UpdateWorkspaceEntitySettingsPayload,
  WorkspaceEntitySettings,
} from "@/types";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;
const ACTIVE_STATUS = ["active", "inactive"] as const;

const schema = z.object({
  name: z.string().trim().max(120, "Entity name must be 120 characters or fewer"),
  shopifyDomain: z.string().trim(),
  emailPrefix: z
    .string()
    .trim()
    .min(1, "Email prefix is required")
    .max(64, "Email prefix must be 64 characters or fewer"),
  isActive: z.enum(ACTIVE_STATUS),
  businessPhone: z.string().trim().max(20, "Business phone is too long"),
  businessEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid business email"
    ),
  abn: z.string().trim().max(20, "ABN must be 20 characters or fewer"),
  streetNumber: z.string().trim().max(20, "Street number is too long"),
  streetName: z.string().trim().max(100, "Street name is too long"),
  suburb: z.string().trim().max(100, "Suburb is too long"),
  state: z.string().trim().max(3, "State is too long"),
  postcode: z.string().trim().max(10, "Postcode is too long"),
  country: z.string().trim().max(60, "Country is too long"),
});

type FormData = z.infer<typeof schema>;

interface EntitySettingsFormProps {
  entityId: string;
  settings: WorkspaceEntitySettings | null;
  backendUnavailable?: boolean;
}

function buildDefaults(settings: WorkspaceEntitySettings | null): FormData {
  return {
    name: settings?.name ?? "",
    shopifyDomain: settings?.shopifyDomain ?? "",
    emailPrefix: settings?.emailPrefix ?? "",
    isActive: settings?.isActive === false ? "inactive" : "active",
    businessPhone: settings?.businessPhone ?? "",
    businessEmail: settings?.businessEmail ?? "",
    abn: settings?.abn ?? "",
    streetNumber: settings?.address?.streetNumber ?? "",
    streetName: settings?.address?.streetName ?? "",
    suburb: settings?.address?.suburb ?? "",
    state: settings?.address?.state ?? "",
    postcode: settings?.address?.postcode ?? "",
    country: settings?.address?.country ?? "Australia",
  };
}

export function EntitySettingsForm({
  entityId,
  settings,
  backendUnavailable,
}: EntitySettingsFormProps) {
  const updateSettings = useUpdateWorkspaceEntitySettings();
  const form = useForm<FormData>({ defaultValues: buildDefaults(settings) });
  const stateValue = useWatch({ control: form.control, name: "state" });
  const activeValue = useWatch({ control: form.control, name: "isActive" });
  const disabled = backendUnavailable || updateSettings.isPending || !settings;

  useEffect(() => {
    form.reset(buildDefaults(settings));
  }, [form, settings]);

  useUnsavedChangesGuard({
    active: form.formState.isDirty,
    message: "Discard unsaved entity settings?",
  });

  function setFieldError(issue: z.core.$ZodIssue) {
    const field = issue.path[0] as keyof FormData | undefined;
    if (field) form.setError(field, { message: issue.message });
  }

  function onSubmit(data: FormData) {
    const result = schema.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach(setFieldError);
      return;
    }

    if (backendUnavailable) {
      toast.error("Entity settings endpoint unavailable");
      return;
    }

    const payload: UpdateWorkspaceEntitySettingsPayload = {
      name: result.data.name || null,
      emailPrefix: result.data.emailPrefix,
      isActive: result.data.isActive === "active",
      businessPhone: result.data.businessPhone || null,
      businessEmail: result.data.businessEmail || null,
      abn: result.data.abn || null,
      address: {
        streetNumber: result.data.streetNumber || null,
        streetName: result.data.streetName || null,
        suburb: result.data.suburb || null,
        state: result.data.state || null,
        postcode: result.data.postcode || null,
        country: result.data.country || null,
      },
    };

    updateSettings.mutate(
      { entityId, data: payload },
      {
        onSuccess: () => toast.success("Entity settings updated"),
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to update settings"
          );
        },
      }
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {backendUnavailable ? (
        <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
          Entity settings are shown read-only until GET and PUT
          /api/entities/:entityId/settings are available.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Basic identity</CardTitle>
          <CardDescription>
            Core workspace identity and routing settings for generated addresses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="entityName">Entity name</Label>
              <Input
                id="entityName"
                disabled={disabled}
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="shopifyDomain">Shopify domain</Label>
              <Input
                id="shopifyDomain"
                readOnly
                disabled={!settings}
                {...form.register("shopifyDomain")}
              />
              <p className="text-xs text-muted-foreground">
                Shopify domain is managed by the backend integration.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="emailPrefix">Email prefix</Label>
              <Input
                id="emailPrefix"
                disabled={disabled}
                aria-invalid={!!form.formState.errors.emailPrefix}
                {...form.register("emailPrefix")}
              />
              {form.formState.errors.emailPrefix ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.emailPrefix.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="entityActiveStatus">Active status</Label>
              <Select
                value={activeValue}
                disabled={disabled}
                onValueChange={(value) => {
                  if (value) {
                    form.setValue("isActive", value as FormData["isActive"], {
                      shouldDirty: true,
                    });
                  }
                }}
              >
                <SelectTrigger id="entityActiveStatus" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business contact</CardTitle>
          <CardDescription>
            Public business contact details for the entity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="businessPhone">Business phone</Label>
              <Input
                id="businessPhone"
                type="tel"
                disabled={disabled}
                aria-invalid={!!form.formState.errors.businessPhone}
                {...form.register("businessPhone")}
              />
              {form.formState.errors.businessPhone ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.businessPhone.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Business email</Label>
              <Input
                id="businessEmail"
                type="email"
                disabled={disabled}
                aria-invalid={!!form.formState.errors.businessEmail}
                {...form.register("businessEmail")}
              />
              {form.formState.errors.businessEmail ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.businessEmail.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="abn">ABN</Label>
              <Input id="abn" disabled={disabled} {...form.register("abn")} />
              <p className="text-xs text-muted-foreground">
                Australian Business Number.
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="streetNumber">Street number</Label>
              <Input
                id="streetNumber"
                disabled={disabled}
                {...form.register("streetNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="streetName">Street name</Label>
              <Input
                id="streetName"
                disabled={disabled}
                {...form.register("streetName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb</Label>
              <Input id="suburb" disabled={disabled} {...form.register("suburb")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={stateValue || undefined}
                disabled={disabled}
                onValueChange={(value) => {
                  if (value) form.setValue("state", value, { shouldDirty: true });
                }}
              >
                <SelectTrigger id="state" className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {AU_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                maxLength={10}
                disabled={disabled}
                {...form.register("postcode")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" disabled={disabled} {...form.register("country")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <StickyFormBar
        isDirty={form.formState.isDirty && !backendUnavailable}
        isPending={updateSettings.isPending}
        onDiscard={() => form.reset(buildDefaults(settings))}
      />
    </form>
  );
}
