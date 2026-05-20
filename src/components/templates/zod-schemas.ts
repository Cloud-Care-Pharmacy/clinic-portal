import { z } from "zod";

/**
 * Zod v4 schemas for templates. The portal uses manual `safeParse` in form
 * submit handlers (see `forms.instructions.md`) — these schemas live outside
 * `react-hook-form` resolvers.
 */

const trimmed = (s: string) => s.trim();
const trimmedOpt = (s: string | undefined) => (s ? s.trim() : s);

const csvOrArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    if (Array.isArray(v)) {
      const cleaned = v.flatMap((s) => {
        const t = trimmed(s);
        return t ? [t] : [];
      });
      return cleaned.length ? cleaned : undefined;
    }
    const cleaned = v.split(",").flatMap((s) => {
      const t = trimmed(s);
      return t ? [t] : [];
    });
    return cleaned.length ? cleaned : undefined;
  });

const emailField = z.string().email("Enter a valid email address");
const optionalEmailField = z
  .string()
  .optional()
  .transform(trimmedOpt)
  .refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), {
    message: "Enter a valid email address",
  });

const commonFields = {
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  description: z.string().optional().transform(trimmedOpt),
  category: z.string().optional().transform(trimmedOpt),
  active: z.boolean(),
};

export const emailTemplateSchema = z.object({
  type: z.literal("email"),
  ...commonFields,
  fromName: z.string().min(1, "From name is required"),
  fromEmail: emailField,
  replyTo: optionalEmailField,
  subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
  preheader: z
    .string()
    .max(200, "Preheader is too long")
    .optional()
    .transform(trimmedOpt),
  body: z
    .string()
    .min(1, "Body is required")
    // TipTap may emit `<p></p>` for an empty doc — reject that too.
    .refine((v) => v.replace(/<[^>]+>/g, "").trim().length > 0, {
      message: "Body is required",
    }),
  plainTextFallback: z.string().optional().transform(trimmedOpt),
  cc: csvOrArray,
  bcc: csvOrArray,
  attachmentsAllowed: z.boolean(),
});

export const smsTemplateSchema = z.object({
  type: z.literal("sms"),
  ...commonFields,
  senderId: z
    .string()
    .min(3, "Sender ID must be 3–11 characters")
    .max(11, "Sender ID must be 3–11 characters")
    .refine((v) => /^[A-Za-z0-9]+$/.test(v), {
      message: "Sender ID must be alphanumeric",
    }),
  body: z.string().min(1, "Body is required"),
  includeOptOutFooter: z.boolean(),
  maxSegments: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    })
    .refine((v) => v === undefined || (v >= 1 && v <= 10), {
      message: "Max segments must be between 1 and 10",
    }),
});

export const notificationTemplateSchema = z.object({
  type: z.literal("notification"),
  ...commonFields,
  title: z
    .string()
    .min(1, "Title is required")
    .max(80, "Title must be 80 characters or fewer"),
  body: z.string().min(1, "Body is required"),
  severity: z.enum(["info", "success", "warning", "error"]),
  icon: z.string().optional().transform(trimmedOpt),
  actionLabel: z.string().optional().transform(trimmedOpt),
  actionUrl: z
    .string()
    .optional()
    .transform(trimmedOpt)
    .refine((v) => !v || v.startsWith("/"), {
      message: "Action URL must start with /",
    }),
  audienceRole: z.enum(["all", "admin", "practitioner", "staff"]),
  autoDismissSeconds: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    })
    .refine((v) => v === undefined || (v >= 0 && v <= 3600), {
      message: "Auto-dismiss must be between 0 and 3600 seconds",
    }),
  persistInBell: z.boolean(),
});

export const templateSchema = z.discriminatedUnion("type", [
  emailTemplateSchema,
  smsTemplateSchema,
  notificationTemplateSchema,
]);

export type EmailTemplateInput = z.input<typeof emailTemplateSchema>;
export type SmsTemplateInput = z.input<typeof smsTemplateSchema>;
export type NotificationTemplateInput = z.input<typeof notificationTemplateSchema>;
export type TemplateInput = z.input<typeof templateSchema>;
export type TemplateOutput = z.output<typeof templateSchema>;
