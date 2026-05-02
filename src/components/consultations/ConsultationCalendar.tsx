"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { cn } from "@/lib/utils";
import type { Consultation, ConsultationType } from "@/types";

const TYPE_STYLES: Record<
  ConsultationType,
  { bg: string; border: string; text: string; label: string }
> = {
  initial: {
    bg: "bg-status-info-bg",
    border: "border-status-info-fg",
    text: "text-status-info-fg",
    label: "Initial",
  },
  "follow-up": {
    bg: "bg-status-accent-bg",
    border: "border-status-accent-fg",
    text: "text-status-accent-fg",
    label: "Follow-up",
  },
  renewal: {
    bg: "bg-status-success-bg",
    border: "border-status-success-fg",
    text: "text-status-success-fg",
    label: "Renewal",
  },
};

const STATUS_OPACITY: Record<string, string> = {
  scheduled: "opacity-100",
  completed: "opacity-70",
  cancelled: "opacity-50 line-through",
  "no-show": "opacity-50",
};

function formatShortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first.charAt(0).toUpperCase()}. ${last}`;
}

function EventChip({
  consultation,
  onClick,
}: {
  consultation: Consultation;
  onClick: () => void;
}) {
  const style = TYPE_STYLES[consultation.type];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-md border-l-4 pl-2 pr-1.5 py-1 transition-colors hover:brightness-95",
        style.bg,
        style.border,
        STATUS_OPACITY[consultation.status]
      )}
    >
      <span
        className={cn(
          "block w-fit rounded-sm bg-white/60 px-1 py-px font-mono text-[10px] leading-none tracking-tight text-foreground/70"
        )}
      >
        {formatTime(consultation.scheduledAt)}
      </span>
      <span
        className={cn(
          "mt-1 block truncate text-[11px] font-medium leading-tight",
          style.text
        )}
      >
        {formatShortName(consultation.patientName)} — {style.label}
      </span>
    </button>
  );
}

interface ConsultationCalendarProps {
  consultations: Consultation[];
  onEventClick: (consultation: Consultation) => void;
}

type CalendarView = "month" | "week" | "day";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.setDate(diff));
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function MonthView({
  year,
  month,
  consultations,
  onEventClick,
}: {
  year: number;
  month: number;
  consultations: Consultation[];
  onEventClick: (c: Consultation) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday start

  const consultationsByDay = useMemo(() => {
    const map = new Map<number, Consultation[]>();
    for (const c of consultations) {
      const d = new Date(c.scheduledAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(c);
      }
    }
    return map;
  }, [consultations, year, month]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 bg-muted">
        {days.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-2 border-b"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for offset */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="min-h-[140px] border-b border-r bg-muted/20"
          />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayConsultations = consultationsByDay.get(day) ?? [];
          const isToday = isCurrentMonth && day === todayDate;

          return (
            <div
              key={day}
              className={cn(
                "min-h-[140px] border-b border-r p-1.5",
                isToday && "bg-primary/5"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday && "bg-primary text-primary-foreground"
                )}
              >
                {day}
              </div>
              <div className="space-y-1">
                {dayConsultations.slice(0, 3).map((c) => (
                  <EventChip
                    key={c.id}
                    consultation={c}
                    onClick={() => onEventClick(c)}
                  />
                ))}
                {dayConsultations.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">
                    +{dayConsultations.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  startDate,
  consultations,
  onEventClick,
}: {
  startDate: Date;
  consultations: Consultation[];
  onEventClick: (c: Consultation) => void;
}) {
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7">
        {weekDays.map((day) => {
          const dateStr = localDateKey(day);
          const dayConsultations = consultations.filter((c) => {
            const cDate = localDateKey(new Date(c.scheduledAt));
            return cDate === dateStr;
          });

          const isToday = day.getTime() === today.getTime();

          return (
            <div key={dateStr} className="border-r last:border-r-0">
              {/* Day header */}
              <div
                className={cn(
                  "text-center py-2 border-b bg-muted",
                  isToday && "bg-primary/10"
                )}
              >
                <p className="text-xs text-muted-foreground">
                  {day.toLocaleDateString("en-AU", { weekday: "short" })}
                </p>
                <p className={cn("text-sm font-semibold", isToday && "text-primary")}>
                  {day.getDate()}
                </p>
              </div>

              {/* Events */}
              <div className="min-h-[300px] p-1 space-y-1">
                {dayConsultations
                  .sort(
                    (a, b) =>
                      new Date(a.scheduledAt).getTime() -
                      new Date(b.scheduledAt).getTime()
                  )
                  .map((c) => (
                    <EventChip
                      key={c.id}
                      consultation={c}
                      onClick={() => onEventClick(c)}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConsultationCalendar({
  consultations,
  onEventClick,
}: ConsultationCalendarProps) {
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  function navigate(direction: -1 | 1) {
    const d = new Date(currentDate);
    if (view === "month") {
      d.setMonth(d.getMonth() + direction);
    } else if (view === "week") {
      d.setDate(d.getDate() + 7 * direction);
    } else {
      d.setDate(d.getDate() + direction);
    }
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const weekStart = getStartOfWeek(currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const title =
    view === "month"
      ? currentDate.toLocaleDateString("en-AU", {
          month: "long",
          year: "numeric",
        })
      : view === "week"
        ? `${weekStart.toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
          })} – ${weekEnd.toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}`
        : currentDate.toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-l-none border-l-0"
              onClick={() => navigate(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>

          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 pl-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-info-fg" />
              Initial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-accent-fg" />
              Follow-up
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-success-fg" />
              Renewal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden lg:inline text-sm text-muted-foreground">
            Showing all doctors
          </span>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed">
            <Users className="h-4 w-4" />
            Doctors
          </Button>
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        </div>
      </div>

      {/* Calendar body */}
      {view === "month" ? (
        <MonthView
          year={year}
          month={month}
          consultations={consultations}
          onEventClick={onEventClick}
        />
      ) : view === "week" ? (
        <WeekView
          startDate={weekStart}
          consultations={consultations}
          onEventClick={onEventClick}
        />
      ) : (
        <DayView
          date={currentDate}
          consultations={consultations}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}

function DayView({
  date,
  consultations,
  onEventClick,
}: {
  date: Date;
  consultations: Consultation[];
  onEventClick: (c: Consultation) => void;
}) {
  const dateStr = localDateKey(date);
  const dayConsultations = consultations
    .filter((c) => localDateKey(new Date(c.scheduledAt)) === dateStr)
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

  return (
    <div className="rounded-lg border p-3">
      {dayConsultations.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No consultations scheduled.
        </p>
      ) : (
        <div className="space-y-2">
          {dayConsultations.map((c) => (
            <EventChip key={c.id} consultation={c} onClick={() => onEventClick(c)} />
          ))}
        </div>
      )}
    </div>
  );
}
