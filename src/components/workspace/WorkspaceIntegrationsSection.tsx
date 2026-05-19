"use client";

import { useEffect, useId, useState } from "react";
import {
  CreditCard,
  type LucideIcon,
  Megaphone,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Workflow,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AppSheet } from "@/components/shared/AppSheet";
import { Alert, AlertBody, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

type IntegrationId = "shopify" | "stripe" | "xero" | "mailchimp";

interface IntegrationDefinition {
  id: IntegrationId;
  name: string;
  summary: string;
  icon: LucideIcon;
}

const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  {
    id: "shopify",
    name: "Shopify",
    summary: "Sync products and order events from your Shopify store.",
    icon: ShoppingBag,
  },
  {
    id: "stripe",
    name: "Stripe",
    summary: "Import payment status updates and payout references.",
    icon: CreditCard,
  },
  {
    id: "xero",
    name: "Xero",
    summary: "Push invoices and reconcile transaction records.",
    icon: ReceiptText,
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    summary: "Send lifecycle automations from patient segmentation rules.",
    icon: Megaphone,
  },
];

interface IntegrationsState {
  enabled: boolean;
  integrations: Record<IntegrationId, IntegrationSettings>;
}

type SyncMode = "manual" | "hourly" | "daily";

interface IntegrationSettings {
  connected: boolean;
  accountId: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  syncMode: SyncMode;
  autoSync: boolean;
  configuredAt: string | null;
}

const DEFAULT_STATE: IntegrationsState = {
  enabled: false,
  integrations: {
    shopify: {
      connected: false,
      accountId: "",
      apiKey: "",
      apiSecret: "",
      webhookSecret: "",
      syncMode: "hourly",
      autoSync: true,
      configuredAt: null,
    },
    stripe: {
      connected: false,
      accountId: "",
      apiKey: "",
      apiSecret: "",
      webhookSecret: "",
      syncMode: "daily",
      autoSync: false,
      configuredAt: null,
    },
    xero: {
      connected: false,
      accountId: "",
      apiKey: "",
      apiSecret: "",
      webhookSecret: "",
      syncMode: "daily",
      autoSync: false,
      configuredAt: null,
    },
    mailchimp: {
      connected: false,
      accountId: "",
      apiKey: "",
      apiSecret: "",
      webhookSecret: "",
      syncMode: "manual",
      autoSync: false,
      configuredAt: null,
    },
  },
};

const integrationSettingsSchema = z.object({
  accountId: z.string().trim().min(1, "Account/store ID is required"),
  apiKey: z.string().trim().min(1, "API key is required"),
  apiSecret: z.string().trim().min(1, "API secret is required"),
  webhookSecret: z.string().trim().optional(),
  syncMode: z.enum(["manual", "hourly", "daily"]),
  autoSync: z.boolean(),
});

type IntegrationSettingsForm = z.infer<typeof integrationSettingsSchema>;

function getStorageKey(entityId: string) {
  return `workspace-integrations:${entityId}`;
}

function cloneDefaultIntegrations(): Record<IntegrationId, IntegrationSettings> {
  return {
    shopify: { ...DEFAULT_STATE.integrations.shopify },
    stripe: { ...DEFAULT_STATE.integrations.stripe },
    xero: { ...DEFAULT_STATE.integrations.xero },
    mailchimp: { ...DEFAULT_STATE.integrations.mailchimp },
  };
}

function getStoredIntegrationsState(entityId: string): IntegrationsState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  const raw = window.localStorage.getItem(getStorageKey(entityId));
  if (!raw) return DEFAULT_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<IntegrationsState>;

    const integrations = cloneDefaultIntegrations();
    const maybeIntegrations = parsed.integrations;
    if (maybeIntegrations && typeof maybeIntegrations === "object") {
      for (const integration of INTEGRATION_CATALOG) {
        const value = (maybeIntegrations as Record<string, Partial<IntegrationSettings>>)[
          integration.id
        ];
        if (!value) continue;
        integrations[integration.id] = {
          ...integrations[integration.id],
          connected: Boolean(value.connected),
          accountId: value.accountId ?? integrations[integration.id].accountId,
          apiKey: value.apiKey ?? integrations[integration.id].apiKey,
          apiSecret: value.apiSecret ?? integrations[integration.id].apiSecret,
          webhookSecret:
            value.webhookSecret ?? integrations[integration.id].webhookSecret,
          syncMode:
            value.syncMode === "manual" ||
            value.syncMode === "hourly" ||
            value.syncMode === "daily"
              ? value.syncMode
              : integrations[integration.id].syncMode,
          autoSync: Boolean(value.autoSync),
          configuredAt: value.configuredAt ?? integrations[integration.id].configuredAt,
        };
      }
    }

    // Backward compatibility for old shape using activeIntegrations array.
    const legacyActive = (parsed as { activeIntegrations?: unknown }).activeIntegrations;
    if (Array.isArray(legacyActive)) {
      legacyActive.forEach((id) => {
        if (typeof id === "string" && id in integrations) {
          integrations[id as IntegrationId].connected = true;
        }
      });
    }

    return {
      enabled: Boolean(parsed.enabled),
      integrations,
    };
  } catch {
    window.localStorage.removeItem(getStorageKey(entityId));
    return DEFAULT_STATE;
  }
}

