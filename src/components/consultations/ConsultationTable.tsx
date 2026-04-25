"use client";

import { useState, useMemo } from "react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dataGridSx } from "@/lib/datagrid-theme";
import type { Consultation, ConsultationStatus, ConsultationType } from "@/types";

interface ConsultationTableProps {
  consultations: Consultation[];
  loading?: boolean;
  onRowClick: (consultation: Consultation) => void;
  onSchedule: () => void;
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
  loading,
  onRowClick,
  onSchedule,
}: ConsultationTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<StatusFilterOption[]>([]);
  const [typeFilters, setTypeFilters] = useState<TypeFilterOption[]>([]);

  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS as string[],
        value: statusFilters as string[],
        onChange: (v: string[]) => setStatusFilters(v as StatusFilterOption[]),
      },
      {
        key: "type",
        label: "Type",
        options: TYPE_OPTIONS as string[],
        value: typeFilters as string[],
        onChange: (v: string[]) => setTypeFilters(v as TypeFilterOption[]),
      },
    ],
    [statusFilters, typeFilters]
  );

  const filtered = useMemo(() => {
    let result = consultations;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.patientName.toLowerCase().includes(q) ||
          c.doctorName.toLowerCase().includes(q) ||
          (c.notes ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilters.length > 0) {
      result = result.filter((c) => statusFilters.includes(c.status));
    }

    if (typeFilters.length > 0) {
      result = result.filter((c) => typeFilters.includes(c.type));
    }

    return result;
  }, [consultations, searchQuery, statusFilters, typeFilters]);

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

  if (!loading && consultations.length === 0) {
    return (
      <EmptyState
        title="No consultations yet"
        description="Schedule your first consultation to get started."
        actionLabel="Schedule Consultation"
        onAction={onSchedule}
      />
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <FilterBar
        searchPlaceholder="Search consultations…"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        resultCount={filtered.length}
        resultLabel="consultations"
      />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={filtered}
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
