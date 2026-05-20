"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Pencil,
  Send,
  Trash2,
  Mail,
  MessageSquare,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppSheet } from "@/components/shared/AppSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SendTestDialog } from "./SendTestDialog";
import { useDeleteTemplate } from "@/lib/hooks/use-templates";
import { getSampleValues, renderTemplate } from "@/lib/templates/variables";
import { segmentInfo } from "@/lib/templates/sms-utils";
import { cn } from "@/lib/utils";
import type { Template, TemplateSeverity } from "@/types";

interface TemplateDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onEdit: (template: Template) => void;
}

const TYPE_ICON = {
  email: Mail,
  sms: MessageSquare,
  notification: Bell,
} as const;

const SEVERITY_ICON: Record<
  TemplateSeverity,
  React.ComponentType<{ className?: string }>
> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const SEVERITY_TONE: Record<TemplateSeverity, string> = {
  info: "border-status-info-border bg-status-info-bg text-status-info-fg",
  success: "border-status-success-border bg-status-success-bg text-status-success-fg",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  error: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TemplateDetailSheet({
  open,
  onOpenChange,
  template,
  onEdit,
}: TemplateDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const deleteMutation = useDeleteTemplate();

  const sample = useMemo(() => getSampleValues(), []);

  if (!template) return null;

  const Icon = TYPE_ICON[template.type];

  const renderedSubject =
    template.type === "email" ? renderTemplate(template.subject, sample) : "";
  const renderedTitle =
    template.type === "notification" ? renderTemplate(template.title, sample) : "";
  const renderedBody = renderTemplate(template.body, sample);

  function handleDelete() {
    if (!template) return;
    deleteMutation.mutate(template.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteOpen(false);
        onOpenChange(false);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Failed to delete"),
    });
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        className="sm:w-[60vw]! sm:max-w-3xl! lg:w-[55vw]! lg:max-w-4xl!"
        title={
          <span className="inline-flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            {template.name}
          </span>
        }
        description={template.description}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
            <Button type="button" variant="outline" onClick={() => setTestOpen(true)}>
              <Send className="size-4" />
              Send test
            </Button>
            <Button type="button" onClick={() => onEdit(template)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={template.active ? "active" : "inactive"}
              dot
              className="capitalize"
            />
            {template.category ? (
              <StatusBadge variant="neutral" className="capitalize">
                {template.category}
              </StatusBadge>
            ) : null}
            <StatusBadge variant="info" className="capitalize">
              {template.type}
            </StatusBadge>
          </div>

          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <DetailGrid template={template} />
            </TabsContent>

            <TabsContent value="preview" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Rendered with sample variable values.
              </p>
              {template.type === "email" && (
                <EmailPreview
                  subject={renderedSubject}
                  preheader={template.preheader}
                  bodyHtml={renderedBody}
                  fromName={template.fromName}
                  fromEmail={template.fromEmail}
                />
              )}
              {template.type === "sms" && (
                <SmsPreview
                  senderId={template.senderId}
                  body={
                    template.includeOptOutFooter
                      ? `${renderedBody}\n\nReply STOP to unsubscribe`
                      : renderedBody
                  }
                />
              )}
              {template.type === "notification" && (
                <NotificationPreview
                  title={renderedTitle}
                  body={renderedBody}
                  severity={template.severity}
                  actionLabel={template.actionLabel}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppSheet>

      <SendTestDialog open={testOpen} onOpenChange={setTestOpen} template={template} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{template.name}&rdquo;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// --------------------------------------------------------------------------

function DetailGrid({ template }: { template: Template }) {
  const rows: Array<[string, React.ReactNode]> = [
    [
      "Type",
      <span key="t" className="capitalize">
        {template.type}
      </span>,
    ],
    ["Category", template.category || "—"],
    ["Status", template.active ? "Active" : "Inactive"],
    [
      "Variables",
      template.variables.length
        ? template.variables.map((v) => (
            <code
              key={v}
              className="mr-1 rounded bg-muted px-1 py-0.5 text-[11px] font-mono"
            >
              {`{{${v}}}`}
            </code>
          ))
        : "—",
    ],
    ["Created", formatDate(template.createdAt)],
    ["Updated", formatDate(template.updatedAt)],
  ];

  if (template.type === "email") {
    rows.push(["From", `${template.fromName} <${template.fromEmail}>`]);
    if (template.replyTo) rows.push(["Reply-to", template.replyTo]);
    rows.push(["Subject", template.subject]);
    if (template.preheader) rows.push(["Preheader", template.preheader]);
    if (template.cc?.length) rows.push(["CC", template.cc.join(", ")]);
    if (template.bcc?.length) rows.push(["BCC", template.bcc.join(", ")]);
    rows.push(["Attachments allowed", template.attachmentsAllowed ? "Yes" : "No"]);
  } else if (template.type === "sms") {
    rows.push(["Sender ID", template.senderId]);
    rows.push([
      "Opt-out footer",
      template.includeOptOutFooter ? "Appended" : "Disabled",
    ]);
    if (template.maxSegments) rows.push(["Max segments", template.maxSegments]);
    const info = segmentInfo(template.body);
    rows.push([
      "Body size",
      `${info.length} chars · ${info.segments} segment${
        info.segments === 1 ? "" : "s"
      } (${info.unicode ? "UCS-2" : "GSM-7"})`,
    ]);
  } else {
    rows.push(["Title", template.title]);
    rows.push([
      "Severity",
      <span key="s" className="capitalize">
        {template.severity}
      </span>,
    ]);
    if (template.icon) rows.push(["Icon", template.icon]);
    rows.push([
      "Audience",
      <span key="a" className="capitalize">
        {template.audienceRole}
      </span>,
    ]);
    if (template.actionLabel || template.actionUrl) {
      rows.push([
        "Action",
        `${template.actionLabel ?? ""}${template.actionUrl ? ` → ${template.actionUrl}` : ""}`,
      ]);
    }
    if (template.autoDismissSeconds && template.autoDismissSeconds > 0) {
      rows.push(["Auto-dismiss", `${template.autoDismissSeconds}s`]);
    } else {
      rows.push(["Auto-dismiss", "Sticky"]);
    }
    rows.push(["Persist in bell", template.persistInBell ? "Yes" : "No"]);
  }

  return (
    <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// --------------------------------------------------------------------------

function EmailPreview({
  subject,
  preheader,
  bodyHtml,
  fromName,
  fromEmail,
}: {
  subject: string;
  preheader?: string;
  bodyHtml: string;
  fromName: string;
  fromEmail: string;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-background">
      <div className="space-y-1 border-b border-border bg-muted/40 p-3">
        <div className="text-xs text-muted-foreground">
          From: {fromName} &lt;{fromEmail}&gt;
        </div>
        <div className="text-sm font-medium">{subject}</div>
        {preheader ? (
          <div className="text-xs text-muted-foreground">{preheader}</div>
        ) : null}
      </div>
      {/*
        Render the email body inside a sandboxed iframe so any <style> rules
        in the template (e.g. `a { color: ... }` or `* { ... !important }`)
        stay scoped to the preview and don't leak into the surrounding app
        (sidebar links, etc.).
      */}
      <iframe
        title="Email preview"
        sandbox=""
        srcDoc={bodyHtml}
        className="block w-full border-0 bg-white"
        style={{ height: 600 }}
        onLoad={(e) => {
          const frame = e.currentTarget;
          const doc = frame.contentDocument;
          if (!doc) return;
          const height = Math.max(
            doc.documentElement?.scrollHeight ?? 0,
            doc.body?.scrollHeight ?? 0
          );
          if (height > 0) frame.style.height = `${height}px`;
        }}
      />
    </div>
  );
}

function SmsPreview({ senderId, body }: { senderId: string; body: string }) {
  return (
    <div className="max-w-xs rounded-sm border border-border bg-muted/40 p-3">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{senderId}</div>
      <div className="whitespace-pre-wrap rounded-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        {body}
      </div>
    </div>
  );
}

function NotificationPreview({
  title,
  body,
  severity,
  actionLabel,
}: {
  title: string;
  body: string;
  severity: TemplateSeverity;
  actionLabel?: string;
}) {
  const Icon = SEVERITY_ICON[severity];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-sm border p-3 text-sm",
        SEVERITY_TONE[severity]
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 whitespace-pre-wrap opacity-90">{body}</p>
        {actionLabel ? (
          <button
            type="button"
            className="mt-2 text-xs font-medium underline-offset-2 hover:underline"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
