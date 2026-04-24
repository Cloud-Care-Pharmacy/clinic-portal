"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Copy,
  Search,
  SlidersHorizontal,
  X,
  CirclePlus,
} from "lucide-react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn, dataGridSx } from "@/lib/utils";
import type { PatientMapping } from "@/types";

interface PatientTableProps {
  patients: PatientMapping[];
  loading?: boolean;
}

function PmsStatusCell({ value }: { value: string | null }) {
  const linked = Boolean(value);
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize font-medium text-xs",
        linked
          ? "bg-status-success-bg text-status-success-fg border-status-success-border"
          : "bg-status-warning-bg text-status-warning-fg border-status-warning-border"
      )}
    >
      {linked ? "Linked" : "Pending"}
    </Badge>
  );
}

function ActionsCell({
  onView,
  onCopyEmail,
  onDelete,
}: {
  patient: PatientMapping;
  onView: () => void;
  onCopyEmail: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-muted transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyEmail}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type StatusFilter = "Linked" | "Pending";

const STATUS_OPTIONS: StatusFilter[] = ["Linked", "Pending"];

interface ColumnVisibility {
  patient_name: boolean;
  original_email: boolean;
  date_of_birth: boolean;
  mobile: boolean;
  location: boolean;
  generated_email: boolean;
  halaxy_patient_id: boolean;
  pms_status: boolean;
  created_at: boolean;
}

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  patient_name: true,
  original_email: true,
  date_of_birth: true,
  mobile: false,
  location: false,
  generated_email: false,
  halaxy_patient_id: false,
  pms_status: true,
  created_at: true,
};

const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  patient_name: "Name",
  original_email: "Email",
  date_of_birth: "Date of Birth",
  mobile: "Mobile",
  location: "Location",
  generated_email: "Generated Email",
  halaxy_patient_id: "PMS ID",
  pms_status: "Status",
  created_at: "Created",
};

function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  columnVisibility,
  onColumnVisibilityChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilters: StatusFilter[];
  onStatusFiltersChange: (filters: StatusFilter[]) => void;
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
}) {
  const toggleStatus = (status: StatusFilter) => {
    if (statusFilters.includes(status)) {
      onStatusFiltersChange(statusFilters.filter((s) => s !== status));
    } else {
      onStatusFiltersChange([...statusFilters, status]);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter patients..."
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
              {STATUS_OPTIONS.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilters.includes(status)}
                  onClick={() => toggleStatus(status)}
                >
                  {status}
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
      </div>

      <div className="flex items-center gap-2">
        {/* Column visibility (View) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-sm font-medium transition-colors hover:bg-muted">
            <SlidersHorizontal className="h-4 w-4" />
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(COLUMN_LABELS) as (keyof ColumnVisibility)[]).map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={columnVisibility[key]}
                  onClick={() =>
                    onColumnVisibilityChange({
                      ...columnVisibility,
                      [key]: !columnVisibility[key],
                    })
                  }
                >
                  {COLUMN_LABELS[key]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/patients/new">
          <Button size="sm" className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function PatientTable({ patients, loading }: PatientTableProps) {
  const router = useRouter();
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY
  );

  const handleCopyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email);
  }, []);

  const filteredPatients = useMemo(() => {
    let result = patients;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.original_email.toLowerCase().includes(q) ||
          p.generated_email.toLowerCase().includes(q) ||
          (p.halaxy_patient_id ?? "").toLowerCase().includes(q) ||
          (p.first_name ?? "").toLowerCase().includes(q) ||
          (p.last_name ?? "").toLowerCase().includes(q) ||
          (p.mobile ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilters.length > 0) {
      result = result.filter((p) => {
        const status = p.halaxy_patient_id ? "Linked" : "Pending";
        return statusFilters.includes(status);
      });
    }

    return result;
  }, [patients, searchQuery, statusFilters]);

  const columns: GridColDef<PatientMapping>[] = [
    {
      field: "patient_name",
      headerName: "Name",
      flex: 1,
      minWidth: 160,
      valueGetter: (_value: unknown, row: PatientMapping) => {
        const name = [row.first_name, row.last_name].filter(Boolean).join(" ");
        return name || "—";
      },
    },
    {
      field: "original_email",
      headerName: "Email",
      flex: 1,
      minWidth: 220,
    },
    {
      field: "date_of_birth",
      headerName: "Date of Birth",
      width: 130,
      valueFormatter: (value: string | null) =>
        value
          ? new Date(value).toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
    },
    {
      field: "mobile",
      headerName: "Mobile",
      width: 140,
      valueFormatter: (value: string | null) => value ?? "—",
    },
    {
      field: "location",
      headerName: "Location",
      width: 160,
      valueGetter: (_value: unknown, row: PatientMapping) => {
        const parts = [row.city, row.state].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "—";
      },
    },
    {
      field: "generated_email",
      headerName: "Generated Email",
      flex: 1,
      minWidth: 250,
    },
    {
      field: "halaxy_patient_id",
      headerName: "PMS ID",
      width: 140,
      valueFormatter: (value: string | null) => value ?? "—",
    },
    {
      field: "pms_status",
      headerName: "Status",
      width: 120,
      sortable: true,
      type: "singleSelect",
      valueOptions: ["Linked", "Pending"],
      valueGetter: (_value: unknown, row: PatientMapping) =>
        row.halaxy_patient_id ? "Linked" : "Pending",
      renderCell: (params) => <PmsStatusCell value={params.row.halaxy_patient_id} />,
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 140,
      valueFormatter: (value: string) =>
        new Date(value).toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <ActionsCell
          patient={params.row}
          onView={() => router.push(`/patients/${params.row.id}`)}
          onCopyEmail={() => handleCopyEmail(params.row.original_email)}
          onDelete={() => {
            /* TODO: wire up delete mutation */
          }}
        />
      ),
    },
  ];

  const visibleColumns = columns.filter((col) => {
    const field = col.field;
    if (field === "actions") return true;
    if (field in columnVisibility) {
      return columnVisibility[field as keyof ColumnVisibility];
    }
    return true;
  });

  if (!loading && patients.length === 0) {
    return (
      <EmptyState
        title="No patients yet"
        description="Get started by adding your first patient intake."
        actionLabel="Add Patient"
        onAction={() => router.push("/patients/new")}
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
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
      />
      <DataGrid
        rows={filteredPatients}
        columns={visibleColumns}
        loading={loading}
        autoHeight
        checkboxSelection
        disableRowSelectionOnClick
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50]}
        onRowClick={(params: GridRowParams<PatientMapping>) =>
          router.push(`/patients/${params.row.id}`)
        }
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
