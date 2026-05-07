"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RosterDoctor, Shift } from "@/types";
import { DoctorAvatar } from "./DoctorAvatar";

interface WeekGridProps {
  doctors: RosterDoctor[];
  weekStartISO: string;
  selectedDoctorId: string | null;
  todayIndex: number | null; // 0..6 (Mon..Sun) or null if not in this week
  onSelectDoctor: (doctorId: string) => void;
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
  doctors,
  weekStartISO,
  selectedDoctorId,
  todayIndex,
  onSelectDoctor,
}: WeekGridProps) {
  const monday = useMemo(() => parseIsoDate(weekStartISO), [weekStartISO]);

  // Pin "isMe" doctor at top, otherwise preserve order.
  const orderedDoctors = useMemo(() => {
    const me = doctors.find((d) => d.isMe);
    if (!me) return doctors;
    return [me, ...doctors.filter((d) => d.id !== me.id)];
  }, [doctors]);

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
          Doctor
        </div>
        {DOW.map((dow, i) => {
          const date = addDays(monday, i);
          const isToday = todayIndex === i;
          const isWeekend = i >= 5;
          return (
            <div
              key={dow}
              className={cn(
                "sticky top-0 z-[3] border-b px-3.5 py-2.5",
                i < 6 && "border-r"
              )}
              style={{
                background: isToday
                  ? "color-mix(in srgb, var(--primary) 6%, var(--table-header))"
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
        {orderedDoctors.map((doctor) => (
          <DoctorRow
            key={doctor.id}
            doctor={doctor}
            todayIndex={todayIndex}
            isSelected={selectedDoctorId === doctor.id}
            onSelect={() => onSelectDoctor(doctor.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface DoctorRowProps {
  doctor: RosterDoctor;
  todayIndex: number | null;
  isSelected: boolean;
  onSelect: () => void;
}

function DoctorRow({ doctor, todayIndex, isSelected, onSelect }: DoctorRowProps) {
  const isMe = !!doctor.isMe;
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
        <DoctorAvatar doctorId={doctor.id} name={doctor.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">
              {doctor.name}
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
            {doctor.specialty} · {doctor.clinic}
          </div>
        </div>
      </div>

      {doctor.week.map((shift, dayIdx) => (
        <DayCell
          key={dayIdx}
          shift={shift}
          isToday={todayIndex === dayIdx}
          isWeekend={dayIdx >= 5}
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
  isLastCol: boolean;
  rowSelected: boolean;
  rowIsMe: boolean;
}

function DayCell({
  shift,
  isToday,
  isWeekend,
  isLastCol,
  rowSelected,
  rowIsMe,
}: DayCellProps) {
  const baseBg = isToday
    ? "color-mix(in srgb, var(--primary) 3%, var(--background))"
    : isWeekend
      ? "color-mix(in srgb, var(--muted) 35%, var(--background))"
      : "var(--background)";

  return (
    <div
      className={cn("flex flex-col gap-1 border-b p-2", !isLastCol && "border-r")}
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
          className="rosters-pulse absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
          style={{ background: "currentColor" }}
        />
      )}
      <div className="text-[12.5px] font-semibold leading-tight tabular-nums">
        {shift.start}&ndash;{shift.end}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] leading-tight">
        <Users className="h-3 w-3" aria-hidden="true" />
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
