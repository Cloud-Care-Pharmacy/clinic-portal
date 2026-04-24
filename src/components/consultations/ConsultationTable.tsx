"use client";

import { useState, useMemo } from "react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { Search, X, CirclePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn, dataGridSx } from "@/lib/utils";
import type { Consultation, ConsultationStatus, ConsultationType } from "@/types";

interface ConsultationTableProps {
  consultations: Consultation[];
  loading?: boolean;
  onRowClick: (consultation: Consultation) => void;
  onSchedule: () => void;
}

const TYPE_COLORS: Record<ConsultationType, string> = {
  initial: "bg-blue-100 text-blue-800 border-blue-200",
  "follow-up": "bg-purple-100 text-purple-800 border-purple-200",
  renewal: "bg-green-100 text-green-800 border-green-200",
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

function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  typeFilters,
  onTypeFiltersChange,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilters: StatusFilterOption[];
  onStatusFiltersChange: (f: StatusFilterOption[]) => void;
  typeFilters: TypeFilterOption[];
  onTypeFiltersChange: (f: TypeFilterOption[]) => void;
}) {
  const toggleStatus = (s: StatusFilterOption) =>
    statusFilters.includes(s)
      ? onStatusFiltersChange(statusFilters.filter((x) => x !== s))
      : onStatusFiltersChange([...statusFilters, s]);

  const toggleType = (t: TypeFilterOption) =>
    typeFilters.includes(t)
      ? onTypeFiltersChange(typeFilters.filter((x) => x !== t))
      : onTypeFiltersChange([...typeFilters, t]);

  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search consultations…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 w-[250px] h-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 h-9 text-sm font-medium transition-colors hover:bg-muted",
            statusFilters.length > 0
              ? "border-primary/50 bg-primary/5"
              : "border-border"
          )}
        >
          <CirclePlus className="h-4 w-4 text-muted-foreground" />
          Status
          {statusFilters.length > 0 && (
            <Badge
              variant="outline"
              className="ml-1 rounded-md px-1.5 py-0 text-xs font-normal bg-primary/10 border-primary/20"
            >
              {statusFilters.length}
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={4}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={statusFilters.includes(s)}
                onClick={() => toggleStatus(s)}
              >
                <span className="capitalize">{s}</span>
              </DropdownMenuCheckboxItem>
            ))}
            {statusFilters.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onStatusFiltersChange([])}>
                  Clear filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Type filter */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 h-9 text-sm font-medium transition-colors hover:bg-muted",
            typeFilters.length > 0 ? "border-primary/50 bg-primary/5" : "border-border"
          )}
        >
          <CirclePlus className="h-4 w-4 text-muted-foreground" />
          Type
          {typeFilters.length > 0 && (
            <Badge
              variant="outline"
              className="ml-1 rounded-md px-1.5 py-0 text-xs font-normal bg-primary/10 border-primary/20"
            >
              {typeFilters.length}
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={4}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TYPE_OPTIONS.map((t) => (
              <DropdownMenuCheckboxItem
                key={t}
                checked={typeFilters.includes(t)}
                onClick={() => toggleType(t)}
              >
                <span className="capitalize">{t}</span>
              </DropdownMenuCheckboxItem>
            ))}
            {typeFilters.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onTypeFiltersChange([])}>
                  Clear filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ConsultationTable({
  consultations,
  loading,
  onRowClick,
  onSchedule,
}: ConsultationTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<StatusFilterOption[]>([]);
  const [typeFilters, setTypeFilters] = useState<TypeFilterOption[]>([]);

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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilters={statusFilters}
        onStatusFiltersChange={setStatusFilters}
        typeFilters={typeFilters}
        onTypeFiltersChange={setTypeFilters}
      />
      <DataGrid
        rows={filtered}
        columns={columns}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          sorting: {
            sortModel: [{ field: "scheduledAt", sort: "desc" }],
          },
        }}
        onRowClick={(params: GridRowParams<Consultation>) => onRowClick(params.row)}
        sx={{
          ...dataGridSx,
          cursor: "pointer",
          "& .MuiDataGrid-row:nth-of-type(odd)": {
            backgroundColor: "var(--muted)",
          },
          "& .MuiDataGrid-row:nth-of-type(even)": {
            backgroundColor: "var(--background)",
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: "color-mix(in srgb, var(--muted) 80%, var(--primary) 8%)",
          },
        }}
      />
    </div>
  );
}
