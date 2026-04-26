"use client";

import { useState } from "react";
import { CalendarDays, Table2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ConsultationTable } from "@/components/consultations/ConsultationTable";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { ConsultationCalendar } from "@/components/consultations/ConsultationCalendar";
import { useConsultations } from "@/lib/hooks/use-consultations";
import type {
  Consultation,
  ConsultationStatus,
  ConsultationsListResponse,
  ConsultationType,
} from "@/types";

type ViewMode = "table" | "calendar";

interface ConsultationsClientProps {
  entityId: string;
  initialConsultations?: ConsultationsListResponse;
}

export function ConsultationsClient({
  entityId,
  initialConsultations,
}: ConsultationsClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<ConsultationStatus[]>([]);
  const [typeFilters, setTypeFilters] = useState<ConsultationType[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("consultations-view") as ViewMode) || "table";
    }
    return "table";
  });
  const query = {
    limit: 50,
    offset: 0,
    search: searchQuery.trim() || undefined,
    status: statusFilters.length === 1 ? statusFilters[0] : undefined,
    type: typeFilters.length === 1 ? typeFilters[0] : undefined,
    sort: "scheduledAt" as const,
    order: "desc" as const,
  };
  const { data, isLoading, error } = useConsultations(
    undefined,
    initialConsultations,
    query
  );
  const consultations = data?.data?.consultations ?? [];

  function toggleView(mode: ViewMode) {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("consultations-view", mode);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-r-none"
                onClick={() => toggleView("table")}
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-l-none"
                onClick={() => toggleView("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              Schedule Consultation
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-status-danger-fg">
          Failed to load consultations: {error.message}
        </div>
      ) : (
        <ErrorBoundary>
          {viewMode === "table" ? (
            <ConsultationTable
              consultations={consultations}
              loading={isLoading}
              onRowClick={setSelected}
              onSchedule={() => setSheetOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilters={statusFilters}
              onStatusFiltersChange={setStatusFilters}
              typeFilters={typeFilters}
              onTypeFiltersChange={setTypeFilters}
              total={data?.data?.pagination?.total}
            />
          ) : (
            <ConsultationCalendar
              consultations={consultations}
              onEventClick={setSelected}
            />
          )}
        </ErrorBoundary>
      )}

      <NewConsultationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        entityId={entityId}
      />
      <NewConsultationSheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        consultation={selected}
      />
    </div>
  );
}
