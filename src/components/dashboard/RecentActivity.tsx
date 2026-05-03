"use client";

import { Activity } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import type { DashboardActivityItem } from "@/types";

interface RecentActivityProps {
  items: DashboardActivityItem[];
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";
  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No recent activity"
        description="Patient intakes, prescriptions, and consultations will appear here as your team works through the portal."
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-8">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{item.patientInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-wrap items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{item.patientName}</p>
              <p className="text-sm text-muted-foreground">{item.action}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatRelativeTime(item.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
