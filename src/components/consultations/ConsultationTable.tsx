"use client";

import { useMemo, useState } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
} from "@mui/x-data-grid";
import Link from "next/link";
import { CalendarRange, ExternalLink, X } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import type { Consultation, ConsultationStatus, ConsultationType } from "@/types";
import type { DateRangeFilter } from "@/app/(dashboard)/consultations/ConsultationsClient";

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
  doctorOptions: Array<{ id: string; name: string }>;
  doctorFilters: string[];
  onDoctorFiltersChange: (value: string[]) => void;
  dateRange: DateRangeFilter;
  onDateRangeChange: (value: DateRangeFilter) => void;
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
  doctorOptions,
  doctorFilters,
  onDoctorFiltersChange,
  dateRange,
  onDateRangeChange,
  paginationModel,
  onPaginationModelChange,
}: ConsultationTableProps) {
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilters.length > 0 ||
    typeFilters.length > 0 ||
    doctorFilters.length > 0 ||
    Boolean(dateRange.from) ||
    Boolean(dateRange.to);

  const visibleConsultations = useMemo(
    () =>
      consultations.filter((consultation) => {
        if (statusFilters.length > 0 && !statusFilters.includes(consultation.status)) {
          return false;
        }
        if (typeFilters.length > 0 && !typeFilters.includes(consultation.type)) {
          return false;
        }
        if (doctorFilters.length > 0) {
          const key = consultation.doctorId || consultation.doctorName;
          if (!key || !doctorFilters.includes(key)) return false;
        }
        if (dateRange.from || dateRange.to) {
          const t = new Date(consultation.scheduledAt).getTime();
          if (dateRange.from) {
            const fromT = new Date(dateRange.from);
            fromT.setHours(0, 0, 0, 0);
            if (t < fromT.getTime()) return false;
          }
          if (dateRange.to) {
            const toT = new Date(dateRange.to);
            toT.setHours(23, 59, 59, 999);
            if (t > toT.getTime()) return false;
          }
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
    [
      consultations,
      searchQuery,
      statusFilters,
      typeFilters,
      doctorFilters,
      dateRange.from,
      dateRange.to,
    ]
  );

  const clearFilters = () => {
    onSearchChange("");
    onStatusFiltersChange([]);
    onTypeFiltersChange([]);
    onDoctorFiltersChange([]);
    onDateRangeChange({});
  };

  const filters: FilterDefinition[] = useMemo(() => {
    const base: FilterDefinition[] = [
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
    ];
    if (doctorOptions.length > 0) {
      const idToName = new Map(doctorOptions.map((d) => [d.id, d.name]));
      base.push({
        key: "doctor",
        label: "Doctor",
        options: doctorOptions.map((d) => d.id),
        value: doctorFilters,
        onChange: onDoctorFiltersChange,
        formatOption: (id: string) => idToName.get(id) ?? id,
      });
    }
    return base;
  }, [
    onStatusFiltersChange,
    onTypeFiltersChange,
    onDoctorFiltersChange,
    statusFilters,
    typeFilters,
    doctorFilters,
    doctorOptions,
  ]);

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
          <div className="group/patient flex items-center gap-3 py-1">
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
            <Link
              href={`/patients/${params.row.patientId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${name} in new tab`}
              onClick={(e) => e.stopPropagation()}
              className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover/patient:opacity-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
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
      leading={<DateRangePill value={dateRange} onChange={onDateRangeChange} />}
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

const DATE_PILL_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
};

function formatRangeLabel(range: DateRangeFilter): string {
  if (range.from && range.to) {
    return `${range.from.toLocaleDateString("en-AU", DATE_PILL_FMT)} – ${range.to.toLocaleDateString("en-AU", DATE_PILL_FMT)}`;
  }
  if (range.from)
    return `From ${range.from.toLocaleDateString("en-AU", DATE_PILL_FMT)}`;
  if (range.to) return `Until ${range.to.toLocaleDateString("en-AU", DATE_PILL_FMT)}`;
  return "Date range";
}

function DateRangePill({
  value,
  onChange,
}: {
  value: DateRangeFilter;
  onChange: (next: DateRangeFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = Boolean(value.from || value.to);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-sm font-medium transition-colors hover:bg-accent",
          isActive ? "border-primary/50 bg-primary/5" : "border-border"
        )}
      >
        <CalendarRange className="size-4 text-muted-foreground" />
        {formatRangeLabel(value)}
        {isActive && (
          <button
            type="button"
            aria-label="Clear date range"
            className="ml-1 rounded-sm text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onChange({});
            }}
          >
            <X className="size-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={
            value.from || value.to ? { from: value.from, to: value.to } : undefined
          }
          onSelect={(range) => onChange({ from: range?.from, to: range?.to })}
          captionLayout="dropdown"
          defaultMonth={value.from ?? new Date()}
        />
        <div className="flex justify-end gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange({});
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
