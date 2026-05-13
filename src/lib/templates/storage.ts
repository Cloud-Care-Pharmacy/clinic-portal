import type { Template } from "@/types";

const STORAGE_KEY = "patient-portal:templates:v1";
const SEED_FLAG_KEY = "patient-portal:templates:v1:seeded";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  // crypto.randomUUID is safe under HTTPS / localhost in modern browsers; fall
  // back to a timestamped random string for very old environments.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_SEEDS: Template[] = [
  {
    id: "tpl_seed_email_welcome",
    type: "email",
    name: "Welcome — new patient",
    description: "Sent right after intake form submission.",
    category: "Onboarding",
    active: true,
    variables: ["patient.firstName", "clinic.name"],
    fromName: "Cloud Care Pharmacy",
    fromEmail: "hello@cloudcare.health",
    subject: "Welcome to {{clinic.name}}, {{patient.firstName}}",
    preheader: "Your account is ready — here's what happens next.",
    body: "<p>Hi {{patient.firstName}},</p><p>Welcome to {{clinic.name}}! Your account is ready. A clinician will reach out shortly to schedule your first consult.</p><p>Warm regards,<br>The {{clinic.name}} team</p>",
    plainTextFallback: "",
    attachmentsAllowed: false,
    createdBy: "System",
    updatedBy: "System",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "tpl_seed_sms_reminder",
    type: "sms",
    name: "Appointment reminder (24h)",
    description: "Sent the day before a scheduled consultation.",
    category: "Reminders",
    active: true,
    variables: ["patient.firstName", "appointment.date", "appointment.time"],
    senderId: "CCPHARM",
    body: "Hi {{patient.firstName}}, this is a reminder of your appointment on {{appointment.date}} at {{appointment.time}}. Reply CANCEL to reschedule.",
    includeOptOutFooter: true,
    maxSegments: 2,
    createdBy: "System",
    updatedBy: "System",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "tpl_seed_notification_script_ready",
    type: "notification",
    name: "Script ready for review",
    description: "Shown to clinicians when a new script needs verification.",
    category: "Clinical",
    active: true,
    variables: ["patient.fullName"],
    title: "Script ready for {{patient.fullName}}",
    body: "A new prescription draft is awaiting your review.",
    severity: "info",
    actionLabel: "Open script",
    actionUrl: "/prescriptions",
    audienceRole: "doctor",
    persistInBell: true,
    createdBy: "System",
    updatedBy: "System",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export function loadTemplates(): Template[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First visit: seed with samples so the UI isn't empty.
      if (!window.localStorage.getItem(SEED_FLAG_KEY)) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDS));
        window.localStorage.setItem(SEED_FLAG_KEY, "1");
        return [...DEFAULT_SEEDS];
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Template[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(list: Template[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function createTemplate(
  draft: Omit<Template, "id" | "createdAt" | "updatedAt">
): Template {
  const list = loadTemplates();
  const ts = nowIso();
  const next = {
    ...draft,
    id: makeId("tpl"),
    createdAt: ts,
    updatedAt: ts,
  } as Template;
  saveTemplates([next, ...list]);
  return next;
}

export function updateTemplate(
  id: string,
  patch: Partial<Omit<Template, "id" | "type" | "createdAt" | "createdBy">> & {
    updatedBy?: string;
  }
): Template | null {
  const list = loadTemplates();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const current = list[idx];
  const merged = {
    ...current,
    ...patch,
    id: current.id,
    type: current.type,
    createdAt: current.createdAt,
    createdBy: current.createdBy,
    updatedAt: nowIso(),
  } as Template;
  const next = [...list];
  next[idx] = merged;
  saveTemplates(next);
  return merged;
}

export function deleteTemplate(id: string): boolean {
  const list = loadTemplates();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  saveTemplates(next);
  return true;
}
