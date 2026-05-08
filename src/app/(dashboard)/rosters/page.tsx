import { api } from "@/lib/api";
import { currentSydneyDate, startOfWeekMonday } from "@/lib/rosters-utils";
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

  const [weekRes, monthRes] = await Promise.all([
    api.getRosterWeek(weekStartISO).catch(() => undefined),
    api.getRosterMonth(monthISO).catch(() => undefined),
  ]);

  return (
    <RostersClient
      initialWeekStartISO={weekStartISO}
      initialMonthISO={monthISO}
      initialWeek={weekRes?.data}
      initialMonth={monthRes?.data}
    />
  );
}
