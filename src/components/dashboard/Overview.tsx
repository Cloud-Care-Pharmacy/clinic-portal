"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { DashboardIntakeSeriesPoint } from "@/types";

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

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
