"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RosterCard } from "@/components/rosters/RosterCard";
import { RosterLegend } from "@/components/rosters/RosterLegend";
import { WeekGridSkeleton } from "@/components/rosters/WeekGridSkeleton";
import { startOfWeekMonday } from "@/lib/rosters-utils";

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function RostersLoading() {
  const monday = startOfWeekMonday(new Date());
  const sunday = addDays(monday, 6);
  const rangeLabel = `${monday.toLocaleDateString("en-AU", {
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
  })}`;
  const stepLabel = `Week of ${monday.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Sydney",
  })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rosters"
        description="Weekly availability across the practice. Click a practitioner to view their full week."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value="all">
          <TabsList>
            <TabsTrigger value="all" disabled>
              All practitioners
            </TabsTrigger>
            <TabsTrigger value="available-now" disabled>
              Available now
            </TabsTrigger>
            <TabsTrigger value="on-leave" disabled>
              On leave
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <RosterLegend className="ml-auto" />
      </div>

      <RosterCard
        title="Weekly roster"
        rangeLabel={rangeLabel}
        stepLabel={stepLabel}
        view="week"
        onView={() => undefined}
        onPrev={() => undefined}
        onNext={() => undefined}
        onToday={() => undefined}
      >
        <WeekGridSkeleton />
      </RosterCard>
    </div>
  );
}
