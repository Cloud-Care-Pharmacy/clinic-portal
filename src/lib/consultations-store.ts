import type { Consultation, ConsultationType, ConsultationStatus } from "@/types";

const store = new Map<string, Consultation>();

function seed() {
  const now = Date.now();
  const items: Consultation[] = [
    {
      id: "cons-1",
      patientId: "p1",
      patientName: "John Smith",
      doctorId: "d1",
      doctorName: "Dr. Sarah Chen",
      scheduledAt: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
      type: "initial",
      status: "scheduled",
      notes: "First consultation for smoking cessation program.",
      createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
      id: "cons-2",
      patientId: "p2",
      patientName: "Maria Garcia",
      doctorId: "d2",
      doctorName: "Dr. James Wilson",
      scheduledAt: new Date(now + 1000 * 60 * 60 * 48).toISOString(),
      type: "follow-up",
      status: "scheduled",
      duration: 30,
      notes: "2-week follow-up — assess NRT compliance.",
      createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: "cons-3",
      patientId: "p3",
      patientName: "David Lee",
      doctorId: "d1",
      doctorName: "Dr. Sarah Chen",
      scheduledAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
      completedAt: new Date(
        now - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 30
      ).toISOString(),
      type: "renewal",
      status: "completed",
      duration: 30,
      notes: "Prescription renewal — stable patient, continuing therapy.",
      outcome: "Prescription renewed for 3 months.",
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      id: "cons-4",
      patientId: "p4",
      patientName: "Anna Brown",
      doctorId: "d2",
      doctorName: "Dr. James Wilson",
      scheduledAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
      completedAt: new Date(
        now - 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 20
      ).toISOString(),
      type: "initial",
      status: "completed",
      duration: 20,
      notes: "Initial intake assessment completed.",
      outcome: "Referred for NRT protocol.",
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 10).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
  ];
  for (const item of items) store.set(item.id, item);
}

seed();

let counter = 100;

export function listConsultations(patientId?: string): Consultation[] {
  const all = Array.from(store.values());
  if (patientId) return all.filter((c) => c.patientId === patientId);
  return all;
}

export function getConsultation(id: string): Consultation | undefined {
  return store.get(id);
}

export function createConsultation(data: {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: string;
  type: ConsultationType;
  duration?: number;
  notes?: string;
}): Consultation {
  const id = `cons-${++counter}`;
  const now = new Date().toISOString();
  const consultation: Consultation = {
    id,
    ...data,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };
  store.set(id, consultation);
  return consultation;
}

export function updateConsultation(
  id: string,
  data: {
    status?: ConsultationStatus;
    outcome?: string;
    notes?: string;
    completedAt?: string;
  }
): Consultation | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;
  const updated: Consultation = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  return updated;
}

export function deleteConsultation(id: string): boolean {
  return store.delete(id);
}