export function WorkspaceIntegrationsSection({ entityId }: { entityId: string }) {
  const [state, setState] = useState<IntegrationsState>(() =>
    getStoredIntegrationsState(entityId)
  );
  const [activeIntegrationId, setActiveIntegrationId] = useState<IntegrationId | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const formId = useId();
  const form = useForm<IntegrationSettingsForm>({
    defaultValues: {
      accountId: "",
      apiKey: "",
      apiSecret: "",
      webhookSecret: "",
      syncMode: "hourly",
      autoSync: true,
    },
  });
  const syncMode = useWatch({ control: form.control, name: "syncMode" });
  const autoSync = useWatch({ control: form.control, name: "autoSync" });

  useEffect(() => {
    const storageKey = getStorageKey(entityId);
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [entityId, state]);

  const activeIntegration = activeIntegrationId
    ? INTEGRATION_CATALOG.find((integration) => integration.id === activeIntegrationId)
    : null;
  const activeIntegrationSettings = activeIntegrationId
    ? state.integrations[activeIntegrationId]
    : null;

  function setFieldError(issue: z.core.$ZodIssue) {
    const field = issue.path[0] as keyof IntegrationSettingsForm | undefined;
    if (field) form.setError(field, { message: issue.message });
  }

  function openSettingsSheet(integrationId: IntegrationId) {
    const settings = state.integrations[integrationId];
    setActiveIntegrationId(integrationId);
    form.reset({
      accountId: settings.accountId,
      apiKey: settings.apiKey,
      apiSecret: settings.apiSecret,
      webhookSecret: settings.webhookSecret,
      syncMode: settings.syncMode,
      autoSync: settings.autoSync,
    });
    setSheetOpen(true);
  }

  function requestSheetOpenChange(nextOpen: boolean) {
    if (!nextOpen && form.formState.isDirty) {
      if (!window.confirm("Discard unsaved integration settings?")) {
        return;
      }
    }
    setSheetOpen(nextOpen);
    if (!nextOpen) {
      form.reset(form.getValues());
    }
  }

  function toggleWorkspaceIntegrations(nextEnabled: boolean) {
    setState((current) => ({
      ...current,
      enabled: nextEnabled,
    }));
    toast.success(nextEnabled ? "Integrations enabled" : "Integrations paused");
  }

  function saveIntegrationSettings(data: IntegrationSettingsForm) {
    if (!activeIntegrationId || !activeIntegration) return;
    if (!state.enabled) {
      toast.error("Enable integrations first");
      return;
    }

    const parsed = integrationSettingsSchema.safeParse(data);
    if (!parsed.success) {
      parsed.error.issues.forEach(setFieldError);
      return;
    }

    setState((current) => ({
      ...current,
      integrations: {
        ...current.integrations,
        [activeIntegrationId]: {
          ...current.integrations[activeIntegrationId],
          ...parsed.data,
          connected: true,
          configuredAt: new Date().toISOString(),
        },
      },
    }));

    toast.success(`${activeIntegration.name} settings saved`);
    setSheetOpen(false);
  }

  function disconnectIntegration() {
    if (!activeIntegrationId || !activeIntegration) return;

    setState((current) => ({
      ...current,
      integrations: {
        ...current.integrations,
        [activeIntegrationId]: {
          ...current.integrations[activeIntegrationId],
          connected: false,
        },
      },
    }));
    toast.success(`${activeIntegration.name} disconnected`);
    setSheetOpen(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="size-4" />
            Integrations
          </CardTitle>
          <CardDescription>
            Enable app integrations for this workspace, then connect providers like
            Shopify.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Enable integrations</p>
              <p className="text-sm text-muted-foreground">
                Controls whether connected apps can sync data to this workspace.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge variant={state.enabled ? "success" : "neutral"}>
                {state.enabled ? "Enabled" : "Disabled"}
              </StatusBadge>
              <Switch
                checked={state.enabled}
                onCheckedChange={toggleWorkspaceIntegrations}
                aria-label="Enable integrations for this workspace"
              />
            </div>
          </div>

          {!state.enabled ? (
            <Alert variant="info">
              <AlertTitle>Integrations are paused</AlertTitle>
              <AlertBody>
                Turn on integrations to connect providers and allow sync jobs.
              </AlertBody>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {INTEGRATION_CATALOG.map((integration) => {
              const integrationSettings = state.integrations[integration.id];
              const isConnected = integrationSettings.connected;
              const Icon = integration.icon;

              return (
                <div
                  key={integration.id}
                  className={cn(
                    "rounded-lg border p-3",
                    isConnected ? "border-border bg-muted/20" : "border-border"
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Icon className="size-4" />
                        {integration.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{integration.summary}</p>
                    </div>
                    <StatusBadge variant={isConnected ? "success" : "neutral"}>
                      {isConnected ? "Connected" : "Not connected"}
                    </StatusBadge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {isConnected
                        ? "Credentials and sync preferences saved"
                        : "Open sidebar to add credentials and settings"}
                    </p>
                    <Button
                      type="button"
                      variant={isConnected ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => openSettingsSheet(integration.id)}
                      disabled={!state.enabled}
                    >
                      <Settings2 className="size-4" />
                      {isConnected ? "Edit settings" : "Connect"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AppSheet
        open={sheetOpen}
        onOpenChange={requestSheetOpenChange}
        title={activeIntegration ? `${activeIntegration.name} integration` : "Integration"}
        description="Add credentials and sync settings for this provider."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => requestSheetOpenChange(false)}
            >
              Cancel
            </Button>
            {activeIntegrationSettings?.connected ? (
              <Button type="button" variant="outline-destructive" onClick={disconnectIntegration}>
                Disconnect integration
              </Button>
            ) : null}
            <Button
              type="submit"
              form={formId}
              disabled={!state.enabled || !activeIntegrationId}
            >
              Save settings
            </Button>
          </>
        }
      >
        {activeIntegration ? (
          <form
            id={formId}
            onSubmit={form.handleSubmit(saveIntegrationSettings)}
            className="space-y-4"
          >
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">{activeIntegration.name}</p>
              <p className="text-sm text-muted-foreground">{activeIntegration.summary}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationAccountId">Account or store ID</Label>
              <Input
                id="integrationAccountId"
                placeholder="your-store.myshopify.com"
                aria-invalid={!!form.formState.errors.accountId}
                {...form.register("accountId")}
              />
              {form.formState.errors.accountId ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.accountId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationApiKey">API key</Label>
              <Input
                id="integrationApiKey"
                placeholder="Enter API key"
                aria-invalid={!!form.formState.errors.apiKey}
                {...form.register("apiKey")}
              />
              {form.formState.errors.apiKey ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apiKey.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationApiSecret">API secret</Label>
              <Input
                id="integrationApiSecret"
                type="password"
                placeholder="Enter API secret"
                aria-invalid={!!form.formState.errors.apiSecret}
                {...form.register("apiSecret")}
              />
              {form.formState.errors.apiSecret ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apiSecret.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationWebhookSecret">Webhook secret (optional)</Label>
              <Input
                id="integrationWebhookSecret"
                type="password"
                placeholder="Optional webhook signing secret"
                {...form.register("webhookSecret")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationSyncMode">Sync frequency</Label>
              <Select
                value={syncMode}
                onValueChange={(value) => {
                  if (value) {
                    form.setValue("syncMode", value as SyncMode, { shouldDirty: true });
                  }
                }}
              >
                <SelectTrigger id="integrationSyncMode" className="w-full">
                  <SelectValue placeholder="Select sync mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Auto sync enabled</p>
                <p className="text-sm text-muted-foreground">
                  Keep records updated automatically on your selected schedule.
                </p>
              </div>
              <Switch
                checked={Boolean(autoSync)}
                onCheckedChange={(checked) => {
                  form.setValue("autoSync", checked, { shouldDirty: true });
                }}
                aria-label="Toggle automatic sync"
              />
            </div>
          </form>
        ) : null}
      </AppSheet>
    </div>
  );
}
