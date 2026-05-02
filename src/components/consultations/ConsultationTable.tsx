"use client";

import { useMemo } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
} from "@mui/x-data-grid";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import type { Consultation, ConsultationStatus, ConsultationType } from "@/types";

const TYPE_DOT: Record<ConsultationType, string> = {
  initial: "bg-status-info-fg",
  "follow-up": "bg-status-accent-fg",
  renewal: "bg-status-success-fg",
};

const AVATAR_PALETTE = [
  "bg-status-warning-bg text-status-warning-fg",
  "bg-status-info-bg text-status-info-fg",
  "bg-status-success-bg text-status-success-fg",
  "bg-status-accent-bg text-status-accent-fg",
  "bg-status-danger-bg text-status-danger-fg",
  "bg-status-neutral-bg text-status-neutral-fg",
];

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}

function colorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

const SHORT_DATE_FMT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
};
const TIME_FMT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
};

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function relativeLabel(iso: string, status: ConsultationStatus): string | null {
  if (status === "completed" || status === "cancelled" || status === "no-show") {
    return null;
  }
  const target = new Date(iso);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (Math.abs(diffMin) <= 60) return "starting now";
  if (diffMin < 0) return null;

  // Whole-day difference based on local midnights
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  const days = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000
  );
  if (days <= 0) return null;
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

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
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
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
  paginationModel,
  onPaginationModelChange,
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
      minWidth: 220,
      renderCell: (params) => {
        const name = params.row.patientName ?? "";
        const initials = getInitials(name);
        const color = colorFromName(name);
        return (
          <div className="flex items-center gap-3 py-1">
            <Avatar size="default">
              <AvatarFallback className={cn("text-xs font-semibold", color)}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-medium text-foreground">{name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {params.row.patientId}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: "doctorName",
      headerName: "Doctor",
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <div className="flex min-w-0 flex-col leading-tight py-1">
          <span className="truncate font-medium text-foreground">
            {params.row.doctorName}
          </span>
          {params.row.doctorId && (
            <span className="truncate text-xs text-muted-foreground">
              {params.row.doctorId}
            </span>
          )}
        </div>
      ),
    },
    {
      field: "type",
      headerName: "Type",
      width: 130,
      renderCell: (params) => {
        const type = params.value as ConsultationType;
        return (
          <Badge
            variant="outline"
            className={cn("capitalize text-xs gap-1.5", TYPE_COLORS[type])}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOT[type])}
              aria-hidden="true"
            />
            {type === "follow-up" ? "Follow-Up" : type}
          </Badge>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <StatusBadge status={params.value} dot className="capitalize" />
      ),
    },
    {
      field: "scheduledAt",
      headerName: "Scheduled",
      width: 200,
      renderCell: (params) => {
        const iso = params.value as string;
        const d = new Date(iso);
        const now = new Date();
        const dateLabel = isSameLocalDay(d, now)
          ? "Today"
          : d.toLocaleDateString("en-AU", SHORT_DATE_FMT);
        const timeLabel = d.toLocaleTimeString("en-AU", TIME_FMT);
        const relative = relativeLabel(iso, params.row.status);
        return (
          <div className="flex flex-col leading-tight py-1">
            <span className="font-medium text-foreground">{dateLabel}</span>
            <span className="text-xs text-muted-foreground">{timeLabel}</span>
            {relative && (
              <span className="text-xs text-status-warning-fg">{relative}</span>
            )}
          </div>
        );
      },
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
          paginationMode="server"
          rowCount={total ?? consultations.length}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={76}
          initialState={{
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
