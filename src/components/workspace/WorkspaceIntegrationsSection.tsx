"use client";

import { useId, useMemo, useState } from "react";
import {
  CreditCard,
  type LucideIcon,
  Megaphone,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Workflow,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AppSheet } from "@/components/shared/AppSheet";
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
import {
  useDeleteWorkspaceIntegration,
  useTestWorkspaceIntegration,
  useTriggerWorkspaceIntegrationSync,
  useUpsertWorkspaceIntegration,
  useWorkspaceIntegrations,
} from "@/lib/hooks/use-workspace-integrations";
import { WorkspaceApiError } from "@/lib/hooks/use-workspace";
import type {
  IntegrationProvider,
  IntegrationSyncMode,
  UpsertWorkspaceIntegrationPayload,
  WorkspaceIntegration,
  WorkspaceIntegrationsResponse,
} from "@/types";

interface IntegrationDefinition {
  id: IntegrationProvider;
  name: string;
  summary: string;
  icon: LucideIcon;
  accountIdLabel: string;
  accountIdPlaceholder: string;
  accountIdHelp?: string;
  apiKeyLabel?: string;
  apiKeyPlaceholder: string;
  apiKeyHelp?: string;
  apiSecretLabel?: string;
  apiSecretPlaceholder?: string;
  apiSecretHelp?: string;
  webhookSecretLabel?: string;
  webhookSecretHelp?: string;
}

const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  {
    id: "shopify",
    name: "Shopify",
    summary: "Sync products and order events from your Shopify store.",
    icon: ShoppingBag,
    accountIdLabel: "Store handle",
    accountIdPlaceholder: "acme",
    accountIdHelp:
      "The part before .myshopify.com (e.g. acme). Full domain also accepted.",
    apiKeyLabel: "Client ID",
    apiKeyPlaceholder: "Shopify app Client ID",
    apiKeyHelp:
      "From your Shopify Dev Dashboard app → API credentials.",
    apiSecretLabel: "Client Secret",
    apiSecretPlaceholder: "Shopify app Client Secret",
    apiSecretHelp:
      "From the same app. Stored encrypted; used to mint short-lived (24h) Admin API tokens.",
    webhookSecretLabel: "Webhook signing secret",
    webhookSecretHelp:
      "Optional. Required only if you wire Shopify webhooks back to us.",
  },
  {
    id: "stripe",
    name: "Stripe",
    summary: "Import payment status updates and payout references.",
    icon: CreditCard,
    accountIdLabel: "Account ID",
    accountIdPlaceholder: "acct_123...",
    apiKeyPlaceholder: "sk_live_...",
  },
  {
    id: "xero",
    name: "Xero",
    summary: "Push invoices and reconcile transaction records.",
    icon: ReceiptText,
    accountIdLabel: "Tenant ID",
    accountIdPlaceholder: "Xero tenant ID",
    apiKeyPlaceholder: "Client ID",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    summary: "Send lifecycle automations from patient segmentation rules.",
    icon: Megaphone,
    accountIdLabel: "Account ID",
    accountIdPlaceholder: "Mailchimp account ID",
    apiKeyPlaceholder: "API key",
  },
];

const integrationSettingsSchema = z.object({
  accountId: z.string().trim().min(1, "Account/store ID is required"),
  apiKey: z.string(),
  apiSecret: z.string(),
  webhookSecret: z.string(),
  syncMode: z.enum(["manual", "hourly", "daily"]),
  autoSync: z.boolean(),
});

type IntegrationSettingsForm = z.infer<typeof integrationSettingsSchema>;

const DEFAULT_FORM: IntegrationSettingsForm = {
  accountId: "",
  apiKey: "",
  apiSecret: "",
  webhookSecret: "",
  syncMode: "hourly",
  autoSync: true,
};

