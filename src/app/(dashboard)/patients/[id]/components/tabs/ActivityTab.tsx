"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  StickyNote,
  Pill,
  Upload,
  Flag,
  CheckCircle,
  UserPlus,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventType =
  | "consult-completed"
  | "note-added"
  | "prescription-issued"
  | "document-uploaded"
  | "flag-raised"
  | "flag-resolved"
  | "patient-created"
  | "details-updated";

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  "consult-completed": <Stethoscope className="h-4 w-4" />,
  "note-added": <StickyNote className="h-4 w-4" />,
  "prescription-issued": <Pill className="h-4 w-4" />,
  "document-uploaded": <Upload className="h-4 w-4" />,
  "flag-raised": <Flag className="h-4 w-4" />,
  "flag-resolved": <CheckCircle className="h-4 w-4" />,
  "patient-created": <UserPlus className="h-4 w-4" />,
  "details-updated": <Pencil className="h-4 w-4" />,
};

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Notes", value: "note-added" },
  { label: "Consults", value: "consult-completed" },
  { label: "Rx", value: "prescription-issued" },
  { label: "Documents", value: "document-uploaded" },
  { label: "System", value: "system" },
];

interface ActivityTabProps {
  patientId: string;
}

export function ActivityTab({ patientId }: ActivityTabProps) {
  const [filter, setFilter] = useState("all");

  // Activity feed is not yet backed by a real API endpoint — show placeholder
  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-muted-foreground">
          <Stethoscope className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-semibold">No activity yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Activity events will appear here as consultations, notes, prescriptions, and
          documents are created.
        </p>
      </div>
    </div>
  );
}
