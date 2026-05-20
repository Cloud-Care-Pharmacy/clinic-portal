"use client";

import { useMemo, useState } from "react";
import { CalendarX, Filter, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRosterMonth, useRosterWeek } from "@/lib/hooks/use-rosters";
import { startOfWeekMonday } from "@/lib/rosters-utils";
import type { RosterMonthResponse, RosterWeekResponse } from "@/types";
import { RosterCard, type ViewMode } from "@/components/rosters/RosterCard";
import { RosterLegend } from "@/components/rosters/RosterLegend";
import { WeekGrid } from "@/components/rosters/WeekGrid";
import { WeekGridSkeleton } from "@/components/rosters/WeekGridSkeleton";
import { MonthGrid } from "@/components/rosters/MonthGrid";
import { MonthGridSkeleton } from "@/components/rosters/MonthGridSkeleton";
import { PractitionerDrawer } from "@/components/rosters/PractitionerDrawer";

interface RostersClientProps {
  initialWeekStartISO: string;
  initialMonthISO: string;
  initialWeek?: RosterWeekResponse;
  initialMonth?: RosterMonthResponse;
}

type FilterTab = "all" | "available-now" | "on-leave";

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

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function RostersClient({
  initialWeekStartISO,
  initialMonthISO,
  initialWeek,
  initialMonth,
}: RostersClientProps) {
  const [view, setView] = useState<ViewMode>("week");
  const [tab, setTab] = useState<FilterTab>("all");
  const [weekStartISOOverride, setWeekStartISO] = useState<string | null>(null);
  const [monthISOOverride, setMonthISO] = useState<string | null>(null);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string | null>(null);
  const weekStartISO = weekStartISOOverride ?? initialWeekStartISO;
  const monthISO = monthISOOverride ?? initialMonthISO;

  const weekQuery = useRosterWeek(
    weekStartISO,
    weekStartISO === initialWeekStartISO ? initialWeek : undefined
  );
  const monthQuery = useRosterMonth(
    monthISO,
    monthISO === initialMonthISO ? initialMonth : undefined
  );

  const week: RosterWeekResponse =
    weekQuery.data ??
    initialWeek ?? { practitioners: [], weekStart: weekStartISO, weekEnd: weekStartISO };
  const month: RosterMonthResponse =
    monthQuery.data ??
    initialMonth ?? {
      month: monthISO,
      monthStart: `${monthISO}-01`,
      monthEnd: `${monthISO}-01`,
      days: [],
    };

  // Today index relative to displayed week (0=Mon..6=Sun) or null if not in this week.
  const todayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = parseIsoDate(weekStartISO);
    const diff = Math.round((today.getTime() - monday.getTime()) / 86400000);
    return diff >= 0 && diff <= 6 ? diff : null;
  }, [weekStartISO]);

  const todayISO = useMemo(() => {
    return toIsoDate(new Date());
  }, []);

  // Filter practitioners by tab.
  const filteredPractitioners = useMemo(() => {
    if (tab === "all") return week.practitioners;
    return week.practitioners.filter((d) => {
      if (todayIndex === null) return false;
      const todayShift = d.week[todayIndex];
      if (!todayShift) return false;
      if (tab === "available-now") return todayShift.kind === "available";
      if (tab === "on-leave") return todayShift.kind === "leave";
      return true;
    });
  }, [week.practitioners, tab, todayIndex]);

  // Counts for tab chips (same logic but always against full set).
  const counts = useMemo(() => {
    let avail = 0;
    let leave = 0;
    if (todayIndex !== null) {
      for (const d of week.practitioners) {
        const s = d.week[todayIndex];
        if (s?.kind === "available") avail += 1;
        else if (s?.kind === "leave") leave += 1;
      }
    }
    return { all: week.practitioners.length, available: avail, leave };
  }, [week.practitioners, todayIndex]);

  const selectedPractitioner = useMemo(
    () => week.practitioners.find((d) => d.id === selectedPractitionerId) ?? null,
    [week.practitioners, selectedPractitionerId]
  );

  // Range / step labels.
  const monday = parseIsoDate(weekStartISO);
  const sunday = addDays(monday, 6);
  const rangeLabel =
    view === "week"
      ? `${monday.toLocaleDateString("en-AU", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          timeZone: "Australia/Sydney",
        })} – ${sunday.toLocaleDateString("en-AU", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Australia/Sydney",
        })}`
      : parseIsoDate(`${monthISO}-01`).toLocaleDateString("en-AU", {
          month: "long",
          year: "numeric",
          timeZone: "Australia/Sydney",
        });

  const stepLabel =
    view === "week"
      ? `Week of ${monday.toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Australia/Sydney",
        })}`
      : `Month of ${parseIsoDate(`${monthISO}-01`).toLocaleDateString("en-AU", {
          month: "long",
          year: "numeric",
          timeZone: "Australia/Sydney",
        })}`;

  function step(delta: number) {
    if (view === "week") {
      const next = addDays(monday, delta * 7);
      setWeekStartISO(toIsoDate(next));
    } else {
      const next = addMonths(parseIsoDate(`${monthISO}-01`), delta);
      setMonthISO(toIsoMonth(next));
    }
  }

  function goToday() {
    const now = new Date();
    if (view === "week") {
      setWeekStartISO(toIsoDate(startOfWeekMonday(now)));
    } else {
      setMonthISO(toIsoMonth(now));
    }
  }

  function onMonthDayClick(dateISO: string) {
    const d = parseIsoDate(dateISO);
    setWeekStartISO(toIsoDate(startOfWeekMonday(d)));
    setView("week");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rosters"
        description="Weekly availability across the practice. Click a practitioner to view their full week."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="all">
              All practitioners <span className="count">{counts.all}</span>
            </TabsTrigger>
            <TabsTrigger value="available-now">
              Available now <span className="count">{counts.available}</span>
            </TabsTrigger>
            <TabsTrigger value="on-leave">
              On leave <span className="count">{counts.leave}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <RosterLegend className="ml-auto" />
      </div>

      <RosterCard
        title={view === "week" ? "Weekly roster" : "Monthly roster"}
        rangeLabel={rangeLabel}
        stepLabel={stepLabel}
        view={view}
        onView={setView}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={goToday}
      >
        {view === "week" ? (
          <WeekViewBody
            isLoading={weekQuery.isPending && !weekQuery.data}
            isError={weekQuery.isError}
            onRetry={() => weekQuery.refetch()}
            totalPractitioners={week.practitioners.length}
            filteredPractitioners={filteredPractitioners}
            tab={tab}
            weekStartISO={weekStartISO}
            selectedPractitionerId={selectedPractitionerId}
            todayIndex={todayIndex}
            onSelectPractitioner={(id) => setSelectedPractitionerId(id)}
            onClearFilter={() => setTab("all")}
          />
        ) : (
          <MonthViewBody
            isLoading={monthQuery.isPending && !monthQuery.data}
            isError={monthQuery.isError}
            onRetry={() => monthQuery.refetch()}
            days={month.days}
            monthISO={monthISO}
            todayISO={todayISO}
            onSelectDay={onMonthDayClick}
          />
        )}
      </RosterCard>

      <PractitionerDrawer
        practitioner={selectedPractitioner}
        weekStartISO={weekStartISO}
        todayIndex={todayIndex}
        open={!!selectedPractitioner}
        onOpenChange={(open) => {
          if (!open) setSelectedPractitionerId(null);
        }}
      />
    </div>
  );
}

