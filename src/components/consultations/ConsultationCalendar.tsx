"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Consultation, ConsultationType } from "@/types";

const TYPE_COLORS: Record<ConsultationType, string> = {
  initial: "bg-status-info-fg",
  "follow-up": "bg-status-accent-fg",
  renewal: "bg-status-success-fg",
};

const STATUS_OPACITY: Record<string, string> = {
  scheduled: "opacity-100",
  completed: "opacity-60",
  cancelled: "opacity-40 line-through",
  "no-show": "opacity-40",
};

interface ConsultationCalendarProps {
  consultations: Consultation[];
  onEventClick: (consultation: Consultation) => void;
}

type CalendarView = "month" | "week";

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
            className="min-h-[100px] border-b border-r bg-muted/20"
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
                "min-h-[100px] border-b border-r p-1",
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
              <div className="space-y-0.5">
                {dayConsultations.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onEventClick(c)}
                    className={cn(
                      "w-full text-left text-[11px] leading-tight rounded px-1 py-0.5 text-white truncate hover:opacity-80 transition-opacity",
                      TYPE_COLORS[c.type],
                      STATUS_OPACITY[c.status]
                    )}
                  >
                    {formatTime(c.scheduledAt)} {c.patientName}
                  </button>
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
                    <button
                      key={c.id}
                      onClick={() => onEventClick(c)}
                      className={cn(
                        "w-full text-left text-xs rounded p-1.5 text-white hover:opacity-80 transition-opacity",
                        TYPE_COLORS[c.type],
                        STATUS_OPACITY[c.status]
                      )}
                    >
                      <p className="font-medium truncate">
                        {formatTime(c.scheduledAt)}
                      </p>
                      <p className="truncate">{c.patientName}</p>
                      <p className="truncate text-white/80">{c.doctorName}</p>
                    </button>
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
    } else {
      d.setDate(d.getDate() + 7 * direction);
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
      : `${weekStart.toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
        })} – ${weekEnd.toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-status-info-fg" />
              Initial
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-status-accent-fg" />
              Follow-up
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-status-success-fg" />
              Renewal
            </span>
          </div>

          <div className="flex items-center rounded-lg border">
            <Button
              variant={view === "month" ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              variant={view === "week" ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setView("week")}
            >
              Week
            </Button>
          </div>
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
      ) : (
        <WeekView
          startDate={weekStart}
          consultations={consultations}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}