function formatTimestamp(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function describeError(error: unknown, fallback: string) {
  if (error instanceof WorkspaceApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function WorkspaceIntegrationsSection({
  entityId,
  initialIntegrations,
}: {
  entityId: string;
  initialIntegrations?: WorkspaceIntegrationsResponse;
}) {
  const integrationsQuery = useWorkspaceIntegrations(
    entityId || undefined,
    initialIntegrations
  );
  const upsertMutation = useUpsertWorkspaceIntegration();
  const deleteMutation = useDeleteWorkspaceIntegration();
  const testMutation = useTestWorkspaceIntegration();
  const syncMutation = useTriggerWorkspaceIntegrationSync();

  const integrationsByProvider = useMemo(() => {
    const map = new Map<IntegrationProvider, WorkspaceIntegration>();
    for (const integration of integrationsQuery.data?.data.integrations ?? []) {
      map.set(integration.provider, integration);
    }
    return map;
  }, [integrationsQuery.data]);

  const [activeProvider, setActiveProvider] =
    useState<IntegrationProvider | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const formId = useId();
  const form = useForm<IntegrationSettingsForm>({
    defaultValues: DEFAULT_FORM,
  });
  const syncMode = useWatch({ control: form.control, name: "syncMode" });
  const autoSync = useWatch({ control: form.control, name: "autoSync" });

  const activeDefinition = activeProvider
    ? INTEGRATION_CATALOG.find((entry) => entry.id === activeProvider) ?? null
    : null;
  const activeIntegration = activeProvider
    ? integrationsByProvider.get(activeProvider) ?? null
    : null;

  const loadError = integrationsQuery.error
    ? describeError(integrationsQuery.error, "Failed to load integrations")
    : null;

  function setFieldError(issue: z.core.$ZodIssue) {
    const field = issue.path[0] as keyof IntegrationSettingsForm | undefined;
    if (field) form.setError(field, { message: issue.message });
  }

  function openSettingsSheet(provider: IntegrationProvider) {
    const integration = integrationsByProvider.get(provider);
    setActiveProvider(provider);
    form.reset({
      accountId: integration?.accountId ?? "",
      apiKey: "",
      apiSecret: "",
      webhookSecret: "",
      syncMode: integration?.syncMode ?? "hourly",
      autoSync: integration?.autoSync ?? true,
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
      setActiveProvider(null);
    }
  }

  function buildPayload(
    data: IntegrationSettingsForm,
    integration: WorkspaceIntegration | null
  ): {
    payload: UpsertWorkspaceIntegrationPayload;
    missingApiKey: boolean;
    missingApiSecret: boolean;
  } {
    const apiKey = data.apiKey.trim();
    const apiSecret = data.apiSecret.trim();
    const webhookSecret = data.webhookSecret.trim();
    const payload: UpsertWorkspaceIntegrationPayload = {
      accountId: data.accountId.trim(),
      syncMode: data.syncMode,
      autoSync: data.autoSync,
    };
    if (apiKey) payload.apiKey = apiKey;
    if (apiSecret) payload.apiSecret = apiSecret;
    if (webhookSecret) payload.webhookSecret = webhookSecret;

    return {
      payload,
      missingApiKey: !apiKey && !integration?.hasApiKey,
      missingApiSecret: !apiSecret && !integration?.hasApiSecret,
    };
  }

  function applyFieldErrors(details: unknown) {
    if (!details || typeof details !== "object") return false;
    const fieldErrors = details as Record<string, string[]>;
    let applied = false;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (!Array.isArray(messages) || messages.length === 0) continue;
      if (field in DEFAULT_FORM) {
        form.setError(field as keyof IntegrationSettingsForm, {
          message: messages[0],
        });
        applied = true;
      }
    }
    return applied;
  }

  async function saveIntegrationSettings(data: IntegrationSettingsForm) {
    if (!activeProvider || !activeDefinition) return;

    const parsed = integrationSettingsSchema.safeParse(data);
    if (!parsed.success) {
      parsed.error.issues.forEach(setFieldError);
      return;
    }

    const { payload, missingApiKey, missingApiSecret } = buildPayload(
      parsed.data,
      activeIntegration
    );

    if (missingApiKey) {
      form.setError("apiKey", { message: "API key is required" });
    }
    if (missingApiSecret) {
      form.setError("apiSecret", { message: "API secret is required" });
    }
    if (missingApiKey || missingApiSecret) return;

    try {
      await upsertMutation.mutateAsync({
        entityId,
        provider: activeProvider,
        data: payload,
      });
      toast.success(`${activeDefinition.name} settings saved`);
      setSheetOpen(false);
      setActiveProvider(null);
    } catch (error) {
      if (error instanceof WorkspaceApiError) {
        const handled = applyFieldErrors(error.details);
        if (!handled) {
          toast.error(error.message);
        }
      } else {
        toast.error(describeError(error, "Failed to save integration"));
      }
    }
  }

  async function disconnectIntegration() {
    if (!activeProvider || !activeDefinition) return;
    try {
      await deleteMutation.mutateAsync({
        entityId,
        provider: activeProvider,
      });
      toast.success(`${activeDefinition.name} disconnected`);
      setSheetOpen(false);
      setActiveProvider(null);
    } catch (error) {
      toast.error(describeError(error, "Failed to disconnect integration"));
    }
  }

  async function runConnectionTest() {
    if (!activeProvider || !activeDefinition) return;
    const data = form.getValues();
    const accountId = data.accountId.trim();
    const apiKey = data.apiKey.trim();
    const apiSecret = data.apiSecret.trim();

    try {
      const response = await testMutation.mutateAsync({
        entityId,
        provider: activeProvider,
        data: {
          ...(accountId ? { accountId } : {}),
          ...(apiKey ? { apiKey } : {}),
          ...(apiSecret ? { apiSecret } : {}),
        },
      });
      const result = response.data.test;
      if (result.ok) {
        toast.success(result.message || "Connection successful");
      } else {
        toast.error(result.message || "Connection test failed");
      }
    } catch (error) {
      toast.error(describeError(error, "Connection test failed"));
    }
  }

  async function runSyncNow(provider: IntegrationProvider, name: string) {
    try {
      await syncMutation.mutateAsync({ entityId, provider });
      toast.success(`${name} sync queued`);
    } catch (error) {
      toast.error(describeError(error, "Failed to queue sync"));
    }
  }

  const isSaving = upsertMutation.isPending;
  const isDisconnecting = deleteMutation.isPending;
  const isTesting = testMutation.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="size-4" />
            Integrations
          </CardTitle>
          <CardDescription>
            Connect providers like Shopify and manage credentials in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {INTEGRATION_CATALOG.map((definition) => {
              const integration = integrationsByProvider.get(definition.id);
              const isConnected = Boolean(integration?.connected);
              const Icon = definition.icon;
              const lastSync = formatTimestamp(integration?.lastSyncAt ?? null);
              const isSyncingThis =
                syncMutation.isPending &&
                syncMutation.variables?.provider === definition.id;

              return (
                <div
                  key={definition.id}
                  className={cn(
                    "rounded-sm border p-3",
                    isConnected ? "border-border bg-muted/20" : "border-border"
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Icon className="size-4" />
                        {definition.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {definition.summary}
                      </p>
                      {isConnected && integration?.apiKeyMasked ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          {integration.apiKeyMasked}
                        </p>
                      ) : null}
                      {lastSync ? (
                        <p className="text-xs text-muted-foreground">
                          Last sync: {lastSync}
                          {integration?.lastSyncStatus
                            ? ` (${integration.lastSyncStatus})`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge variant={isConnected ? "success" : "neutral"}>
                      {isConnected ? "Connected" : "Not connected"}
                    </StatusBadge>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isConnected ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSyncingThis}
                        onClick={() =>
                          runSyncNow(definition.id, definition.name)
                        }
                      >
                        <RefreshCw
                          className={cn(
                            "size-4",
                            isSyncingThis && "animate-spin"
                          )}
                        />
                        Sync now
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant={isConnected ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => openSettingsSheet(definition.id)}
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
        title={
          activeDefinition
            ? `${activeDefinition.name} integration`
            : "Integration"
        }
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
            {activeIntegration?.connected ? (
              <Button
                type="button"
                variant="outline-destructive"
                onClick={disconnectIntegration}
                disabled={isDisconnecting}
              >
                Disconnect integration
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={runConnectionTest}
              disabled={isTesting || !activeProvider}
            >
              Test connection
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={!activeProvider || isSaving}
            >
              Save settings
            </Button>
          </>
        }
      >
        {activeDefinition ? (
          <form
            id={formId}
            onSubmit={form.handleSubmit(saveIntegrationSettings)}
            className="space-y-4"
          >
            <div className="rounded-sm border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">
                {activeDefinition.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeDefinition.summary}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationAccountId">
                {activeDefinition.accountIdLabel}
              </Label>
              <Input
                id="integrationAccountId"
                placeholder={activeDefinition.accountIdPlaceholder}
                aria-invalid={!!form.formState.errors.accountId}
                {...form.register("accountId")}
              />
              {activeDefinition.accountIdHelp ? (
                <p className="text-xs text-muted-foreground">
                  {activeDefinition.accountIdHelp}
                </p>
              ) : null}
              {form.formState.errors.accountId ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.accountId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationApiKey">
                {activeDefinition.apiKeyLabel ?? "API key"}
              </Label>
              <Input
                id="integrationApiKey"
                placeholder={
                  activeIntegration?.hasApiKey
                    ? "•••• Leave blank to keep current"
                    : activeDefinition.apiKeyPlaceholder
                }
                aria-invalid={!!form.formState.errors.apiKey}
                {...form.register("apiKey")}
              />
              {activeDefinition.apiKeyHelp ? (
                <p className="text-xs text-muted-foreground">
                  {activeDefinition.apiKeyHelp}
                </p>
              ) : null}
              {activeIntegration?.apiKeyMasked ? (
                <p className="font-mono text-xs text-muted-foreground">
                  Current: {activeIntegration.apiKeyMasked}
                </p>
              ) : null}
              {form.formState.errors.apiKey ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apiKey.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationApiSecret">
                {activeDefinition.apiSecretLabel ?? "API secret"}
              </Label>
              <Input
                id="integrationApiSecret"
                type="password"
                placeholder={
                  activeIntegration?.hasApiSecret
                    ? "•••• Leave blank to keep current"
                    : activeDefinition.apiSecretPlaceholder ?? "Enter API secret"
                }
                aria-invalid={!!form.formState.errors.apiSecret}
                {...form.register("apiSecret")}
              />
              {activeDefinition.apiSecretHelp ? (
                <p className="text-xs text-muted-foreground">
                  {activeDefinition.apiSecretHelp}
                </p>
              ) : null}
              {form.formState.errors.apiSecret ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apiSecret.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationWebhookSecret">
                {activeDefinition.webhookSecretLabel ??
                  "Webhook secret (optional)"}
              </Label>
              <Input
                id="integrationWebhookSecret"
                type="password"
                placeholder={
                  activeIntegration?.hasWebhookSecret
                    ? "•••• Leave blank to keep current"
                    : "Optional webhook signing secret"
                }
                {...form.register("webhookSecret")}
              />
              {activeDefinition.webhookSecretHelp ? (
                <p className="text-xs text-muted-foreground">
                  {activeDefinition.webhookSecretHelp}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="integrationSyncMode">Sync frequency</Label>
              <Select
                value={syncMode}
                onValueChange={(value) => {
                  if (value) {
                    form.setValue("syncMode", value as IntegrationSyncMode, {
                      shouldDirty: true,
                    });
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

            <div className="flex items-center justify-between rounded-sm border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Auto sync enabled
                </p>
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
