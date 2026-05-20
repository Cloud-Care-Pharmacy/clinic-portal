"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Mail, User } from "lucide-react";
import { AppSheet } from "@/components/shared/AppSheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PractitionerAvatar } from "./PractitionerAvatar";
import type { RosterPractitioner, Shift } from "@/types";

interface PractitionerDrawerProps {
  practitioner: RosterPractitioner | null;
  weekStartISO: string;
  todayIndex: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOW_LONG = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function shiftDurationHours(shift: Shift): number {
  if (!shift.start || !shift.end) return 0;
  const [sh, sm] = shift.start.split(":").map(Number);
  const [eh, em] = shift.end.split(":").map(Number);
  return ((eh ?? 0) * 60 + (em ?? 0) - ((sh ?? 0) * 60 + (sm ?? 0))) / 60;
}

export function PractitionerDrawer({
  practitioner,
  weekStartISO,
  todayIndex,
  open,
  onOpenChange,
}: PractitionerDrawerProps) {
  // Cache the most recently shown practitioner so the slide-out animation
  // still has data to render after the parent clears its selection.
  // Conditional state update during render is the React-recommended
  // pattern for derived-from-props values (no effect required).
  const [cachedPractitioner, setCachedPractitioner] = useState<RosterPractitioner | null>(null);
  const displayed = practitioner ?? cachedPractitioner;
  if (practitioner && practitioner !== cachedPractitioner) {
    setCachedPractitioner(practitioner);
  }

  const monday = useMemo(() => parseIsoDate(weekStartISO), [weekStartISO]);

  const totals = useMemo(() => {
    if (!displayed) return { hours: 0, booked: 0, capacity: 0, workingDays: 0 };
    let hours = 0;
    let booked = 0;
    let capacity = 0;
    let workingDays = 0;
    for (const s of displayed.week) {
      if (s.kind === "available" || s.kind === "busy") {
        hours += shiftDurationHours(s);
        booked += s.booked ?? 0;
        capacity += s.capacity ?? 0;
        workingDays += 1;
      }
    }
    return { hours, booked, capacity, workingDays };
  }, [displayed]);

  const todayShift =
    displayed && todayIndex !== null ? displayed.week[todayIndex] : undefined;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={displayed?.name ?? ""}
      description={
        displayed ? `${displayed.specialty} · ${displayed.clinic} clinic` : ""
      }
    >
      {displayed ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <PractitionerAvatar practitionerId={displayed.id} name={displayed.name} size="lg" />
            {displayed.isMe && (
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

          <Section title="This week">
            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="grid" style={{ gridTemplateColumns: "80px 1fr 110px" }}>
                {displayed.week.map((shift, i) => {
                  const date = addDays(monday, i);
                  const isToday = todayIndex === i;
                  return (
                    <DayRow
                      key={DOW_LONG[i]}
                      dow={DOW_LONG[i]!}
                      date={date}
                      shift={shift}
                      isToday={isToday}
                      isLast={i === 6}
                    />
                  );
                })}
              </div>
            </div>
          </Section>

          <Section title="Week totals">
            <dl
              className="grid gap-x-3.5 gap-y-2 text-sm"
              style={{ gridTemplateColumns: "130px 1fr" }}
            >
              <dt className="text-muted-foreground">Scheduled hours</dt>
              <dd className="font-medium text-foreground">
                {totals.hours.toFixed(1)} h
              </dd>
              <dt className="text-muted-foreground">Booked / capacity</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {totals.booked} / {totals.capacity}{" "}
                {totals.capacity > 0 && (
                  <span className="text-muted-foreground">
                    ({Math.round((totals.booked / totals.capacity) * 100)}%)
                  </span>
                )}
              </dd>
              <dt className="text-muted-foreground">Working days</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {totals.workingDays} of 7
              </dd>
            </dl>
          </Section>

          {todayShift &&
            (todayShift.kind === "available" || todayShift.kind === "busy") &&
            (todayShift.consultations?.length ?? 0) > 0 && (
              <Section title="Today's consultations">
                <ul className="flex flex-col gap-2">
                  {todayShift.consultations!.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5"
                      style={{
                        borderColor:
                          c.status === "in_progress"
                            ? "var(--primary)"
                            : "var(--border)",
                        boxShadow:
                          c.status === "in_progress"
                            ? "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)"
                            : undefined,
                      }}
                    >
                      <div className="w-15 shrink-0">
                        <div className="font-mono text-[13px] font-semibold tabular-nums">
                          {c.start}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {durationLabel(c.start, c.end)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">
                          {c.patientName}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {c.type}
                        </div>
                      </div>
                      <StatusBadge
                        variant={
                          c.status === "done"
                            ? "success"
                            : c.status === "in_progress"
                              ? "warning"
                              : "info"
                        }
                      >
                        {c.status === "done"
                          ? "Done"
                          : c.status === "in_progress"
                            ? "In progress"
                            : "Upcoming"}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

          <Section title="Profile">
            <dl
              className="grid gap-x-3.5 gap-y-2 text-sm"
              style={{ gridTemplateColumns: "130px 1fr" }}
            >
              <dt className="text-muted-foreground">Specialty</dt>
              <dd className="font-medium text-foreground">{displayed.specialty}</dd>
              <dt className="text-muted-foreground">Primary clinic</dt>
              <dd className="font-medium text-foreground">{displayed.clinic}</dd>
              {displayed.phone && (
                <>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-mono text-foreground">{displayed.phone}</dd>
                </>
              )}
              {displayed.joined && (
                <>
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd className="font-medium text-foreground">{displayed.joined}</dd>
                </>
              )}
            </dl>
          </Section>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              title="Coming soon"
            >
              <CalendarPlus className="size-4 " />
              Add shift
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              title="Coming soon"
            >
              <Mail className="size-4 " />
              Message
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled
              title="Coming soon"
              className="ml-auto"
            >
              <User className="size-4 " />
              View profile
            </Button>
          </div>
        </div>
      ) : null}
    </AppSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

function DayRow({
  dow,
  date,
  shift,
  isToday,
  isLast,
}: {
  dow: string;
  date: Date;
  shift: Shift;
  isToday: boolean;
  isLast: boolean;
}) {
  const dateLabel = date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    timeZone: "Australia/Sydney",
  });
  const cellStyle: React.CSSProperties = {
    background: isToday
      ? "color-mix(in srgb, var(--primary) 6%, var(--card))"
      : "var(--card)",
    borderBottom: isLast ? undefined : `1px solid var(--border)`,
  };
  return (
    <>
      <div className="px-3 py-2.5 text-[13px]" style={cellStyle}>
        <div className="font-semibold leading-tight">{dow}</div>
        <div className="text-[11px] text-muted-foreground">{dateLabel}</div>
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2.5 text-[13px]"
        style={cellStyle}
      >
        {shift.kind === "off" ? (
          <span className="text-muted-foreground">Off duty</span>
        ) : shift.kind === "leave" ? (
          <StatusBadge variant="danger">{shift.note ?? "On leave"}</StatusBadge>
        ) : (
          <>
            <span className="font-semibold tabular-nums">
              {shift.start}–{shift.end}
            </span>
            <StatusBadge variant={shift.kind === "busy" ? "warning" : "success"}>
              {shift.kind === "busy" ? "In consult" : "Available"}
            </StatusBadge>
          </>
        )}
      </div>
      <div
        className="px-3 py-2.5 text-right text-[12px] tabular-nums text-muted-foreground"
        style={cellStyle}
      >
        {shift.kind === "available" || shift.kind === "busy"
          ? `${shift.booked ?? 0}/${shift.capacity ?? 0} booked`
          : "—"}
      </div>
    </>
  );
}

function durationLabel(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh ?? 0) * 60 + (em ?? 0) - ((sh ?? 0) * 60 + (sm ?? 0));
  return `${mins} min`;
}
