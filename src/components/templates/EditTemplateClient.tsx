"use client";

import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Bell, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { TemplateForm } from "./TemplateForm";
import { useTemplate } from "@/lib/hooks/use-templates";
import type { TemplateType } from "@/types";

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

      <div className="rounded-lg border border-border bg-card p-4">
        <TemplateForm
          template={template}
          surface="page"
          onCancel={() => router.push("/templates")}
          onSaved={() => router.push("/templates")}
        />
      </div>
    </div>
  );
}
