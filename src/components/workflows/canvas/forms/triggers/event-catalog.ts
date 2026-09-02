/**
 * Catalog of domain events emitted by the FastMeds backend that workflows can
 * subscribe to. Grouped by entity/domain so the trigger picker can present a
 * two-step flow: pick an entity, then pick the event.
 *
 * Event types use the backend's dotted naming convention. The `label` is the
 * human-readable name shown in the UI.
 *
 * Authors can still type a custom dotted event type via the "Use a custom
 * event type" escape hatch in EventTriggerForm.
 */

import {
  User,
  Users,
  Calendar,
  Pill,
  CheckSquare,
  FileText,
  StickyNote,
  Stethoscope,
  Building2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface EventDefinition {
  /** Dotted backend event name, e.g. `consultation.scheduled`. */
  eventType: string;
  /** Short human-readable label, e.g. "Consultation scheduled". */
  label: string;
  /** One-line description shown under the label. */
  description: string;
}

export interface EventEntity {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  events: EventDefinition[];
}

export const EVENT_ENTITIES: EventEntity[] = [
  {
    id: "patient",
    label: "Patient",
    description: "Patient profile lifecycle",
    icon: User,
    events: [
      {
        eventType: "patient.created",
        label: "Patient created",
        description: "A new patient profile is added to the system.",
      },
      {
        eventType: "patient.details_updated",
        label: "Patient details updated",
        description: "Demographic or contact details are edited.",
      },
      {
        eventType: "patient.archived",
        label: "Patient archived",
        description: "A patient record is archived.",
      },
      {
        eventType: "patient.unarchived",
        label: "Patient unarchived",
        description: "A previously archived patient is restored.",
      },
      {
        eventType: "patient.deleted",
        label: "Patient deleted",
        description: "A patient record is permanently removed.",
      },
      {
        eventType: "patient.intake.submitted",
        label: "Intake submitted",
        description: "A patient submits their intake form.",
      },
      {
        eventType: "clinical_data.approved",
        label: "Clinical data approved",
        description: "A clinician approves submitted clinical data.",
      },
    ],
  },
  {
    id: "consultation",
    label: "Consultation",
    description: "Bookings, completions, and edits",
    icon: Calendar,
    events: [
      {
        eventType: "consultation.scheduled",
        label: "Consultation scheduled",
        description: "A consultation is booked with a practitioner.",
      },
      {
        eventType: "consultation.updated",
        label: "Consultation updated",
        description: "An existing consultation is edited.",
      },
      {
        eventType: "consultation.completed",
        label: "Consultation completed",
        description: "A practitioner marks a consultation as complete.",
      },
      {
        eventType: "consultation.cancelled",
        label: "Consultation cancelled",
        description: "A consultation is cancelled before it occurs.",
      },
      {
        eventType: "consultation.no_show",
        label: "Consultation no-show",
        description: "A patient fails to attend a scheduled consultation.",
      },
      {
        eventType: "consultation.rescheduled",
        label: "Consultation rescheduled",
        description: "A consultation is moved to a new time.",
      },
      {
        eventType: "consultation.deleted",
        label: "Consultation deleted",
        description: "A consultation record is removed.",
      },
    ],
  },
  {
    id: "document",
    label: "Document",
    description: "Patient document uploads and review",
    icon: FileText,
    events: [
      {
        eventType: "document.uploaded",
        label: "Document uploaded",
        description: "A patient or staff member uploads a document.",
      },
      {
        eventType: "document.verified",
        label: "Document verified",
        description: "A document is reviewed and approved.",
      },
      {
        eventType: "document.rejected",
        label: "Document rejected",
        description: "A document is reviewed and rejected.",
      },
      {
        eventType: "document.deleted",
        label: "Document deleted",
        description: "A document is removed from the record.",
      },
    ],
  },
  {
    id: "note",
    label: "Note",
    description: "Clinical notes on a patient record",
    icon: StickyNote,
    events: [
      {
        eventType: "note.added",
        label: "Note added",
        description: "A new clinical note is added.",
      },
      {
        eventType: "note.updated",
        label: "Note updated",
        description: "An existing note is edited.",
      },
      {
        eventType: "note.deleted",
        label: "Note deleted",
        description: "A note is removed from the record.",
      },
    ],
  },
  {
    id: "task",
    label: "Task",
    description: "Internal workflow tasks",
    icon: CheckSquare,
    events: [
      {
        eventType: "task.created",
        label: "Task created",
        description: "A new task is assigned to a user or queue.",
      },
      {
        eventType: "task.updated",
        label: "Task updated",
        description: "A task's status, priority, or details change.",
      },
      {
        eventType: "task.completed",
        label: "Task completed",
        description: "A task is marked as done.",
      },
      {
        eventType: "task.cancelled",
        label: "Task cancelled",
        description: "A task is cancelled before completion.",
      },
      {
        eventType: "task.assigned",
        label: "Task assigned",
        description: "A task is assigned to a user or queue.",
      },
      {
        eventType: "task.unassigned",
        label: "Task unassigned",
        description: "A task's assignee is cleared.",
      },
      {
        eventType: "task.deleted",
        label: "Task deleted",
        description: "A task is removed from the system.",
      },
      {
        eventType: "task.due_soon",
        label: "Task due soon",
        description: "A task is approaching its due date.",
      },
      {
        eventType: "task.overdue",
        label: "Task overdue",
        description: "A task has passed its due date without completion.",
      },
    ],
  },
  {
    id: "prescription",
    label: "Prescription",
    description: "Prescriptions issued by clinicians",
    icon: Pill,
    events: [
      {
        eventType: "prescription.issued",
        label: "Prescription issued",
        description: "A prescription is sent to the patient or pharmacy.",
      },
      {
        eventType: "prescription.status_changed",
        label: "Prescription status changed",
        description: "A prescription's status transitions to a new state.",
      },
      {
        eventType: "prescription.expiring",
        label: "Prescription expiring",
        description: "A prescription is approaching its expiry date.",
      },
      {
        eventType: "prescription.deleted",
        label: "Prescription deleted",
        description: "A prescription record is removed.",
      },
    ],
  },
  {
    id: "practitioner",
    label: "Practitioner",
    description: "Practitioner profile and availability",
    icon: Stethoscope,
    events: [
      {
        eventType: "practitioner.profile_updated",
        label: "Profile updated",
        description: "A practitioner updates their profile details.",
      },
      {
        eventType: "practitioner.business_details_updated",
        label: "Business details updated",
        description: "A practitioner's business details are changed.",
      },
      {
        eventType: "practitioner.availability_updated",
        label: "Availability updated",
        description: "A practitioner's availability schedule is updated.",
      },
      {
        eventType: "practitioner.leave.created",
        label: "Leave created",
        description: "A practitioner records a new period of leave.",
      },
      {
        eventType: "practitioner.leave.deleted",
        label: "Leave deleted",
        description: "A previously recorded period of leave is removed.",
      },
    ],
  },
  {
    id: "user",
    label: "User & invitation",
    description: "User accounts and invitations",
    icon: Users,
    events: [
      {
        eventType: "user.created",
        label: "User created",
        description: "A new user account is created.",
      },
      {
        eventType: "user.role_changed",
        label: "User role changed",
        description: "A user's role is updated.",
      },
      {
        eventType: "user.deactivated",
        label: "User deactivated",
        description: "A user account is deactivated.",
      },
      {
        eventType: "user.reactivated",
        label: "User reactivated",
        description: "A previously deactivated user is restored.",
      },
      {
        eventType: "invitation.sent",
        label: "Invitation sent",
        description: "An invitation to join is sent to a new user.",
      },
      {
        eventType: "invitation.revoked",
        label: "Invitation revoked",
        description: "A pending invitation is revoked.",
      },
    ],
  },
  {
    id: "entity",
    label: "Entity",
    description: "Organisation-level configuration",
    icon: Building2,
    events: [
      {
        eventType: "entity.settings_updated",
        label: "Entity settings updated",
        description: "Entity-wide settings are changed.",
      },
    ],
  },
  {
    id: "system",
    label: "Email, PMS & system",
    description: "Inbound email, PMS sync, and scheduled ticks",
    icon: Settings,
    events: [
      {
        eventType: "email.received",
        label: "Email received",
        description: "An inbound email is received by the platform.",
      },
      {
        eventType: "pms.prescription_synced",
        label: "PMS prescription synced",
        description: "A prescription is synced from the connected PMS.",
      },
      {
        eventType: "system.tick.minutely",
        label: "Minutely system tick",
        description: "Fires once per minute for high-frequency flows.",
      },
      {
        eventType: "system.tick.hourly",
        label: "Hourly system tick",
        description: "Fires once per hour for scheduled flows.",
      },
      {
        eventType: "system.tick.daily",
        label: "Daily system tick",
        description: "Fires once per day for scheduled maintenance flows.",
      },
    ],
  },
];

/** Flat lookup of every event by dotted type. */
export const EVENT_BY_TYPE: Record<string, EventDefinition & { entity: EventEntity }> =
  Object.fromEntries(
    EVENT_ENTITIES.flatMap((entity) =>
      entity.events.map((event) => [event.eventType, { ...event, entity }] as const),
    ),
  );

/** Find the entity that owns a given dotted event type, if any. */
export function entityForEventType(eventType: string): EventEntity | undefined {
  return EVENT_BY_TYPE[eventType]?.entity;
}
