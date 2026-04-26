"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "@/components/dashboard/Overview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useConsultations } from "@/lib/hooks/use-consultations";
import {
  useDashboardIntakeOverview,
  useDashboardRecentActivity,
  useDashboardSummary,
} from "@/lib/hooks/use-dashboard";
import type {
  ConsultationsListResponse,
  DashboardIntakeOverviewResponse,
  DashboardRecentActivityResponse,
  DashboardSummaryResponse,
} from "@/types";

interface DashboardClientProps {
  entityId: string;
  initialConsultations?: ConsultationsListResponse;
  initialSummary?: DashboardSummaryResponse;
  initialIntakeOverview?: DashboardIntakeOverviewResponse;
  initialActivity?: DashboardRecentActivityResponse;
}

function formatDelta(value: number | undefined) {
  if (value === undefined) return "—";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function DashboardClient({
  entityId,
  initialConsultations,
  initialSummary,
  initialIntakeOverview,
  initialActivity,
}: DashboardClientProps) {
  const { data: consultationsData } = useConsultations(undefined, initialConsultations);
  const { data: summaryData } = useDashboardSummary(
    entityId || undefined,
    "30d",
    initialSummary
  );
  const { data: intakeData } = useDashboardIntakeOverview(
    { entityId: entityId || undefined, range: "12m", bucket: "month" },
    initialIntakeOverview
  );
  const { data: activityData } = useDashboardRecentActivity(
    { entityId: entityId || undefined, limit: 5 },
    initialActivity
  );
  const pendingCount = (consultationsData?.data?.consultations ?? []).filter(
    (c) => c.status === "scheduled"
  ).length;
  const summary = summaryData?.data;

  const statCards = [
    {
      title: "Total Patients",
      value: String(summary?.totalPatients ?? "—"),
      badge: formatDelta(summary?.totalPatientsDeltaPct),
      trend:
        (summary?.totalPatientsDeltaPct ?? 0) >= 0
          ? ("up" as const)
          : ("down" as const),
      description: "Patient registry",
      subtitle: `Across the selected ${summary?.period ?? "30d"} period`,
    },
    {
      title: "Pending Consultations",
      value: String(summary?.pendingConsultations ?? pendingCount),
      badge:
        (summary?.scheduledConsultations ?? pendingCount) > 0
          ? `${summary?.scheduledConsultations ?? pendingCount} scheduled`
          : "None",
      trend: "down" as const,
      description:
        (summary?.pendingConsultations ?? pendingCount) > 0
          ? "Needs scheduling attention"
          : "All caught up",
      subtitle: "Consultations awaiting completion",
    },
    {
      title: "Active Prescriptions",
      value: String(summary?.activePrescriptions ?? "—"),
      badge: formatDelta(summary?.activePrescriptionsDeltaPct),
      trend:
        (summary?.activePrescriptionsDeltaPct ?? 0) >= 0
          ? ("up" as const)
          : ("down" as const),
      description: "Parchment-linked patients",
      subtitle: "May take longer to refresh",
    },
    {
      title: "New Patients",
      value: String(summary?.newPatientsThisWeek ?? "—"),
      badge: formatDelta(summary?.newPatientsDeltaPct),
      trend:
        (summary?.newPatientsDeltaPct ?? 0) >= 0 ? ("up" as const) : ("down" as const),
      description: "New intakes",
      subtitle: `Reflects the selected ${summary?.period ?? "30d"} period`,
    },
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics" disabled>
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" disabled>
              Reports
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[15px] font-medium text-foreground/75">
                    {stat.title}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-full text-xs font-medium bg-white/70 border-foreground/10"
                  >
                    {stat.trend === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {stat.badge}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="stat-number">{stat.value}</div>
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {stat.description}
                      {stat.trend === "up" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </p>
                    <p className="text-[13px] text-foreground/55 mt-1">
                      {stat.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle>Patient Intake Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview series={intakeData?.data?.series ?? []} />
              </CardContent>
            </Card>
            <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions across the portal.</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity items={activityData?.data?.items ?? []} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
