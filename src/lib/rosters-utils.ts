/**
 * Roster UI utilities (non-data).
 *
 * Pure helpers used by roster components. The data itself comes from
 * `/api/proxy/rosters/...` via `useRosterWeek` / `useRosterMonth`.
 */

/**
 * Avatar tints (ROSTERS_SPEC.md §11).
 *
 * This is the single sanctioned hex palette outside `globals.css` — the
 * spec defines it inline as a fixed warm palette. Do not inline these
 * values elsewhere; always import this constant.
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
  return AVATAR_TINTS[hashString(doctorId) % AVATAR_TINTS.length]!;
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

/** Monday of the given date's week (en-AU / ISO week start). */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const delta = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + delta);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Approximate "now in Sydney" — local clock, sufficient for layout. */
export function currentSydneyDate(): Date {
  return new Date();
}
