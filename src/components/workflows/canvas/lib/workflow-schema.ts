import { z } from "zod";
import {
  BRANCH_OP_VALUES,
  RECORD_ACTIVITY_STEP_ENTITY_TYPES,
  RECORD_ACTIVITY_STEP_TYPES,
  UNARY_BRANCH_OPS,
} from "@/types";

/**
 * Mirror of the server-side validation rules from the handoff §8. The server
 * is the source of truth; these schemas exist to give immediate feedback in
 * the inspector before hitting the API.
 */

const stepIdRefinement = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Step id must be alphanumeric / _ / -");

const templateString = z.string().min(1).max(8192);

const cronField = z
  .string()
  .min(1)
  .refine(
    (v) => v.trim().split(/\s+/).length === 5,
    "Cron must be 5 whitespace-separated fields"
  );

const eventTrigger = z.object({
  kind: z.literal("event"),
  eventType: z.string().min(1).max(255),
});
const manualTrigger = z.object({ kind: z.literal("manual") });
const scheduleTrigger = z.object({
  kind: z.literal("schedule"),
  cron: cronField,
});
const webhookTrigger = z.object({
  kind: z.literal("webhook"),
  token: z.string().min(8).max(64).optional(),
});
const workflowTrigger = z.object({ kind: z.literal("workflow") });

export const triggerSchema = z.discriminatedUnion("kind", [
  eventTrigger,
  manualTrigger,
  scheduleTrigger,
  webhookTrigger,
  workflowTrigger,
]);

// Backend allows empty trigger lists for `status: "draft"`. The ≥1 rule is
// only enforced when activating, so the client mirrors that and validates
// minimum length via `activationIssues()` instead.
export const triggersSchema = z.array(triggerSchema).max(20);

const baseStep = { id: stepIdRefinement.optional() };

// Reserved email header names — backend rejects these in `headers`.
const RESERVED_EMAIL_HEADERS = new Set([
  "to",
  "from",
  "cc",
  "bcc",
  "reply-to",
  "subject",
  "idempotency-key",
  "authorization",
  "content-type",
  "mime-version",
  "message-id",
  "date",
]);

const emailHeadersSchema = z
  .record(z.string().min(1), z.string().max(8192))
  .refine(
    (h) => Object.keys(h).every((k) => !RESERVED_EMAIL_HEADERS.has(k.toLowerCase())),
    {
      message:
        "Reserved header name — use the dedicated field (to/from/cc/bcc/replyTo/subject) instead",
    }
  )
  .optional();

const emailAttachmentSchema = z.object({
  url: templateString,
  filename: z.string().max(255).optional(),
});

const sendEmailStep = z.object({
  ...baseStep,
  kind: z.literal("send_email"),
  to: templateString,
  subject: templateString,
  text: z.string().max(8192).optional(),
  html: z.string().max(8192).optional(),
  from: z.string().max(8192).optional(),
  fromName: z.string().max(255).optional(),
  cc: z.array(templateString).max(50).optional(),
  bcc: z.array(templateString).max(50).optional(),
  replyTo: z.string().max(8192).optional(),
  headers: emailHeadersSchema,
  attachments: z.array(emailAttachmentSchema).max(10).optional(),
  idempotencyKeySuffix: z.string().max(255).optional(),
  storeAs: z.string().max(64).optional(),
});

const sendSmsStep = z.object({
  ...baseStep,
  kind: z.literal("send_sms"),
  to: templateString,
  body: templateString,
  from: z.string().max(8192).optional(),
  idempotencyKeySuffix: z.string().max(255).optional(),
  storeAs: z.string().max(64).optional(),
});

const waitStep = z.object({
  ...baseStep,
  kind: z.literal("wait"),
  seconds: z.number().int().min(1).max(2_592_000),
});

const waitForEventStep = z.object({
  ...baseStep,
  kind: z.literal("wait_for_event"),
  eventType: z.string().min(1).max(255),
  timeoutSeconds: z.number().int().min(1).max(2_592_000).optional(),
});

const branchOpEnum = z.enum(BRANCH_OP_VALUES);

const branchConditionSchema = z
  .object({
    left: templateString,
    op: branchOpEnum,
    right: z.string().max(8192).optional(),
  })
  .superRefine((cond, ctx) => {
    if (!UNARY_BRANCH_OPS.has(cond.op) && !cond.right) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["right"],
        message: "Required for this operator",
      });
    }
  });

const branchIfStep = z
  .object({
    ...baseStep,
    kind: z.literal("branch_if"),
    left: templateString,
    op: branchOpEnum,
    right: z.string().max(8192).optional(),
    gotoIfTrue: stepIdRefinement.optional(),
    gotoIfFalse: stepIdRefinement.optional(),
  })
  .superRefine((step, ctx) => {
    if (!UNARY_BRANCH_OPS.has(step.op) && !step.right) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["right"],
        message: "Required for this operator",
      });
    }
  });

