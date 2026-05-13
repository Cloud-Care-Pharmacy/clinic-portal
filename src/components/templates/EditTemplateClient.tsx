"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Bell, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { TemplateForm, type TemplateFormSection } from "./TemplateForm";
import { useTemplate } from "@/lib/hooks/use-templates";
import { cn } from "@/lib/utils";
import type { TemplateType } from "@/types";

const TABS: { value: TemplateFormSection; label: string }[] = [
  { value: "details", label: "Details" },
  { value: "settings", label: "Settings" },
  { value: "content", label: "Content" },
];

const TYPE_ICON: Record<TemplateType, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  notification: Bell,
};

const TYPE_LABEL: Record<TemplateType, string> = {
  email: "Email template",
  sms: "SMS template",
  notification: "Notification template",
};

interface EditTemplateClientProps {
  id: string;
}

export function EditTemplateClient({ id }: EditTemplateClientProps) {
  const router = useRouter();
  const { data: template, isLoading } = useTemplate(id);
  const [activeSection, setActiveSection] =
    useState<TemplateFormSection>("details");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading template…"
          breadcrumbs={[{ label: "Templates", href: "/templates" }, { label: "Edit" }]}
        />
        <div className="h-64 animate-pulse rounded-md border border-border bg-muted/30" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Template not found"
          breadcrumbs={[
            { label: "Templates", href: "/templates" },
            { label: "Not found" },
          ]}
        />
        <EmptyState
          icon={Mail}
          title="We couldn't find that template"
          description="It may have been deleted. Return to the templates list to pick another."
          actionLabel="Back to templates"
          onAction={() => router.push("/templates")}
        />
      </div>
    );
  }

  const TypeIcon = TYPE_ICON[template.type];

  return (
    <div className="space-y-6">
      <PageHeader
        title={template.name}
        description={`Edit ${TYPE_LABEL[template.type].toLowerCase()} content and settings.`}
        breadcrumbs={[
          { label: "Templates", href: "/templates" },
          { label: TYPE_LABEL[template.type] },
          { label: template.name },
        ]}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <TypeIcon className="size-3.5" />
            {TYPE_LABEL[template.type]}
          </span>
        }
      />

      {/* Pill-style tab navigation */}
      <nav className="inline-flex bg-muted rounded-[14px] p-1.5">
        {TABS.map((tab) => {
          const isActive = activeSection === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveSection(tab.value)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 h-10 px-4.5 rounded-[10px] text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-border bg-card p-4">
        <TemplateForm
          template={template}
          surface="page"
          activeSection={activeSection}
          onCancel={() => router.push("/templates")}
          onSaved={() => router.push("/templates")}
        />
      </div>
    </div>
  );
}
