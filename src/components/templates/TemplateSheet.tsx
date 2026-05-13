"use client";

import { Mail, MessageSquare, Bell, type LucideIcon } from "lucide-react";
import { AppSheet } from "@/components/shared/AppSheet";
import { TemplateForm } from "./TemplateForm";
import type { Template, TemplateType } from "@/types";

interface TemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Type for new templates; ignored when `template` is provided. */
  defaultType?: TemplateType;
  /** When provided, the sheet operates in edit mode. */
  template?: Template;
  onSaved?: (template: Template) => void;
}

const TYPE_ICON: Record<TemplateType, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  notification: Bell,
};

const TYPE_LABEL: Record<TemplateType, string> = {
  email: "email template",
  sms: "SMS template",
  notification: "notification template",
};

export function TemplateSheet({
  open,
  onOpenChange,
  defaultType = "email",
  template,
  onSaved,
}: TemplateSheetProps) {
  const isEdit = !!template;
  const activeType = template?.type ?? defaultType;
  const TypeIcon = TYPE_ICON[activeType];
  const title = isEdit
    ? `Edit ${TYPE_LABEL[activeType]}`
    : `New ${TYPE_LABEL[activeType]}`;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex items-center gap-2">
          <TypeIcon className="size-4 text-muted-foreground" />
          {title}
        </span>
      }
      description={
        isEdit
          ? "Update template content and settings."
          : "Author a reusable message template."
      }
    >
      <TemplateForm
        template={template}
        defaultType={defaultType}
        surface="sheet"
        onCancel={() => onOpenChange(false)}
        onSaved={(t) => {
          onSaved?.(t);
          onOpenChange(false);
        }}
      />
    </AppSheet>
  );
}
