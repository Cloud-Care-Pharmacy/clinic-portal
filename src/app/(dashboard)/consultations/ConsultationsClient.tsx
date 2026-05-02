"use client";

import { useMemo, useState } from "react";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { CalendarDays, Table2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
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

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

function startOfDayIso(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayIso(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

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
  const [doctorFilters, setDoctorFiltersRaw] = useState<string[]>([]);
  const [dateRange, setDateRangeRaw] = useState<DateRangeFilter>({});
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
  function setDoctorFilters(value: string[]) {
    setDoctorFiltersRaw(value);
    resetToFirstPage();
  }
  function setDateRange(value: DateRangeFilter) {
    setDateRangeRaw(value);
    resetToFirstPage();
  }

  const query = {
    limit: paginationModel.pageSize,
    offset: paginationModel.page * paginationModel.pageSize,
    search: searchQuery.trim() || undefined,
    status: statusFilters.length === 1 ? statusFilters[0] : undefined,
    type: typeFilters.length === 1 ? typeFilters[0] : undefined,
    doctorId: doctorFilters.length === 1 ? doctorFilters[0] : undefined,
    from: dateRange.from ? startOfDayIso(dateRange.from) : undefined,
    to: dateRange.to ? endOfDayIso(dateRange.to) : undefined,
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
  const consultations = useMemo(() => data?.data?.consultations ?? [], [data]);

  const doctorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of consultations) {
      const id = c.doctorId || c.doctorName;
      if (id && !seen.has(id)) {
        seen.set(id, c.doctorName || id);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [consultations]);

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
        description="Schedule, review, and follow up on patient consultations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={viewMode}
              onChange={toggleView}
              options={[
                {
                  value: "table",
                  label: "Table",
                  icon: <Table2 className="h-3.5 w-3.5" />,
                },
                {
                  value: "calendar",
                  label: "Calendar",
                  icon: <CalendarDays className="h-3.5 w-3.5" />,
                },
              ]}
            />
            <Button size="sm" className="h-8" onClick={() => setSheetOpen(true)}>
              <span className="sm:hidden">+ Schedule</span>
              <span className="hidden sm:inline">+ Schedule Consultation</span>
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
              doctorOptions={doctorOptions}
              doctorFilters={doctorFilters}
              onDoctorFiltersChange={setDoctorFilters}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
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
