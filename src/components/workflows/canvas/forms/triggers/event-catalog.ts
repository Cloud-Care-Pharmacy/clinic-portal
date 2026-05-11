/**
 * Catalog of domain events emitted by the Quity backend that workflows can
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
  Calendar,
  Pill,
  CheckSquare,
  FileText,
  StickyNote,
  Flag,
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
        description: "A consultation is booked with a doctor.",
      },
      {
        eventType: "consultation.updated",
        label: "Consultation updated",
        description: "An existing consultation is rescheduled or edited.",
      },
      {
        eventType: "consultation.completed",
        label: "Consultation completed",
        description: "A doctor marks a consultation as complete.",
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
        eventType: "prescription.created",
        label: "Prescription created",
        description: "A prescription record is created.",
      },
      {
        eventType: "prescription.issued",
        label: "Prescription issued",
        description: "A prescription is sent to the patient or pharmacy.",
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
        description: "A task's status, assignee, or details change.",
      },
      {
        eventType: "task.completed",
        label: "Task completed",
        description: "A task is marked as done.",
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
    id: "flag",
    label: "Red flag",
    description: "Clinical red flags raised on patients",
    icon: Flag,
    events: [
      {
        eventType: "flag.raised",
        label: "Red flag raised",
        description: "A red flag is raised on a patient record.",
      },
      {
        eventType: "flag.resolved",
        label: "Red flag resolved",
        description: "A red flag is cleared.",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    description: "Platform-wide scheduled events",
    icon: Settings,
    events: [
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
