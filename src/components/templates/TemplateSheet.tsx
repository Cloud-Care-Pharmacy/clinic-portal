"use client";

import { useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Mail, MessageSquare, Bell } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSheet } from "@/components/shared/AppSheet";
import {
  TemplateBodyEditor,
  type TemplateBodyEditorHandle,
} from "./TemplateBodyEditor";
import { VariablePicker } from "./VariablePicker";
import {
  emailTemplateSchema,
  smsTemplateSchema,
  notificationTemplateSchema,
} from "./zod-schemas";
import {
  useCreateTemplate,
  useUpdateTemplate,
} from "@/lib/hooks/use-templates";
import { htmlToText } from "@/lib/templates/html-to-text";
import { segmentInfo } from "@/lib/templates/sms-utils";
import { extractVariablePaths } from "@/lib/templates/variables";
import { cn } from "@/lib/utils";
import type {
  EmailTemplate,
  NotificationTemplate,
  SmsTemplate,
  Template,
  TemplateType,
  TemplateSeverity,
  TemplateAudience,
} from "@/types";

interface TemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Type for new templates; ignored when `template` is provided. */
  defaultType?: TemplateType;
  /** When provided, the sheet operates in edit mode. */
  template?: Template;
  onSaved?: (template: Template) => void;
}

const SEVERITIES: TemplateSeverity[] = ["info", "success", "warning", "error"];
const AUDIENCES: TemplateAudience[] = ["all", "admin", "doctor", "staff"];

type FormState = {
  // common
  type: TemplateType;
  name: string;
  description: string;
  category: string;
  active: boolean;
  body: string;
  // email
  fromName: string;
  fromEmail: string;
  replyTo: string;
  subject: string;
  preheader: string;
  plainTextFallback: string;
  cc: string;
  bcc: string;
  attachmentsAllowed: boolean;
  // sms
  senderId: string;
  includeOptOutFooter: boolean;
  maxSegments: string;
  // notification
  title: string;
  severity: TemplateSeverity;
  icon: string;
  actionLabel: string;
  actionUrl: string;
  audienceRole: TemplateAudience;
  autoDismissSeconds: string;
  persistInBell: boolean;
};

function blankState(type: TemplateType): FormState {
  return {
    type,
    name: "",
    description: "",
    category: "",
    active: true,
    body: "",
    fromName: "",
    fromEmail: "",
    replyTo: "",
    subject: "",
    preheader: "",
    plainTextFallback: "",
    cc: "",
    bcc: "",
    attachmentsAllowed: false,
    senderId: "",
    includeOptOutFooter: true,
    maxSegments: "",
    title: "",
    severity: "info",
    icon: "",
    actionLabel: "",
    actionUrl: "",
    audienceRole: "all",
    autoDismissSeconds: "",
    persistInBell: true,
  };
}

function stateFromTemplate(t: Template): FormState {
  const base = blankState(t.type);
  base.name = t.name;
  base.description = t.description ?? "";
  base.category = t.category ?? "";
  base.active = t.active;
  if (t.type === "email") {
    base.fromName = t.fromName;
    base.fromEmail = t.fromEmail;
    base.replyTo = t.replyTo ?? "";
    base.subject = t.subject;
    base.preheader = t.preheader ?? "";
    base.body = t.body;
    base.plainTextFallback = t.plainTextFallback ?? "";
    base.cc = (t.cc ?? []).join(", ");
    base.bcc = (t.bcc ?? []).join(", ");
    base.attachmentsAllowed = t.attachmentsAllowed;
  } else if (t.type === "sms") {
    base.senderId = t.senderId;
    base.body = t.body;
    base.includeOptOutFooter = t.includeOptOutFooter;
    base.maxSegments = t.maxSegments?.toString() ?? "";
  } else {
    base.title = t.title;
    base.body = t.body;
    base.severity = t.severity;
    base.icon = t.icon ?? "";
    base.actionLabel = t.actionLabel ?? "";
    base.actionUrl = t.actionUrl ?? "";
    base.audienceRole = t.audienceRole;
    base.autoDismissSeconds = t.autoDismissSeconds?.toString() ?? "";
    base.persistInBell = t.persistInBell;
  }
  return base;
}

