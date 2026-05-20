"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RosterMonthDay, RosterMonthDayPractitioner } from "@/types";

interface MonthGridProps {
  days: RosterMonthDay[];
  monthISO: string;
  todayISO: string | null;
  onSelectDay: (date: string) => void;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({ days, todayISO, onSelectDay }: MonthGridProps) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      }}
    >
      {DOW.map((d) => (
        <div
          key={d}
          className="border-b border-r px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground last:border-r-0"
          style={{
            background: "var(--table-header)",
            borderColor: "var(--table-separator)",
          }}
        >
          {d}
        </div>
      ))}
      {days.map((day) => (
        <MonthDayCell
          key={day.date}
          day={day}
          isToday={todayISO === day.date}
          isPast={todayISO ? day.date < todayISO : false}
          onClick={() => onSelectDay(day.date)}
        />
      ))}
    </div>
  );
}

function MonthDayCell({
  day,
  isToday,
  isPast,
  onClick,
}: {
  day: RosterMonthDay;
  isToday: boolean;
  isPast: boolean;
  onClick: () => void;
}) {
  const dateNum = useMemo(() => Number(day.date.split("-")[2]), [day.date]);
  const isWeekendIdx = (() => {
    const d = new Date(day.date);
    const wd = d.getDay();
    return wd === 0 || wd === 6;
  })();

  const onShiftCount = day.shifts.filter(
    (s) => s.shift.kind === "available" || s.shift.kind === "busy"
  ).length;
  const onLeaveCount = day.shifts.filter((s) => s.shift.kind === "leave").length;

  // Sort: leave → busy → available (per spec §8.3)
  const order: Record<string, number> = { leave: 0, busy: 1, available: 2 };
  const sorted = day.shifts.toSorted(
    (a, b) => (order[a.shift.kind] ?? 9) - (order[b.shift.kind] ?? 9)
  );
  const visible = sorted.slice(0, 5);
  const overflow = sorted.length - visible.length;

  const bg = !day.inMonth
    ? "color-mix(in srgb, var(--muted) 50%, var(--background))"
    : isToday
      ? "color-mix(in srgb, var(--primary) 3%, var(--background))"
      : isPast
        ? "color-mix(in srgb, var(--muted) 30%, var(--background))"
        : isWeekendIdx
          ? "color-mix(in srgb, var(--muted) 35%, var(--background))"
          : "var(--background)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[120px] flex-col gap-1 border-b border-r px-2.5 py-2 text-left transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !day.inMonth && "opacity-55",
        day.inMonth && isPast && !isToday && "opacity-70"
      )}
      style={{
        background: bg,
        borderColor: "var(--table-separator)",
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: isToday ? "var(--primary)" : "var(--foreground)" }}
        >
          {dateNum}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {onShiftCount > 0 && (
            <span
              className="inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
              style={{
                background: "var(--status-success-bg)",
                color: "var(--status-success-fg)",
              }}
            >
              {onShiftCount}
            </span>
          )}
          {onLeaveCount > 0 && (
            <span
              className="inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
              style={{
                background: "var(--status-danger-bg)",
                color: "var(--status-danger-fg)",
              }}
            >
              {onLeaveCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {visible.map((entry) => (
          <PractitionerChip key={entry.practitionerId} entry={entry} />
        ))}
        {overflow > 0 && (
          <span
            className="inline-flex h-[18px] items-center self-start rounded-md px-1.5 text-[10.5px] font-medium"
            style={{
              background: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            +{overflow} more
          </span>
        )}
      </div>
    </button>
  );
}

function PractitionerChip({ entry }: { entry: RosterMonthDayPractitioner }) {
  const { shift, initials } = entry;
  const tone =
    shift.kind === "leave"
      ? {
          bg: "var(--status-danger-bg)",
          fg: "var(--status-danger-fg)",
          border: "var(--status-danger-border)",
        }
      : shift.kind === "busy"
        ? {
            bg: "var(--status-warning-bg)",
            fg: "var(--status-warning-fg)",
            border: "var(--status-warning-border)",
          }
        : {
            bg: "var(--status-success-bg)",
            fg: "var(--status-success-fg)",
            border: "var(--status-success-border)",
          };

  const label =
    shift.kind === "leave"
      ? "leave"
      : shift.start && shift.end
        ? `${shift.start}–${shift.end}`
        : "";

  return (
    <span
      className="inline-flex h-[18px] items-center gap-1.5 self-start truncate rounded-md border px-1.5 text-[10.5px] font-medium tabular-nums"
      style={{
        background: tone.bg,
        color: tone.fg,
        borderColor: tone.border,
      }}
    >
      <span className="font-semibold">{initials}</span>
      <span aria-hidden="true">·</span>
      <span className="truncate">{label}</span>
    </span>
  );
}
