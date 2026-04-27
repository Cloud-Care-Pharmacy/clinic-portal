"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientActivity } from "@/lib/hooks/use-patient-activity";
import {
  Stethoscope,
  StickyNote,
  Pill,
  Upload,
  Flag,
  UserPlus,
  Pencil,
  CalendarPlus,
  FileCheck,
  FileX,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ActivityEventCategory,
  ActivityEventType,
  PatientActivityResponse,
  PatientActivityEvent,
} from "@/types";

const EVENT_ICONS: Record<ActivityEventType, React.ReactNode> = {
  "consultation-scheduled": <CalendarPlus className="h-4 w-4" />,
  "consultation-completed": <Stethoscope className="h-4 w-4" />,
  "consultation-updated": <Stethoscope className="h-4 w-4" />,
  "task-created": <ClipboardCheck className="h-4 w-4" />,
  "task-assigned": <ClipboardCheck className="h-4 w-4" />,
  "task-started": <ClipboardCheck className="h-4 w-4" />,
  "task-completed": <ClipboardCheck className="h-4 w-4" />,
  "task-cancelled": <ClipboardCheck className="h-4 w-4" />,
  "note-added": <StickyNote className="h-4 w-4" />,
  "note-updated": <StickyNote className="h-4 w-4" />,
  "note-deleted": <StickyNote className="h-4 w-4" />,
  "prescription-issued": <Pill className="h-4 w-4" />,
  "document-uploaded": <Upload className="h-4 w-4" />,
  "document-verified": <FileCheck className="h-4 w-4" />,
  "document-rejected": <FileX className="h-4 w-4" />,
  "flag-raised": <Flag className="h-4 w-4" />,
  "flag-resolved": <Flag className="h-4 w-4" />,
  "patient-created": <UserPlus className="h-4 w-4" />,
  "details-updated": <Pencil className="h-4 w-4" />,
};

const EVENT_TILE_CLASSES: Record<ActivityEventCategory, string> = {
  consultations: "bg-status-info-bg text-status-info-fg border-status-info-border",
  tasks: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  notes: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
  prescriptions:
    "bg-status-accent-bg text-status-accent-fg border-status-accent-border",
  documents: "bg-status-success-bg text-status-success-fg border-status-success-border",
  system: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
};

type ActivityFilter = "all" | ActivityEventCategory;

const FILTER_OPTIONS: { label: string; value: ActivityFilter }[] = [
  { label: "All", value: "all" },
  { label: "Tasks", value: "tasks" },
  { label: "Notes", value: "notes" },
  { label: "Consults", value: "consultations" },
  { label: "Rx", value: "prescriptions" },
  { label: "Documents", value: "documents" },
  { label: "System", value: "system" },
];

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const diffMinutes = Math.floor(absMs / (1000 * 60));
  const diffHours = Math.floor(absMs / (1000 * 60 * 60));
  const diffDays = Math.floor(absMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return future ? "Soon" : "Just now";
  if (diffMinutes < 60) return future ? `In ${diffMinutes}m` : `${diffMinutes}m ago`;
  if (diffHours < 24) return future ? `In ${diffHours}h` : `${diffHours}h ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return future ? "Tomorrow" : "Yesterday";
  if (diffDays <= 30) return future ? `In ${diffDays}d` : `${diffDays}d ago`;

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

function fullTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityRow({ event }: { event: PatientActivityEvent }) {
  const description = event.description ?? "No additional details";

  return (
    <div className="flex gap-3 border-b border-border px-4 py-4 last:border-b-0">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[10px] border",
          EVENT_TILE_CLASSES[event.category]
        )}
      >
        {EVENT_ICONS[event.type]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground" title={event.title}>
            {event.title}
          </p>
          <time
            dateTime={event.createdAt}
            title={fullTimestamp(event.createdAt)}
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
          >
            {relativeTime(event.createdAt)}
          </time>
        </div>
        <p className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">
          {description}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {event.actorName} · {event.actorRole}
        </p>
      </div>
    </div>
  );
}

interface ActivityTabProps {
  patientId: string;
  initialActivity?: PatientActivityResponse;
}

export function ActivityTab({ patientId, initialActivity }: ActivityTabProps) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const { events, isLoading, errors } = usePatientActivity(patientId, initialActivity);
  const filteredEvents = events.filter(
    (event) => filter === "all" || event.category === filter
  );

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            className="min-h-11 rounded-full px-4 text-sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg">
          Patient activity could not be loaded. Try refreshing this page.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-9 rounded-[10px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No activity for this filter"
          description="Activity events will appear here as consultations, notes, prescriptions, documents, and patient updates are recorded."
          dashed
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {filteredEvents.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
