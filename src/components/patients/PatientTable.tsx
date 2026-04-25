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
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Funnel,
  EyeOff,
  Columns3,
} from "lucide-react";
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
  type GridSortModel,
} from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { dataGridSx } from "@/lib/datagrid-theme";
import type { PatientMapping } from "@/types";

interface PatientTableProps {
  patients: PatientMapping[];
  loading?: boolean;
}

function PmsStatusCell({ value }: { value: string | null }) {
  const linked = Boolean(value);
  return <StatusBadge status={linked ? "linked" : "pending"} />;
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
        className="inline-flex items-center justify-center rounded-md size-8 hover:bg-accent transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-[220px]">
        <DropdownMenuItem onClick={onView}>
          <Eye />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyEmail}>
          <Copy />
          Copy Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type StatusFilter = "Linked" | "Pending";

const STATUS_OPTIONS: StatusFilter[] = ["Linked", "Pending"];

function ColumnHeaderMenu({
  field,
  headerName,
  sortModel,
  onSortModelChange,
  onHideColumn,
  onOpenColumnVisibility,
}: {
  field: string;
  headerName: string;
  sortModel: GridSortModel;
  onSortModelChange: (model: GridSortModel) => void;
  onHideColumn: (field: string) => void;
  onOpenColumnVisibility: () => void;
}) {
  const currentSort = sortModel.find((s) => s.field === field);

  return (
    <div className="flex w-full items-center justify-between">
      <span className="truncate">{headerName}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center rounded-md size-8 hover:bg-accent transition-colors ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="w-[220px]">
          <DropdownMenuItem
            onClick={() =>
              onSortModelChange(
                currentSort?.sort === "asc" ? [] : [{ field, sort: "asc" }]
              )
            }
          >
            <ArrowUp />
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              onSortModelChange(
                currentSort?.sort === "desc" ? [] : [{ field, sort: "desc" }]
              )
            }
          >
            <ArrowDown />
            Sort descending
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Funnel />
            Filter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onHideColumn(field)}>
            <EyeOff />
            Hide column
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenColumnVisibility}>
            <Columns3 />
            Manage columns
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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

export function PatientTable({ patients, loading }: PatientTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY
  );
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const statusFilterDefs: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS as string[],
        value: statusFilters as string[],
        onChange: (v: string[]) => setStatusFilters(v as StatusFilter[]),
      },
    ],
    [statusFilters]
  );

  const handleCopyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email);
  }, []);

  const handleHideColumn = useCallback(
    (field: string) => {
      if (field in columnVisibility) {
        setColumnVisibility((prev) => ({
          ...prev,
          [field]: false,
        }));
      }
    },
    [columnVisibility]
  );

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

  const columnHeaderProps = useMemo(
    () => ({
      sortModel,
      onSortModelChange: setSortModel,
      onHideColumn: handleHideColumn,
      onOpenColumnVisibility: () => setViewMenuOpen(true),
    }),
    [sortModel, handleHideColumn]
  );

  const columns: GridColDef<PatientMapping>[] = [
    {
      field: "patient_name",
      headerName: "Name",
      flex: 1,
      minWidth: 160,
      renderHeader: () => (
        <ColumnHeaderMenu
          field="patient_name"
          headerName="Name"
          {...columnHeaderProps}
        />
      ),
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
      renderHeader: () => (
        <ColumnHeaderMenu
          field="original_email"
          headerName="Email"
          {...columnHeaderProps}
        />
      ),
    },
    {
      field: "date_of_birth",
      headerName: "Date of Birth",
      width: 130,
      renderHeader: () => (
        <ColumnHeaderMenu
          field="date_of_birth"
          headerName="Date of Birth"
          {...columnHeaderProps}
        />
      ),
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
      renderHeader: () => (
        <ColumnHeaderMenu field="mobile" headerName="Mobile" {...columnHeaderProps} />
      ),
      valueFormatter: (value: string | null) => value ?? "—",
    },
    {
      field: "location",
      headerName: "Location",
      width: 160,
      renderHeader: () => (
        <ColumnHeaderMenu
          field="location"
          headerName="Location"
          {...columnHeaderProps}
        />
      ),
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
      renderHeader: () => (
        <ColumnHeaderMenu
          field="generated_email"
          headerName="Generated Email"
          {...columnHeaderProps}
        />
      ),
    },
    {
      field: "halaxy_patient_id",
      headerName: "PMS ID",
      width: 140,
      renderHeader: () => (
        <ColumnHeaderMenu
          field="halaxy_patient_id"
          headerName="PMS ID"
          {...columnHeaderProps}
        />
      ),
      valueFormatter: (value: string | null) => value ?? "—",
    },
    {
      field: "pms_status",
      headerName: "Status",
      width: 120,
      sortable: true,
      type: "singleSelect",
      valueOptions: ["Linked", "Pending"],
      renderHeader: () => (
        <ColumnHeaderMenu
          field="pms_status"
          headerName="Status"
          {...columnHeaderProps}
        />
      ),
      valueGetter: (_value: unknown, row: PatientMapping) =>
        row.halaxy_patient_id ? "Linked" : "Pending",
      renderCell: (params) => <PmsStatusCell value={params.row.halaxy_patient_id} />,
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 140,
      renderHeader: () => (
        <ColumnHeaderMenu
          field="created_at"
          headerName="Created"
          {...columnHeaderProps}
        />
      ),
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
        searchPlaceholder="Filter patients…"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={statusFilterDefs}
        resultCount={filteredPatients.length}
        resultLabel="patients"
        trailing={
          <>
            <DropdownMenu open={viewMenuOpen} onOpenChange={setViewMenuOpen}>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-border px-3 h-9 text-sm font-medium transition-colors hover:bg-accent">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                View
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4} className="w-[240px]">
                {(Object.keys(COLUMN_LABELS) as (keyof ColumnVisibility)[]).map(
                  (key) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={columnVisibility[key]}
                      onClick={() =>
                        setColumnVisibility((prev) => ({
                          ...prev,
                          [key]: !prev[key],
                        }))
                      }
                    >
                      {COLUMN_LABELS[key]}
                    </DropdownMenuCheckboxItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/patients/new">
              <Button size="sm" className="h-9">
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            </Link>
          </>
        }
      />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={filteredPatients}
          columns={visibleColumns}
          loading={loading}
          autoHeight
          pagination
          checkboxSelection
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={44}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          rowHeight={56}
          onRowClick={(params: GridRowParams<PatientMapping>) =>
            router.push(`/patients/${params.row.id}`)
          }
          sx={{
            ...dataGridSx,
            "& .MuiDataGrid-menuIcon": { display: "none" },
            "& .MuiDataGrid-sortIcon": { display: "none" },
            "& .MuiDataGrid-iconButtonContainer": { display: "none" },
          }}
        />
      </div>
    </div>
  );
}
