"use client";

import { useMemo } from "react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import type { Consultation, ConsultationStatus, ConsultationType } from "@/types";

interface ConsultationTableProps {
  consultations: Consultation[];
  total?: number;
  loading?: boolean;
  onRowClick: (consultation: Consultation) => void;
  onSchedule: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilters: ConsultationStatus[];
  onStatusFiltersChange: (value: ConsultationStatus[]) => void;
  typeFilters: ConsultationType[];
  onTypeFiltersChange: (value: ConsultationType[]) => void;
}

const TYPE_COLORS: Record<ConsultationType, string> = {
  initial: "bg-status-info-bg text-status-info-fg border-status-info-border",
  "follow-up": "bg-status-accent-bg text-status-accent-fg border-status-accent-border",
  renewal: "bg-status-success-bg text-status-success-fg border-status-success-border",
};

type StatusFilterOption = ConsultationStatus;
type TypeFilterOption = ConsultationType;

const STATUS_OPTIONS: StatusFilterOption[] = [
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
];
const TYPE_OPTIONS: TypeFilterOption[] = ["initial", "follow-up", "renewal"];

export function ConsultationTable({
  consultations,
  total,
  loading,
  onRowClick,
  onSchedule,
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  typeFilters,
  onTypeFiltersChange,
}: ConsultationTableProps) {
  const hasActiveFilters =
    Boolean(searchQuery.trim()) || statusFilters.length > 0 || typeFilters.length > 0;

  const visibleConsultations = useMemo(
    () =>
      consultations.filter((consultation) => {
        if (statusFilters.length > 0 && !statusFilters.includes(consultation.status)) {
          return false;
        }
        if (typeFilters.length > 0 && !typeFilters.includes(consultation.type)) {
          return false;
        }

        return matchesSearchQuery(searchQuery, [
          consultation.patientName,
          consultation.doctorName,
          consultation.patientId,
          consultation.doctorId,
          consultation.id,
          consultation.status,
          consultation.status.replace("-", " "),
          consultation.type,
          consultation.type.replace("-", " "),
          consultation.scheduledAt,
          consultation.completedAt,
          consultation.notes,
          consultation.outcome,
        ]);
      }),
    [consultations, searchQuery, statusFilters, typeFilters]
  );

  const clearFilters = () => {
    onSearchChange("");
    onStatusFiltersChange([]);
    onTypeFiltersChange([]);
  };

  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS as string[],
        value: statusFilters as string[],
        onChange: (v: string[]) => onStatusFiltersChange(v as StatusFilterOption[]),
      },
      {
        key: "type",
        label: "Type",
        options: TYPE_OPTIONS as string[],
        value: typeFilters as string[],
        onChange: (v: string[]) => onTypeFiltersChange(v as TypeFilterOption[]),
      },
    ],
    [onStatusFiltersChange, onTypeFiltersChange, statusFilters, typeFilters]
  );

  const columns: GridColDef<Consultation>[] = [
    {
      field: "patientName",
      headerName: "Patient",
      flex: 1,
      minWidth: 160,
    },
    {
      field: "doctorName",
      headerName: "Doctor",
      flex: 1,
      minWidth: 160,
    },
    {
      field: "type",
      headerName: "Type",
      width: 120,
      renderCell: (params) => (
        <Badge
          variant="outline"
          className={cn(
            "capitalize text-xs",
            TYPE_COLORS[params.value as ConsultationType]
          )}
        >
          {params.value}
        </Badge>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => <StatusBadge status={params.value} />,
    },
    {
      field: "scheduledAt",
      headerName: "Scheduled",
      width: 160,
      valueFormatter: (value: string) =>
        new Date(value).toLocaleString("en-AU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  const toolbar = (
    <FilterBar
      searchPlaceholder="Search consultations…"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      filters={filters}
      resultCount={
        hasActiveFilters ? visibleConsultations.length : (total ?? consultations.length)
      }
      resultLabel="consultations"
    />
  );

  if (!loading && consultations.length === 0 && !hasActiveFilters) {
    return (
      <EmptyState
        title="No consultations yet"
        description="Schedule your first consultation to get started."
        actionLabel="Schedule Consultation"
        onAction={onSchedule}
      />
    );
  }

  if (!loading && visibleConsultations.length === 0) {
    return (
      <div style={{ width: "100%" }}>
        {toolbar}
        <EmptyState
          title="No consultations match your filters"
          description="Adjust or clear the search and filters to see more records."
          actionLabel="Clear filters"
          onAction={clearFilters}
          dashed
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {toolbar}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={visibleConsultations}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          rowHeight={56}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: {
              sortModel: [{ field: "scheduledAt", sort: "desc" }],
            },
          }}
          onRowClick={(params: GridRowParams<Consultation>) => onRowClick(params.row)}
          sx={dataGridSx}
        />
      </div>
    </div>
  );
}
