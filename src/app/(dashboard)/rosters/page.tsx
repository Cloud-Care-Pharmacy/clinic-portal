import {
  currentSydneyDate,
  getMockRosterMonth,
  getMockRosterWeek,
  startOfWeekMonday,
} from "@/lib/rosters-mock";
import { RostersClient } from "./RostersClient";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toIsoMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default async function RostersPage() {
  const now = currentSydneyDate();
  const weekStartISO = toIsoDate(startOfWeekMonday(now));
  const monthISO = toIsoMonth(now);

  // TODO: replace with ApiClient calls when backend lands.
  const initialWeek = getMockRosterWeek(weekStartISO);
  const initialMonth = getMockRosterMonth(monthISO);

  return (
    <RostersClient
      initialWeekStartISO={weekStartISO}
      initialMonthISO={monthISO}
      initialWeek={initialWeek}
      initialMonth={initialMonth}
    />
  );
}