interface WeekViewBodyProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  totalPractitioners: number;
  filteredPractitioners: import("@/types").RosterPractitioner[];
  tab: FilterTab;
  weekStartISO: string;
  selectedPractitionerId: string | null;
  todayIndex: number | null;
  onSelectPractitioner: (id: string) => void;
  onClearFilter: () => void;
}

function WeekViewBody({
  isLoading,
  isError,
  onRetry,
  totalPractitioners,
  filteredPractitioners,
  tab,
  weekStartISO,
  selectedPractitionerId,
  todayIndex,
  onSelectPractitioner,
  onClearFilter,
}: WeekViewBodyProps) {
  if (isLoading) {
    return <WeekGridSkeleton />;
  }
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the roster"
        description="Something went wrong fetching this week's roster. Please try again."
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }
  if (totalPractitioners === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="No practitioners rostered"
        description="No practitioners have shifts scheduled for this week. Try a different week, or add availability from the Profile page."
      />
    );
  }
  if (filteredPractitioners.length === 0) {
    return (
      <EmptyState
        icon={Filter}
        title="No practitioners match this filter"
        description={
          tab === "available-now"
            ? "No practitioners are available right now."
            : tab === "on-leave"
              ? "No practitioners are on leave today."
              : "No practitioners match the current filter."
        }
        actionLabel="Show all practitioners"
        onAction={onClearFilter}
      />
    );
  }
  return (
    <WeekGrid
      practitioners={filteredPractitioners}
      weekStartISO={weekStartISO}
      selectedPractitionerId={selectedPractitionerId}
      todayIndex={todayIndex}
      onSelectPractitioner={onSelectPractitioner}
    />
  );
}

interface MonthViewBodyProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  days: import("@/types").RosterMonthDay[];
  monthISO: string;
  todayISO: string | null;
  onSelectDay: (date: string) => void;
}

function MonthViewBody({
  isLoading,
  isError,
  onRetry,
  days,
  monthISO,
  todayISO,
  onSelectDay,
}: MonthViewBodyProps) {
  if (isLoading) {
    return <MonthGridSkeleton />;
  }
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the roster"
        description="Something went wrong fetching this month's roster. Please try again."
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }
  const hasAnyShift = days.some((d) => d.shifts.length > 0);
  if (days.length === 0 || !hasAnyShift) {
    return (
      <EmptyState
        icon={CalendarX}
        title="No rostered shifts this month"
        description="No practitioners have shifts scheduled for this month. Try a different month, or add availability from the Profile page."
      />
    );
  }
  return (
    <MonthGrid
      days={days}
      monthISO={monthISO}
      todayISO={todayISO}
      onSelectDay={onSelectDay}
    />
  );
}
