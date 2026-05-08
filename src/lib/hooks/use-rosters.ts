/**
 * Roster data hooks.
 *
 * Talks to `/api/proxy/rosters/{week,month}` which proxies to the
 * gateway's `GET /api/rosters/week?start=YYYY-MM-DD` and
 * `GET /api/rosters/month?month=YYYY-MM` endpoints.
 *
 * Query keys are stable: `["roster-week", weekStartISO]` and
 * `["roster-month", monthISO]`.
 */

import { queryOptions, useQuery } from "@tanstack/react-query";
import type { RosterMonthResponse, RosterWeekResponse } from "@/types";

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function fetchRosterWeek(weekStartISO: string): Promise<RosterWeekResponse> {
  const res = await fetch(
    `/api/proxy/rosters/week?start=${encodeURIComponent(weekStartISO)}`
  );
  if (!res.ok) throw new Error("Failed to fetch roster week");
  const payload = (await res.json()) as Envelope<RosterWeekResponse>;
  return payload.data;
}

async function fetchRosterMonth(monthISO: string): Promise<RosterMonthResponse> {
  const res = await fetch(
    `/api/proxy/rosters/month?month=${encodeURIComponent(monthISO)}`
  );
  if (!res.ok) throw new Error("Failed to fetch roster month");
  const payload = (await res.json()) as Envelope<RosterMonthResponse>;
  return payload.data;
}

export function rosterWeekQueryOptions(weekStartISO: string) {
  return queryOptions({
    queryKey: ["roster-week", weekStartISO] as const,
    queryFn: () => fetchRosterWeek(weekStartISO),
    staleTime: 60_000,
  });
}

export function rosterMonthQueryOptions(monthISO: string) {
  return queryOptions({
    queryKey: ["roster-month", monthISO] as const,
    queryFn: () => fetchRosterMonth(monthISO),
    staleTime: 60_000,
  });
}

export function useRosterWeek(weekStartISO: string, initialData?: RosterWeekResponse) {
  return useQuery({
    ...rosterWeekQueryOptions(weekStartISO),
    initialData,
  });
}

export function useRosterMonth(monthISO: string, initialData?: RosterMonthResponse) {
  return useQuery({
    ...rosterMonthQueryOptions(monthISO),
    initialData,
  });
}
