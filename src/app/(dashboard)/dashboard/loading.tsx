import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STAT_CARD_TITLES = [
  "Total Patients",
  "Pending Consultations",
  "Active Prescriptions",
  "New Patients",
];

export default function DashboardLoading() {
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
            {STAT_CARD_TITLES.map((title) => (
              <Card key={title} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between gap-y-0 pb-2">
                  <CardTitle className="text-[15px] font-medium text-foreground/75">
                    {title}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-full border-foreground/10 bg-background/70 text-xs font-medium"
                  >
                    <TrendingUp className="size-3 " />
                    <Skeleton className="h-3 w-10" />
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-10 w-16" />
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <Skeleton className="h-4 w-32" />
                      <TrendingUp className="size-4  text-muted-foreground" />
                    </p>
                    <Skeleton className="mt-2 h-3 w-44" />
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
                <DashboardChartSkeleton />
              </CardContent>
            </Card>
            <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions across the portal.</CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardActivitySkeleton />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardChartSkeleton() {
  return (
    <div className="flex h-87.5 items-end gap-3 px-3 pb-8 pt-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton
          key={index}
          className="flex-1 rounded-t-md"
          style={{ height: `${64 + ((index * 29) % 180)}px` }}
        />
      ))}
    </div>
  );
}

function DashboardActivitySkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="size-9  rounded-full" />
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
