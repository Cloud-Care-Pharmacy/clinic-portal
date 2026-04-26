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

export function DashboardClient() {
  const { data: consultationsData } = useConsultations();
  const pendingCount = (consultationsData?.data?.consultations ?? []).filter(
    (c) => c.status === "scheduled"
  ).length;

  const statCards = [
    {
      title: "Total Patients",
      value: "127",
      badge: "+8.2%",
      trend: "up" as const,
      description: "Growing steadily",
      subtitle: "Patients for the last 6 months",
    },
    {
      title: "Pending Consultations",
      value: String(pendingCount),
      badge: pendingCount > 0 ? `${pendingCount} scheduled` : "None",
      trend: "down" as const,
      description: pendingCount > 0 ? "Needs scheduling attention" : "All caught up",
      subtitle: "Consultations awaiting completion",
    },
    {
      title: "Active Prescriptions",
      value: "43",
      badge: "+12.5%",
      trend: "up" as const,
      description: "Strong prescription rate",
      subtitle: "Activity exceeds targets",
    },
    {
      title: "New This Week",
      value: "5",
      badge: "+4.5%",
      trend: "up" as const,
      description: "Steady performance",
      subtitle: "Meets growth projections",
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
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions across the portal.</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
