import { z } from "zod";

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

export const triggersSchema = z.array(triggerSchema).min(1).max(20);

const baseStep = { id: stepIdRefinement.optional() };

const sendEmailStep = z.object({
  ...baseStep,
  kind: z.literal("send_email"),
  to: templateString,
  subject: templateString,
  text: z.string().max(8192).optional(),
  html: z.string().max(8192).optional(),
  from: z.string().max(8192).optional(),
  replyTo: z.string().max(8192).optional(),
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

const branchIfStep = z.object({
  ...baseStep,
  kind: z.literal("branch_if"),
  left: templateString,
  op: z.enum(["eq", "neq", "truthy", "falsy", "gt", "lt"]),
  right: z.string().max(8192).optional(),
  gotoIfTrue: stepIdRefinement.optional(),
  gotoIfFalse: stepIdRefinement.optional(),
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
  type: z.string().min(1).max(64),
  entityType: z.string().min(1).max(64),
  entityId: z.string().max(8192).optional(),
  title: templateString,
  description: z.string().max(8192).optional(),
});

const httpCallStep = z.object({
  ...baseStep,
  kind: z.literal("http_call"),
  url: templateString,
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().max(8192).optional(),
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
  lookupPatientStep,
  lookupConsultationStep,
  recordActivityStep,
  httpCallStep,
  callWorkflowStep,
]);

export const definitionSchema = z.object({
  version: z.literal(1).optional(),
  steps: z.array(stepSchema).min(1).max(100),
});

export const workflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  triggers: triggersSchema,
  status: z.enum(["draft", "active", "disabled"]).optional(),
  definition: definitionSchema,
});

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
