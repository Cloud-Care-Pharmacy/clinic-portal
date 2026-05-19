"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  type LucideIcon,
  Megaphone,
  Plus,
  ReceiptText,
  ShoppingBag,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
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
  activeIntegrations: IntegrationId[];
}

const DEFAULT_STATE: IntegrationsState = {
  enabled: false,
  activeIntegrations: ["shopify"],
};

function getStorageKey(entityId: string) {
  return `workspace-integrations:${entityId}`;
}

function getStoredIntegrationsState(entityId: string): IntegrationsState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  const raw = window.localStorage.getItem(getStorageKey(entityId));
  if (!raw) return DEFAULT_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<IntegrationsState>;
    return {
      enabled: Boolean(parsed.enabled),
      activeIntegrations: Array.isArray(parsed.activeIntegrations)
        ? parsed.activeIntegrations.filter((value): value is IntegrationId =>
            INTEGRATION_CATALOG.some((integration) => integration.id === value)
          )
        : [],
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
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationId>("shopify");

  useEffect(() => {
    const storageKey = getStorageKey(entityId);
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [entityId, state]);

  const availableIntegrations = useMemo(
    () =>
      INTEGRATION_CATALOG.filter(
        (integration) => !state.activeIntegrations.includes(integration.id)
      ),
    [state.activeIntegrations]
  );

  const activeSelection = availableIntegrations.some(
    (integration) => integration.id === selectedIntegration
  )
    ? selectedIntegration
    : (availableIntegrations[0]?.id ?? "shopify");

  function toggleWorkspaceIntegrations(nextEnabled: boolean) {
    setState((current) => ({
      ...current,
      enabled: nextEnabled,
    }));
    toast.success(nextEnabled ? "Integrations enabled" : "Integrations paused");
  }

  function connectSelectedIntegration() {
    if (!availableIntegrations.length) return;

    const selection = activeSelection;
    setState((current) => ({
      ...current,
      activeIntegrations: [...current.activeIntegrations, selection],
    }));

    const integration = INTEGRATION_CATALOG.find((item) => item.id === selection);
    if (integration) {
      toast.success(`${integration.name} added`);
    }
  }

  function toggleIntegration(id: IntegrationId, isConnected: boolean) {
    setState((current) => ({
      ...current,
      activeIntegrations: isConnected
        ? current.activeIntegrations
        : current.activeIntegrations.filter((integrationId) => integrationId !== id),
    }));

    const integration = INTEGRATION_CATALOG.find((item) => item.id === id);
    if (integration && !isConnected) {
      toast.success(`${integration.name} disconnected`);
    }
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

          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
            <div className="min-w-55 flex-1 space-y-1">
              <p className="text-sm font-medium text-foreground">Add an integration</p>
              <Select
                value={activeSelection}
                onValueChange={(value) => {
                  if (value) setSelectedIntegration(value as IntegrationId);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableIntegrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={connectSelectedIntegration}
              disabled={!state.enabled || !availableIntegrations.length}
            >
              <Plus className="size-4" />
              Add integration
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {INTEGRATION_CATALOG.map((integration) => {
              const isConnected = state.activeIntegrations.includes(integration.id);
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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Allow data sync</p>
                    <Switch
                      checked={isConnected}
                      disabled={!state.enabled}
                      onCheckedChange={(next) => toggleIntegration(integration.id, next)}
                      aria-label={`Toggle ${integration.name} integration`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