const routerBranchSchema = z.object({
  name: z.string().min(1).max(100),
  condition: branchConditionSchema.optional(),
});

const routerStep = z.object({
  ...baseStep,
  kind: z.literal("router"),
  branches: z.array(routerBranchSchema).min(1).max(10),
  fallback: z.object({ name: z.string().max(100).optional() }).optional(),
  executionType: z.enum(["first_match", "all_match"]).optional(),
});

const loopOnItemsStep = z.object({
  ...baseStep,
  kind: z.literal("loop_on_items"),
  items: templateString,
  maxIterations: z.number().int().min(1).max(1000).optional(),
});

const lookupPatientStep = z.object({
  ...baseStep,
  kind: z.literal("lookup_patient"),
  patientId: templateString,
  storeAs: stepIdRefinement,
});

const lookupConsultationStep = z.object({
  ...baseStep,
  kind: z.literal("lookup_consultation"),
  consultationId: templateString,
  storeAs: stepIdRefinement,
});

const recordActivityStep = z.object({
  ...baseStep,
  kind: z.literal("record_activity"),
  patientId: templateString,
  type: z.enum(RECORD_ACTIVITY_STEP_TYPES),
  entityType: z.enum(RECORD_ACTIVITY_STEP_ENTITY_TYPES),
  entityId: z.string().max(8192).optional(),
  title: templateString,
  description: z.string().max(8192).optional(),
});

const httpAuthSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("basic"),
    username: templateString,
    password: templateString,
  }),
  z.object({ type: z.literal("bearer"), token: templateString }),
]);

const httpCallStep = z.object({
  ...baseStep,
  kind: z.literal("http_call"),
  url: templateString,
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  auth: httpAuthSchema.optional(),
  body: z.union([z.string().max(8192), z.record(z.string(), z.unknown())]).optional(),
  timeoutMs: z.number().int().min(100).max(60_000).optional(),
  followRedirects: z.boolean().optional(),
  failureMode: z.enum(["throw", "return"]).optional(),
  storeAs: stepIdRefinement.optional(),
  maxResponseBytes: z.number().int().min(1).max(65_536).optional(),
});

const callWorkflowStep = z.object({
  ...baseStep,
  kind: z.literal("call_workflow"),
  workflowId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  storeAs: stepIdRefinement.optional(),
});

export const stepSchema = z.discriminatedUnion("kind", [
  sendEmailStep,
  sendSmsStep,
  waitStep,
  waitForEventStep,
  branchIfStep,
  routerStep,
  loopOnItemsStep,
  lookupPatientStep,
  lookupConsultationStep,
  recordActivityStep,
  httpCallStep,
  callWorkflowStep,
]);

export const definitionSchema = z.object({
  version: z.literal(1).optional(),
  // Empty steps are allowed for drafts. ≥1 step is only enforced on
  // activation — see `activationIssues()`.
  steps: z.array(stepSchema).max(100),
});

export const workflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  triggers: triggersSchema,
  status: z.enum(["draft", "active", "disabled"]).optional(),
  definition: definitionSchema,
});

/**
 * Mirror of the backend's activation-only checks. Returns an array of
 * `{ path, message }` issues, matching the shape of the
 * `WorkflowActivationIssue` payload returned by
 * `POST /workflows/{id}/activate`. Empty array means the workflow is ready
 * to activate (per these front-end checks; the backend remains the source
 * of truth via `?dryRun=1`).
 */
export function activationIssues(input: {
  triggers: unknown[];
  triggerEventType?: string | null;
  definition: { steps: unknown[] };
}): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  const hasTrigger =
    input.triggers.length > 0 ||
    (typeof input.triggerEventType === "string" && input.triggerEventType.length > 0);
  if (!hasTrigger) {
    issues.push({
      path: "triggers",
      message: "active workflows require at least one trigger",
    });
  }
  if (input.definition.steps.length === 0) {
    issues.push({
      path: "definition.steps",
      message: "active workflows require at least one step",
    });
  }
  return issues;
}

/** Validate a cron string and warn if it can't fire (minute not multiple of 5). */
export function cronWarnings(cron: string): string[] {
  const warnings: string[] = [];
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return ["Cron must be 5 whitespace-separated fields"];
  const minuteField = parts[0];
  // If the minute field is a fixed integer that isn't a multiple of 5,
  // the cron tick (every 5 minutes) will never match it.
  if (/^\d+$/.test(minuteField) && Number(minuteField) % 5 !== 0) {
    warnings.push(
      "Minute is not a multiple of 5 — this cron will never fire (the evaluator runs every 5 minutes)"
    );
  }
  return warnings;
}
