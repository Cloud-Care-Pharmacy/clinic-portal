"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RosterPractitioner, Shift } from "@/types";
import { PractitionerAvatar } from "./PractitionerAvatar";

interface WeekGridProps {
  practitioners: RosterPractitioner[];
  weekStartISO: string;
  selectedPractitionerId: string | null;
  todayIndex: number | null; // 0..6 (Mon..Sun) or null if not in this week
  onSelectPractitioner: (practitionerId: string) => void;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function densityRowVar(): string {
  return "84px";
}

export function WeekGrid({
  practitioners,
  weekStartISO,
  selectedPractitionerId,
  todayIndex,
  onSelectPractitioner,
}: WeekGridProps) {
  const monday = useMemo(() => parseIsoDate(weekStartISO), [weekStartISO]);

  // Pin "isMe" practitioner at top, otherwise preserve order.
  const orderedPractitioners = useMemo(() => {
    const me = practitioners.find((d) => d.isMe);
    if (!me) return practitioners;
    return [me, ...practitioners.filter((d) => d.id !== me.id)];
  }, [practitioners]);

  return (
    <div className="overflow-x-auto">
      <div
        className={cn("rosters-week-grid")}
        style={
          {
            "--col-doc": "220px",
            "--col-day": "110px",
            "--row-h": densityRowVar(),
            display: "grid",
            gridTemplateColumns:
              "var(--col-doc) repeat(7, minmax(var(--col-day), 1fr))",
            minWidth: "max-content",
          } as React.CSSProperties
        }
      >
        {/* Header row */}
        <div
          className="sticky left-0 top-0 z-[4] border-b border-r px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
          style={{
            background: "var(--table-header)",
            borderColor: "var(--table-separator)",
          }}
        >
          Practitioner
        </div>
        {DOW.map((dow, i) => {
          const date = addDays(monday, i);
          const isToday = todayIndex === i;
          const isWeekend = i >= 5;
          const isPast = todayIndex !== null && i < todayIndex;
          return (
            <div
              key={dow}
              className={cn(
                "sticky top-0 z-[3] border-b px-3.5 py-2.5",
                i < 6 && "border-r",
                isPast && "opacity-70"
              )}
              style={{
                background: isToday
                  ? "color-mix(in srgb, var(--primary) 6%, var(--table-header))"
                  : isPast
                    ? "color-mix(in srgb, var(--muted) 50%, var(--table-header))"
                    : isWeekend
                      ? "color-mix(in srgb, var(--muted) 60%, var(--table-header))"
                      : "var(--table-header)",
                borderColor: "var(--table-separator)",
              }}
            >
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {dow}
              </div>
              <div
                className="text-sm font-semibold"
                style={{
                  color: isToday ? "var(--primary)" : "var(--foreground)",
                }}
              >
                {date.toLocaleDateString("en-AU", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "Australia/Sydney",
                })}
              </div>
            </div>
          );
        })}

        {/* Data rows */}
        {orderedPractitioners.map((practitioner) => (
          <PractitionerRow
            key={practitioner.id}
            practitioner={practitioner}
            todayIndex={todayIndex}
            isSelected={selectedPractitionerId === practitioner.id}
            onSelect={() => onSelectPractitioner(practitioner.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface PractitionerRowProps {
  practitioner: RosterPractitioner;
  todayIndex: number | null;
  isSelected: boolean;
  onSelect: () => void;
}

function PractitionerRow({ practitioner, todayIndex, isSelected, onSelect }: PractitionerRowProps) {
  const isMe = !!practitioner.isMe;
  const cellBg = isSelected
    ? "color-mix(in srgb, var(--primary) 10%, var(--card))"
    : isMe
      ? "color-mix(in srgb, var(--primary) 5%, var(--card))"
      : "var(--card)";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-pressed={isSelected}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "sticky left-0 z-[2] flex cursor-pointer items-center gap-3 border-b border-r px-3 py-2.5 outline-none transition-colors",
          "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        )}
        style={{
          background: cellBg,
          borderColor: "var(--table-separator)",
          height: "var(--row-h)",
        }}
      >
        <PractitionerAvatar practitionerId={practitioner.id} name={practitioner.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">
              {practitioner.name}
            </span>
            {isMe && (
              <span
                className="inline-block rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.04em]"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                You
              </span>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {practitioner.specialty} · {practitioner.clinic}
          </div>
        </div>
      </div>

      {practitioner.week.map((shift, dayIdx) => (
        <DayCell
          key={dayIdx}
          shift={shift}
          isToday={todayIndex === dayIdx}
          isWeekend={dayIdx >= 5}
          isPast={todayIndex !== null && dayIdx < todayIndex}
          isLastCol={dayIdx === 6}
          rowSelected={isSelected}
          rowIsMe={isMe}
        />
      ))}
    </>
  );
}

interface DayCellProps {
  shift: Shift;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  isLastCol: boolean;
  rowSelected: boolean;
  rowIsMe: boolean;
}

function DayCell({
  shift,
  isToday,
  isWeekend,
  isPast,
  isLastCol,
  rowSelected,
  rowIsMe,
}: DayCellProps) {
  const baseBg = isToday
    ? "color-mix(in srgb, var(--primary) 3%, var(--background))"
    : isPast
      ? "color-mix(in srgb, var(--muted) 30%, var(--background))"
      : isWeekend
        ? "color-mix(in srgb, var(--muted) 35%, var(--background))"
        : "var(--background)";

  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b p-2",
        !isLastCol && "border-r",
        isPast && !isToday && "opacity-70"
      )}
      style={{
        background: baseBg,
        borderColor: "var(--table-separator)",
        height: "var(--row-h)",
        // subtle row-tint for selected/me carries through here too
        ...(rowSelected
          ? {
              boxShadow:
                "inset 0 0 0 9999px color-mix(in srgb, var(--primary) 5%, transparent)",
            }
          : rowIsMe
            ? {
                boxShadow:
                  "inset 0 0 0 9999px color-mix(in srgb, var(--primary) 2%, transparent)",
              }
            : null),
      }}
    >
      <ShiftBlock shift={shift} />
    </div>
  );
}

function ShiftBlock({ shift }: { shift: Shift }) {
  if (shift.kind === "off") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span
          aria-label="Off duty"
          className="block h-px w-4"
          style={{ background: "var(--border)" }}
        />
      </div>
    );
  }

  if (shift.kind === "leave") {
    return (
      <div
        className="flex flex-1 flex-col gap-0.5 rounded-[10px] border px-2.5 py-2"
        style={{
          background: "var(--status-danger-bg)",
          color: "var(--status-danger-fg)",
          borderColor: "var(--status-danger-border)",
        }}
      >
        <div className="text-[12.5px] font-semibold leading-tight tabular-nums">
          On leave
        </div>
        {shift.note && <div className="truncate text-[11px] italic">{shift.note}</div>}
      </div>
    );
  }

  const isBusy = shift.kind === "busy";
  const tokenBg = isBusy ? "var(--status-warning-bg)" : "var(--status-success-bg)";
  const tokenFg = isBusy ? "var(--status-warning-fg)" : "var(--status-success-fg)";
  const tokenBorder = isBusy
    ? "var(--status-warning-border)"
    : "var(--status-success-border)";

  const currentSlot = isBusy
    ? shift.consultations?.find((c) => c.status === "in_progress")
    : undefined;

  return (
    <div
      className="relative flex flex-1 flex-col gap-0.5 overflow-hidden rounded-[10px] border px-2.5 py-2"
      style={{ background: tokenBg, color: tokenFg, borderColor: tokenBorder }}
    >
      {isBusy && (
        <span
          aria-hidden="true"
          className="rosters-pulse absolute right-2 top-2 size-1.5  rounded-full"
          style={{ background: "currentColor" }}
        />
      )}
      <div className="text-[12.5px] font-semibold leading-tight tabular-nums">
        {shift.start}&ndash;{shift.end}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] leading-tight">
        <Users className="size-3 " aria-hidden="true" />
        <span className="tabular-nums">
          {shift.booked ?? 0}/{shift.capacity ?? 0}
        </span>
        {currentSlot && (
          <>
            <span aria-hidden="true">·</span>
            <span className="truncate tabular-nums">
              {currentSlot.start}&ndash;{currentSlot.end}{" "}
              <span className="font-medium">{currentSlot.patientShortName}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
