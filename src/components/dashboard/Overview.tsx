"use client";

import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { DashboardIntakeSeriesPoint } from "@/types";

const OverviewChart = dynamic(() => import("./OverviewChart"), {
  ssr: false,
  loading: () => <div className="h-87.5" />,
});

interface OverviewProps {
  series: DashboardIntakeSeriesPoint[];
}

export function Overview({ series }: OverviewProps) {
  const data = series.map((point) => ({ name: point.label, total: point.total }));
  const hasValues = data.some((d) => d.total > 0);

  if (data.length === 0 || !hasValues) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No intake data yet"
        description="Patient intake numbers will appear here once new patients are registered."
        className="h-87.5"
      />
    );
  }

  return <OverviewChart data={data} />;
}
