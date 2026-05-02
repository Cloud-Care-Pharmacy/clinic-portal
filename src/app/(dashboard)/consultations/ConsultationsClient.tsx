"use client";

import { useState } from "react";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { CalendarDays, Table2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ConsultationTable } from "@/components/consultations/ConsultationTable";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { ConsultationCalendar } from "@/components/consultations/ConsultationCalendar";
import { ConsultationDetailSheet } from "@/components/consultations/ConsultationDetailSheet";
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
  const [editing, setEditing] = useState<Consultation | null>(null);
  const [searchQuery, setSearchQueryRaw] = useState("");
  const [statusFilters, setStatusFiltersRaw] = useState<ConsultationStatus[]>([]);
  const [typeFilters, setTypeFiltersRaw] = useState<ConsultationType[]>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("consultations-view") as ViewMode) || "table";
    }
    return "table";
  });

  function resetToFirstPage() {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }
  function setSearchQuery(value: string) {
    setSearchQueryRaw(value);
    resetToFirstPage();
  }
  function setStatusFilters(value: ConsultationStatus[]) {
    setStatusFiltersRaw(value);
    resetToFirstPage();
  }
  function setTypeFilters(value: ConsultationType[]) {
    setTypeFiltersRaw(value);
    resetToFirstPage();
  }

  const query = {
    limit: paginationModel.pageSize,
    offset: paginationModel.page * paginationModel.pageSize,
    search: searchQuery.trim() || undefined,
    status: statusFilters.length === 1 ? statusFilters[0] : undefined,
    type: typeFilters.length === 1 ? typeFilters[0] : undefined,
    sort: "scheduledAt" as const,
    order: "desc" as const,
  };
  const { data, isLoading, isFetching, error } = useConsultations(
    undefined,
    paginationModel.page === 0 && paginationModel.pageSize === 25
      ? initialConsultations
      : undefined,
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
              loading={isLoading || isFetching}
              onRowClick={setSelected}
              onSchedule={() => setSheetOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilters={statusFilters}
              onStatusFiltersChange={setStatusFilters}
              typeFilters={typeFilters}
              onTypeFiltersChange={setTypeFilters}
              total={data?.data?.pagination?.total}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
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
      <ConsultationDetailSheet
        consultation={selected}
        onClose={() => setSelected(null)}
        onEdit={(consultation) => {
          setEditing(consultation);
          setSelected(null);
        }}
      />
      <NewConsultationSheet
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        consultation={editing}
      />
    </div>
  );
}
