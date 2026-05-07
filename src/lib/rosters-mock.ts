/**
 * Frontend mock for the Doctor Rosters feature.
 *
 * TODO: replace with real `/api/proxy/rosters/...` calls once the
 * `prescription-gateway` backend exposes `GET /api/rosters/week` and
 * `GET /api/rosters/month`. The contract here mirrors ROSTERS_SPEC.md §10.
 *
 * TODO: when the user-mapping API is ready, derive `isMe` from the Clerk
 * session (email match against the doctor record). For now, a fixed doctor
 * is flagged so the UI can exercise the YOU pill / pinned-row treatment.
 */

import type {
  RosterDoctor,
  RosterMonthDay,
  RosterMonthDayDoctor,
  RosterMonthResponse,
  RosterWeekResponse,
  Shift,
} from "@/types";

/**
 * Avatar tints (ROSTERS_SPEC.md §11).
 *
 * This is the single sanctioned hex palette in the codebase outside
 * `globals.css` — the spec defines it inline as a fixed warm palette.
 * Do not inline these values elsewhere; always import this constant.
 */
export const AVATAR_TINTS: readonly string[] = [
  "#c96442",
  "#9a7b56",
  "#7a8a6b",
  "#a36a4d",
  "#6f7d92",
  "#b48a4d",
  "#8e6f9a",
  "#5e8077",
  "#a85f5f",
  "#7e7a55",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getDoctorTint(doctorId: string): string {
  return AVATAR_TINTS[hashString(doctorId) % AVATAR_TINTS.length];
}

export function getDoctorInitials(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function getDoctorShortName(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return name;
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]![0]!}. ${parts[parts.length - 1]!}`;
}

// ---------------------------------------------------------------------------
// Date helpers (Australia/Sydney, en-AU). The mock generates deterministic
// data keyed off the requested week/month so navigation feels coherent.
// ---------------------------------------------------------------------------

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday of the given date's week (en-AU / ISO week start). */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const delta = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + delta);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function currentSydneyDate(): Date {
  // Approximate "now in Sydney". We don't pull a tz lib for the mock —
  // dates here are local clock dates which is sufficient for layout.
  return new Date();
}

// ---------------------------------------------------------------------------
// Doctor seeds and shift pattern recipes.
// ---------------------------------------------------------------------------

interface DoctorSeed {
  id: string;
  name: string;
  specialty: RosterDoctor["specialty"];
  clinic: RosterDoctor["clinic"];
  phone: string;
  joined: string;
  isMe?: boolean;
  /** 7 entries Mon..Sun describing the seeded week pattern. */
  pattern: PatternEntry[];
}

type PatternEntry =
  | { kind: "off" }
  | { kind: "leave"; note: string }
  | {
      kind: "available";
      start: string;
      end: string;
      capacity: number;
      booked: number;
    }
  | {
      kind: "busy";
      start: string;
      end: string;
      capacity: number;
      booked: number;
      currentSlot: { start: string; end: string; patient: string; type: string };
    };

const DOCTOR_SEEDS: DoctorSeed[] = [
  {
    id: "doc-amelia-choi",
    name: "Dr Amelia Choi",
    specialty: "GP",
    clinic: "Surry Hills",
    phone: "+61 2 9000 1001",
    joined: "Mar 2023",
    isMe: true,
    pattern: [
      { kind: "available", start: "08:00", end: "16:00", capacity: 12, booked: 8 },
      { kind: "available", start: "09:00", end: "17:00", capacity: 12, booked: 6 },
      {
        kind: "busy",
        start: "09:00",
        end: "17:00",
        capacity: 12,
        booked: 9,
        currentSlot: {
          start: "14:00",
          end: "14:30",
          patient: "A. Patel",
          type: "Follow-up",
        },
      },
      { kind: "available", start: "09:00", end: "17:00", capacity: 12, booked: 4 },
      { kind: "available", start: "08:00", end: "13:00", capacity: 7, booked: 5 },
      { kind: "off" },
      { kind: "off" },
    ],
  },
  {
    id: "doc-noah-fischer",
    name: "Dr Noah Fischer",
    specialty: "GP",
    clinic: "Newtown",
    phone: "+61 2 9000 1002",
    joined: "Jul 2022",
    pattern: [
      { kind: "available", start: "10:00", end: "18:00", capacity: 12, booked: 11 },
      {
        kind: "busy",
        start: "10:00",
        end: "18:00",
        capacity: 12,
        booked: 10,
        currentSlot: {
          start: "13:30",
          end: "14:00",
          patient: "M. Singh",
          type: "Initial",
        },
      },
      { kind: "available", start: "10:00", end: "18:00", capacity: 12, booked: 7 },
      { kind: "leave", note: "Annual leave" },
      { kind: "leave", note: "Annual leave" },
      { kind: "off" },
      { kind: "off" },
    ],
  },
  {
    id: "doc-priya-rao",
    name: "Dr Priya Rao",
    specialty: "Psychiatry",
    clinic: "Telehealth",
    phone: "+61 2 9000 1003",
    joined: "Nov 2021",
    pattern: [
      { kind: "available", start: "09:00", end: "15:00", capacity: 8, booked: 5 },
      { kind: "available", start: "09:00", end: "15:00", capacity: 8, booked: 6 },
      { kind: "available", start: "09:00", end: "15:00", capacity: 8, booked: 8 },
      { kind: "available", start: "09:00", end: "15:00", capacity: 8, booked: 4 },
      { kind: "off" },
      { kind: "available", start: "10:00", end: "13:00", capacity: 4, booked: 3 },
      { kind: "off" },
    ],
  },
  {
    id: "doc-sam-okafor",
    name: "Dr Sam Okafor",
    specialty: "Cardiology",
    clinic: "Surry Hills",
    phone: "+61 2 9000 1004",
    joined: "Jan 2024",
    pattern: [
      { kind: "off" },
      { kind: "available", start: "08:00", end: "14:00", capacity: 10, booked: 7 },
      { kind: "available", start: "08:00", end: "14:00", capacity: 10, booked: 9 },
      {
        kind: "busy",
        start: "08:00",
        end: "14:00",
        capacity: 10,
        booked: 10,
        currentSlot: {
          start: "11:00",
          end: "11:30",
          patient: "K. Wong",
          type: "Review",
        },
      },
      { kind: "available", start: "08:00", end: "14:00", capacity: 10, booked: 6 },
      { kind: "off" },
      { kind: "off" },
    ],
  },
  {
    id: "doc-leila-haddad",
    name: "Dr Leila Haddad",
    specialty: "Dermatology",
    clinic: "Newtown",
    phone: "+61 2 9000 1005",
    joined: "Aug 2020",
    pattern: [
      { kind: "available", start: "09:00", end: "17:00", capacity: 12, booked: 10 },
      { kind: "available", start: "09:00", end: "17:00", capacity: 12, booked: 12 },
      { kind: "available", start: "09:00", end: "17:00", capacity: 12, booked: 8 },
      { kind: "available", start: "09:00", end: "17:00", capacity: 12, booked: 11 },
      { kind: "available", start: "09:00", end: "13:00", capacity: 6, booked: 4 },
      { kind: "off" },
      { kind: "off" },
    ],
  },
  {
    id: "doc-ben-tran",
    name: "Dr Ben Tran",
    specialty: "Paediatrics",
    clinic: "Surry Hills",
    phone: "+61 2 9000 1006",
    joined: "May 2019",
    pattern: [
      { kind: "available", start: "08:30", end: "16:30", capacity: 14, booked: 9 },
      { kind: "available", start: "08:30", end: "16:30", capacity: 14, booked: 11 },
      { kind: "leave", note: "Sick leave" },
      { kind: "available", start: "08:30", end: "16:30", capacity: 14, booked: 6 },
      { kind: "available", start: "08:30", end: "12:30", capacity: 7, booked: 5 },
      { kind: "off" },
      { kind: "off" },
    ],
  },
  {
    id: "doc-rin-yamada",
    name: "Dr Rin Yamada",
    specialty: "Endocrinology",
    clinic: "Telehealth",
    phone: "+61 2 9000 1007",
    joined: "Feb 2023",
    pattern: [
      { kind: "off" },
      { kind: "off" },
      { kind: "available", start: "10:00", end: "16:00", capacity: 9, booked: 5 },
      { kind: "available", start: "10:00", end: "16:00", capacity: 9, booked: 7 },
      { kind: "available", start: "10:00", end: "16:00", capacity: 9, booked: 6 },
      { kind: "available", start: "10:00", end: "13:00", capacity: 4, booked: 2 },
      { kind: "off" },
    ],
  },
  {
    id: "doc-marisol-vega",
    name: "Dr Marisol Vega",
    specialty: "GP",
    clinic: "Newtown",
    phone: "+61 2 9000 1008",
    joined: "Sep 2024",
    pattern: [
      { kind: "available", start: "07:00", end: "15:00", capacity: 12, booked: 4 },
      { kind: "available", start: "07:00", end: "15:00", capacity: 12, booked: 6 },
      { kind: "available", start: "07:00", end: "15:00", capacity: 12, booked: 5 },
      { kind: "off" },
      { kind: "available", start: "07:00", end: "15:00", capacity: 12, booked: 9 },
      { kind: "available", start: "08:00", end: "12:00", capacity: 6, booked: 3 },
      { kind: "available", start: "08:00", end: "12:00", capacity: 6, booked: 2 },
    ],
  },
  {
    id: "doc-james-okonkwo",
    name: "Dr James Okonkwo",
    specialty: "GP",
    clinic: "Surry Hills",
    phone: "+61 2 9000 1009",
    joined: "Apr 2022",
    pattern: [
      { kind: "leave", note: "Annual leave" },
      { kind: "leave", note: "Annual leave" },
      { kind: "leave", note: "Annual leave" },
      { kind: "leave", note: "Annual leave" },
      { kind: "leave", note: "Annual leave" },
      { kind: "off" },
      { kind: "off" },
    ],
  },
  {
    id: "doc-hannah-li",
    name: "Dr Hannah Li",
    specialty: "Psychiatry",
    clinic: "Surry Hills",
    phone: "+61 2 9000 1010",
    joined: "Oct 2023",
    pattern: [
      { kind: "available", start: "11:00", end: "19:00", capacity: 10, booked: 6 },
      { kind: "available", start: "11:00", end: "19:00", capacity: 10, booked: 8 },
      {
        kind: "busy",
        start: "11:00",
        end: "19:00",
        capacity: 10,
        booked: 9,
        currentSlot: {
          start: "15:00",
          end: "16:00",
          patient: "T. Brooks",
          type: "Follow-up",
        },
      },
      { kind: "available", start: "11:00", end: "19:00", capacity: 10, booked: 5 },
      { kind: "off" },
      { kind: "available", start: "11:00", end: "16:00", capacity: 6, booked: 4 },
      { kind: "off" },
    ],
  },
];

function patternToShift(entry: PatternEntry, dayIndex: number): Shift {
  switch (entry.kind) {
    case "off":
      return { kind: "off" };
    case "leave":
      return { kind: "leave", note: entry.note };
    case "available":
      return {
        kind: "available",
        start: entry.start,
        end: entry.end,
        capacity: entry.capacity,
        booked: entry.booked,
        // Only attach detailed consultations for the "today" cell
        // (used by the drawer). Mock today = Wednesday (index 2).
        consultations:
          dayIndex === 2
            ? buildSampleConsultations(entry.start, entry.end, entry.booked)
            : undefined,
      };
    case "busy":
      return {
        kind: "busy",
        start: entry.start,
        end: entry.end,
        capacity: entry.capacity,
        booked: entry.booked,
        consultations: buildBusyConsultations(
          entry.start,
          entry.end,
          entry.booked,
          entry.currentSlot
        ),
      };
  }
}

function buildSampleConsultations(
  start: string,
  end: string,
  booked: number
): RosterConsultationLite[] {
  const list: RosterConsultationLite[] = [];
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const slot = 30;
  const total = Math.min(booked, Math.floor((endMin - startMin) / slot));
  const samplePatients = [
    { name: "Anika Patel", short: "A. Patel" },
    { name: "Liam O'Brien", short: "L. O'Brien" },
    { name: "Sofia Russo", short: "S. Russo" },
    { name: "Jin Park", short: "J. Park" },
    { name: "Maya Stein", short: "M. Stein" },
    { name: "Theo Brooks", short: "T. Brooks" },
  ];
  for (let i = 0; i < total; i += 1) {
    const s = startMin + i * slot;
    const p = samplePatients[i % samplePatients.length]!;
    list.push({
      id: `c-${start}-${i}`,
      start: fromMinutes(s),
      end: fromMinutes(s + slot),
      patientName: p.name,
      patientShortName: p.short,
      type: i === 0 ? "Initial" : "Follow-up",
      status: "upcoming",
    });
  }
  return list;
}

function buildBusyConsultations(
  start: string,
  end: string,
  booked: number,
  current: { start: string; end: string; patient: string; type: string }
): RosterConsultationLite[] {
  const list = buildSampleConsultations(start, end, booked);
  const currentStartMin = toMinutes(current.start);
  for (const c of list) {
    const cStart = toMinutes(c.start);
    if (cStart < currentStartMin) c.status = "done";
    else if (cStart === currentStartMin) {
      c.status = "in_progress";
      c.start = current.start;
      c.end = current.end;
      const fullName = current.patient.includes(".")
        ? expandShortName(current.patient)
        : current.patient;
      c.patientName = fullName;
      c.patientShortName = current.patient;
      c.type = current.type;
    }
  }
  return list;
}

function expandShortName(short: string): string {
  return short.replace(/^([A-Z])\.\s+/, "$1. ");
}

type RosterConsultationLite = NonNullable<Shift["consultations"]>[number];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Public mock API
// ---------------------------------------------------------------------------

export function getMockRosterWeek(weekStartISO: string): RosterWeekResponse {
  const monday = parseIsoDate(weekStartISO);
  const sunday = addDays(monday, 6);
  const doctors: RosterDoctor[] = DOCTOR_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    specialty: seed.specialty,
    clinic: seed.clinic,
    phone: seed.phone,
    joined: seed.joined,
    isMe: seed.isMe,
    week: seed.pattern.map((p, i) => patternToShift(p, i)),
  }));
  return {
    doctors,
    weekStart: toIsoDate(monday),
    weekEnd: toIsoDate(sunday),
  };
}

export function getMockRosterMonth(monthISO: string): RosterMonthResponse {
  // monthISO: "YYYY-MM"
  const [yStr, mStr] = monthISO.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const first = new Date(year, monthIdx, 1);
  const last = new Date(year, monthIdx + 1, 0);

  // Build a 6-row grid starting from the Monday on/before the 1st.
  const gridStart = startOfWeekMonday(first);
  const days: RosterMonthDay[] = [];

  for (let i = 0; i < 42; i += 1) {
    const d = addDays(gridStart, i);
    const inMonth = d.getMonth() === monthIdx;
    const dayKey = (i + d.getDate()) % 7; // pseudo-day variation
    const shifts: RosterMonthDayDoctor[] = DOCTOR_SEEDS.flatMap((seed) => {
      const entry = seed.pattern[dayKey] ?? seed.pattern[0]!;
      const shift = patternToShift(entry, dayKey);
      if (shift.kind === "off") return [];
      return [
        {
          doctorId: seed.id,
          initials: getDoctorInitials(seed.name),
          shift,
        },
      ];
    });
    days.push({ date: toIsoDate(d), inMonth, shifts });
  }

  return {
    month: monthISO,
    monthStart: toIsoDate(first),
    monthEnd: toIsoDate(last),
    days,
  };
}

/** Format helper for the spec's `${dow} · ${dd Mmm yyyy}` strings (en-AU). */
export function formatDateAU(d: Date, opts?: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    ...opts,
  });
}