const TYPE_META: Record<
  TemplateType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  email: { label: "Email template", icon: Mail },
  sms: { label: "SMS template", icon: MessageSquare },
  notification: { label: "Notification template", icon: Bell },
};

export function TemplateSheet({
  open,
  onOpenChange,
  defaultType = "email",
  template,
  onSaved,
}: TemplateSheetProps) {
  const isEdit = !!template;
  const initialType = template?.type ?? defaultType;

  const [form, setForm] = useState<FormState>(() =>
    template ? stateFromTemplate(template) : blankState(initialType)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const editorRef = useRef<TemplateBodyEditorHandle | null>(null);

  const { user } = useUser();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const pending = createMutation.isPending || updateMutation.isPending;

  // Reset form when the sheet re-opens with a different target. Derived-state
  // pattern (read during render) avoids setState-in-effect cascading renders.
  const trackerKey = `${open ? "o" : "c"}|${template?.id ?? "new"}|${defaultType}`;
  const [trackedKey, setTrackedKey] = useState<string>(trackerKey);
  if (open && trackedKey !== trackerKey) {
    setTrackedKey(trackerKey);
    setForm(template ? stateFromTemplate(template) : blankState(defaultType));
    setErrors({});
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function err(key: string): string | undefined {
    return errors[key];
  }

  const segInfo = useMemo(
    () => (form.type === "sms" ? segmentInfo(form.body) : null),
    [form.type, form.body]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    let result;
    if (form.type === "email") {
      result = emailTemplateSchema.safeParse({
        type: "email",
        name: form.name,
        description: form.description,
        category: form.category,
        active: form.active,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo,
        subject: form.subject,
        preheader: form.preheader,
        body: form.body,
        plainTextFallback: form.plainTextFallback,
        cc: form.cc,
        bcc: form.bcc,
        attachmentsAllowed: form.attachmentsAllowed,
      });
    } else if (form.type === "sms") {
      result = smsTemplateSchema.safeParse({
        type: "sms",
        name: form.name,
        description: form.description,
        category: form.category,
        active: form.active,
        senderId: form.senderId,
        body: form.body,
        includeOptOutFooter: form.includeOptOutFooter,
        maxSegments: form.maxSegments,
      });
    } else {
      result = notificationTemplateSchema.safeParse({
        type: "notification",
        name: form.name,
        description: form.description,
        category: form.category,
        active: form.active,
        title: form.title,
        body: form.body,
        severity: form.severity,
        icon: form.icon,
        actionLabel: form.actionLabel,
        actionUrl: form.actionUrl,
        audienceRole: form.audienceRole,
        autoDismissSeconds: form.autoDismissSeconds,
        persistInBell: form.persistInBell,
      });
    }

    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please fix the highlighted fields");
      return;
    }

    const parsed = result.data;
    const authorName =
      user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Unknown";
    const variables = extractVariablePaths(
      parsed.type === "notification"
        ? `${parsed.title}\n${parsed.body}`
        : parsed.type === "email"
          ? `${parsed.subject}\n${parsed.body}`
          : parsed.body
    );

    try {
      if (isEdit && template) {
        // Build a patch limited to the type's fields.
        const patch = buildPatch(parsed) as Partial<Template> & {
          updatedBy: string;
          variables: string[];
        };
        patch.updatedBy = authorName;
        patch.variables = variables;
        const next = await updateMutation.mutateAsync({
          id: template.id,
          patch,
        });
        toast.success("Template updated");
        onSaved?.(next);
      } else {
        const draft = buildCreate(parsed, authorName, variables);
        const next = await createMutation.mutateAsync(draft);
        toast.success("Template created");
        onSaved?.(next);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save template");
    }
  }

  const TypeIcon = TYPE_META[form.type].icon;
  const title = isEdit ? `Edit ${TYPE_META[form.type].label.toLowerCase()}` : `New ${TYPE_META[form.type].label.toLowerCase()}`;

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
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="template-form"
            disabled={pending}
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create template"}
          </Button>
        </>
      }
    >
      <form id="template-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Type selector — only in create mode */}
        {!isEdit && (
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_META) as TemplateType[]).map((t) => {
                const Icon = TYPE_META[t].icon;
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update("type", t)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-md border p-2.5 text-left text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-muted"
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="font-medium capitalize">{t}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Common fields */}
        <section className="space-y-3">
          <Field label="Name" error={err("name")} required>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Welcome — new patient"
              aria-invalid={!!err("name")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" error={err("category")}>
              <Input
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                placeholder="e.g. Onboarding"
              />
            </Field>
            <Field label="Status">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-input px-3">
                <Switch
                  checked={form.active}
                  onCheckedChange={(c) => update("active", !!c)}
                  aria-label="Active"
                />
                <span className="text-sm text-muted-foreground">
                  {form.active ? "Active" : "Inactive"}
                </span>
              </div>
            </Field>
          </div>
          <Field label="Description" error={err("description")}>
            <Input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Internal note about when this is used"
            />
          </Field>
        </section>

        {/* Type-specific fields */}
        {form.type === "email" && (
          <section className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From name" error={err("fromName")} required>
                <Input
                  value={form.fromName}
                  onChange={(e) => update("fromName", e.target.value)}
                  placeholder="Cloud Care Pharmacy"
                  aria-invalid={!!err("fromName")}
                />
              </Field>
              <Field label="From email" error={err("fromEmail")} required>
                <Input
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => update("fromEmail", e.target.value)}
                  placeholder="hello@cloudcare.health"
                  aria-invalid={!!err("fromEmail")}
                />
              </Field>
            </div>
            <Field label="Reply-to (optional)" error={err("replyTo")}>
              <Input
                type="email"
                value={form.replyTo}
                onChange={(e) => update("replyTo", e.target.value)}
                placeholder="support@cloudcare.health"
                aria-invalid={!!err("replyTo")}
              />
            </Field>
            <Field label="Subject" error={err("subject")} required>
              <Input
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="Welcome, {{patient.firstName}}"
                aria-invalid={!!err("subject")}
              />
            </Field>
            <Field
              label="Preheader (optional)"
              error={err("preheader")}
              hint="Preview text shown in the inbox list."
            >
              <Input
                value={form.preheader}
                onChange={(e) => update("preheader", e.target.value)}
              />
            </Field>
            <Field label="CC (optional)" error={err("cc")} hint="Comma-separated emails.">
              <Input
                value={form.cc}
                onChange={(e) => update("cc", e.target.value)}
              />
            </Field>
            <Field label="BCC (optional)" error={err("bcc")} hint="Comma-separated emails.">
              <Input
                value={form.bcc}
                onChange={(e) => update("bcc", e.target.value)}
              />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
              <div>
                <p className="text-sm font-medium">Allow attachments</p>
                <p className="text-xs text-muted-foreground">
                  Informational — flag for downstream sender configuration.
                </p>
              </div>
              <Switch
                checked={form.attachmentsAllowed}
                onCheckedChange={(c) => update("attachmentsAllowed", !!c)}
              />
            </div>
          </section>
        )}

        {form.type === "sms" && (
          <section className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              SMS settings
            </h3>
            <Field
              label="Sender ID"
              error={err("senderId")}
              required
              hint="3–11 alphanumeric characters."
            >
              <Input
                value={form.senderId}
                onChange={(e) => update("senderId", e.target.value)}
                placeholder="CCPHARM"
                maxLength={11}
                aria-invalid={!!err("senderId")}
              />
            </Field>
            <Field label="Max segments (optional)" error={err("maxSegments")}>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.maxSegments}
                onChange={(e) => update("maxSegments", e.target.value)}
                placeholder="e.g. 2"
                aria-invalid={!!err("maxSegments")}
              />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
              <div>
                <p className="text-sm font-medium">Append opt-out footer</p>
                <p className="text-xs text-muted-foreground">
                  Adds &ldquo;Reply STOP to unsubscribe&rdquo;.
                </p>
              </div>
              <Switch
                checked={form.includeOptOutFooter}
                onCheckedChange={(c) => update("includeOptOutFooter", !!c)}
              />
            </div>
          </section>
        )}

        {form.type === "notification" && (
          <section className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notification settings
            </h3>
            <Field label="Title" error={err("title")} required>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={80}
                placeholder="Script ready for review"
                aria-invalid={!!err("title")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {form.title.length}/80
              </p>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Severity">
                <Select
                  value={form.severity}
                  onValueChange={(v) => {
                    if (v) update("severity", v as TemplateSeverity);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="capitalize">{s}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Audience role">
                <Select
                  value={form.audienceRole}
                  onValueChange={(v) => {
                    if (v) update("audienceRole", v as TemplateAudience);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a} value={a}>
                        <span className="capitalize">{a}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field
              label="Icon (optional)"
              error={err("icon")}
              hint="Lucide icon name; overrides the severity default."
            >
              <Input
                value={form.icon}
                onChange={(e) => update("icon", e.target.value)}
                placeholder="Bell"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Action label (optional)" error={err("actionLabel")}>
                <Input
                  value={form.actionLabel}
                  onChange={(e) => update("actionLabel", e.target.value)}
                  placeholder="Open script"
                />
              </Field>
              <Field
                label="Action URL (optional)"
                error={err("actionUrl")}
                hint="Must start with /"
              >
                <Input
                  value={form.actionUrl}
                  onChange={(e) => update("actionUrl", e.target.value)}
                  placeholder="/prescriptions"
                  aria-invalid={!!err("actionUrl")}
                />
              </Field>
            </div>
            <Field
              label="Auto-dismiss seconds (optional)"
              error={err("autoDismissSeconds")}
              hint="Leave blank or 0 for sticky."
            >
              <Input
                type="number"
                min={0}
                max={3600}
                value={form.autoDismissSeconds}
                onChange={(e) => update("autoDismissSeconds", e.target.value)}
                aria-invalid={!!err("autoDismissSeconds")}
              />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
              <div>
                <p className="text-sm font-medium">Persist in notifications bell</p>
                <p className="text-xs text-muted-foreground">
                  When off, the notification is shown as a transient toast only.
                </p>
              </div>
              <Switch
                checked={form.persistInBell}
                onCheckedChange={(c) => update("persistInBell", !!c)}
              />
            </div>
          </section>
        )}

        {/* Body */}
        <section className="space-y-2">
          <Label>Body{form.type !== "email" ? " (plain text)" : ""}</Label>
          <TemplateBodyEditor
            ref={editorRef}
            type={form.type}
            value={form.body}
            onChange={(next) => update("body", next)}
            placeholder={
              form.type === "email"
                ? "Write your email body…"
                : "Write your message…"
            }
          />
          {err("body") ? (
            <p className="text-xs text-destructive">{err("body")}</p>
          ) : null}
          {form.type === "sms" && segInfo ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground tabular-nums">
                  {segInfo.length}
                </span>{" "}
                chars · {segInfo.unicode ? "UCS-2" : "GSM-7"}
              </span>
              <span>
                <span className="font-medium text-foreground tabular-nums">
                  {segInfo.segments}
                </span>{" "}
                segment{segInfo.segments === 1 ? "" : "s"} ({segInfo.perSegment}/seg)
              </span>
              {form.maxSegments &&
                segInfo.segments > Number(form.maxSegments) && (
                  <span className="text-destructive">
                    Exceeds max ({form.maxSegments})
                  </span>
                )}
            </div>
          ) : null}
        </section>

        {/* Variables */}
        <section className="space-y-2">
          <Label>Insert variable</Label>
          <p className="text-xs text-muted-foreground">
            Click a variable to insert it at the cursor.
          </p>
          <VariablePicker
            onInsert={(path) => editorRef.current?.insertVariable(path)}
          />
        </section>

        {/* Plain-text fallback (email only, after body so the user has seen the body) */}
        {form.type === "email" && (
          <section className="space-y-2">
            <Label>Plain-text fallback (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Used by mail clients that don&apos;t render HTML. Auto-derived from
              the body if left blank.
            </p>
            <textarea
              value={form.plainTextFallback}
              onChange={(e) => update("plainTextFallback", e.target.value)}
              placeholder={
                form.body ? htmlToText(form.body) : "Plain-text version of the email"
              }
              className="flex field-sizing-content w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              style={{ minHeight: 120 }}
            />
          </section>
        )}
      </form>
    </AppSheet>
  );
}

// --------------------------------------------------------------------------

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------

type ParsedEmail = z.output<typeof emailTemplateSchema>;
type ParsedSms = z.output<typeof smsTemplateSchema>;
type ParsedNotification = z.output<typeof notificationTemplateSchema>;
type Parsed = ParsedEmail | ParsedSms | ParsedNotification;

function buildCreate(
  parsed: Parsed,
  author: string,
  variables: string[]
): Omit<Template, "id" | "createdAt" | "updatedAt"> {
  if (parsed.type === "email") {
    const next: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt"> = {
      type: "email",
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      active: parsed.active,
      variables,
      fromName: parsed.fromName,
      fromEmail: parsed.fromEmail,
      replyTo: parsed.replyTo,
      subject: parsed.subject,
      preheader: parsed.preheader,
      body: parsed.body,
      plainTextFallback: parsed.plainTextFallback || htmlToText(parsed.body),
      cc: parsed.cc,
      bcc: parsed.bcc,
      attachmentsAllowed: parsed.attachmentsAllowed,
      createdBy: author,
      updatedBy: author,
    };
    return next;
  }
  if (parsed.type === "sms") {
    const next: Omit<SmsTemplate, "id" | "createdAt" | "updatedAt"> = {
      type: "sms",
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      active: parsed.active,
      variables,
      senderId: parsed.senderId,
      body: parsed.body,
      includeOptOutFooter: parsed.includeOptOutFooter,
      maxSegments: parsed.maxSegments,
      createdBy: author,
      updatedBy: author,
    };
    return next;
  }
  const next: Omit<NotificationTemplate, "id" | "createdAt" | "updatedAt"> = {
    type: "notification",
    name: parsed.name,
    description: parsed.description,
    category: parsed.category,
    active: parsed.active,
    variables,
    title: parsed.title,
    body: parsed.body,
    severity: parsed.severity,
    icon: parsed.icon,
    actionLabel: parsed.actionLabel,
    actionUrl: parsed.actionUrl,
    audienceRole: parsed.audienceRole,
    autoDismissSeconds: parsed.autoDismissSeconds,
    persistInBell: parsed.persistInBell,
    createdBy: author,
    updatedBy: author,
  };
  return next;
}

function buildPatch(parsed: Parsed): Partial<Template> {
  if (parsed.type === "email") {
    const patch: Partial<EmailTemplate> = {
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      active: parsed.active,
      fromName: parsed.fromName,
      fromEmail: parsed.fromEmail,
      replyTo: parsed.replyTo,
      subject: parsed.subject,
      preheader: parsed.preheader,
      body: parsed.body,
      plainTextFallback: parsed.plainTextFallback || htmlToText(parsed.body),
      cc: parsed.cc,
      bcc: parsed.bcc,
      attachmentsAllowed: parsed.attachmentsAllowed,
    };
    return patch as Partial<Template>;
  }
  if (parsed.type === "sms") {
    const patch: Partial<SmsTemplate> = {
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      active: parsed.active,
      senderId: parsed.senderId,
      body: parsed.body,
      includeOptOutFooter: parsed.includeOptOutFooter,
      maxSegments: parsed.maxSegments,
    };
    return patch as Partial<Template>;
  }
  const patch: Partial<NotificationTemplate> = {
    name: parsed.name,
    description: parsed.description,
    category: parsed.category,
    active: parsed.active,
    title: parsed.title,
    body: parsed.body,
    severity: parsed.severity,
    icon: parsed.icon,
    actionLabel: parsed.actionLabel,
    actionUrl: parsed.actionUrl,
    audienceRole: parsed.audienceRole,
    autoDismissSeconds: parsed.autoDismissSeconds,
    persistInBell: parsed.persistInBell,
  };
  return patch as Partial<Template>;
}
