/**
 * Roster data hooks.
 *
 * TODO: replace mock fetchers with `/api/proxy/rosters/week|month` calls
 * once the backend exposes them. Query keys and response shape are stable
 * so the swap should be a drop-in.
 */

import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  getMockRosterMonth,
  getMockRosterWeek,
} from "@/lib/rosters-mock";
import type { RosterMonthResponse, RosterWeekResponse } from "@/types";

async function fetchRosterWeek(weekStartISO: string): Promise<RosterWeekResponse> {
  // Mock: resolves synchronously through a microtask so React Query sees a Promise.
  return Promise.resolve(getMockRosterWeek(weekStartISO));
}

async function fetchRosterMonth(monthISO: string): Promise<RosterMonthResponse> {
  return Promise.resolve(getMockRosterMonth(monthISO));
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

export function useRosterWeek(
  weekStartISO: string,
  initialData?: RosterWeekResponse
) {
  return useQuery({
    ...rosterWeekQueryOptions(weekStartISO),
    initialData,
  });
}

export function useRosterMonth(
  monthISO: string,
  initialData?: RosterMonthResponse
) {
  return useQuery({
    ...rosterMonthQueryOptions(monthISO),
    initialData,
  });
}
