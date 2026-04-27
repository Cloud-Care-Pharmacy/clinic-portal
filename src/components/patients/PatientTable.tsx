"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Copy,
  SlidersHorizontal,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import { useDeletePatient } from "@/lib/hooks/use-patients";
import type { PatientMapping, PatientPmsStatusFilter } from "@/types";

interface PatientTableProps {
  patients: PatientMapping[];
  total?: number;
  loading?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilters: PatientPmsStatusFilter[];
  onStatusFiltersChange: (value: PatientPmsStatusFilter[]) => void;
  sortModel: GridSortModel;
  onSortModelChange: (model: GridSortModel) => void;
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
      <DropdownMenuContent align="end" sideOffset={4} className="w-55">
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

const STATUS_OPTIONS: PatientPmsStatusFilter[] = ["linked", "pending"];

interface ColumnVisibility {
  patientName: boolean;
  originalEmail: boolean;
  dateOfBirth: boolean;
  mobile: boolean;
  location: boolean;
  generatedEmail: boolean;
  halaxyPatientId: boolean;
  pmsStatus: boolean;
  createdAt: boolean;
}

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  patientName: true,
  originalEmail: true,
  dateOfBirth: true,
  mobile: false,
  location: false,
  generatedEmail: false,
  halaxyPatientId: false,
  pmsStatus: true,
  createdAt: true,
};

const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  patientName: "Name",
  originalEmail: "Email",
  dateOfBirth: "Date of Birth",
  mobile: "Mobile",
  location: "Location",
  generatedEmail: "Generated Email",
  halaxyPatientId: "PMS ID",
  pmsStatus: "Status",
  createdAt: "Created",
};

export function PatientTable({
  patients,
  total,
  loading,
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  sortModel,
  onSortModelChange,
}: PatientTableProps) {
  const router = useRouter();
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY
  );
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PatientMapping | null>(null);
  const deleteMutation = useDeletePatient();

  const statusFilterDefs: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS as string[],
        value: statusFilters as string[],
        onChange: (v: string[]) => onStatusFiltersChange(v as PatientPmsStatusFilter[]),
        formatOption: (option) => (option === "linked" ? "Linked" : "Pending"),
      },
    ],
    [onStatusFiltersChange, statusFilters]
  );

  const handleCopyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email);
  }, []);

  const hasActiveFilters = Boolean(searchQuery.trim()) || statusFilters.length > 0;
  const visiblePatients = useMemo(
    () =>
      patients.filter((patient) => {
        const pmsStatus: PatientPmsStatusFilter = patient.halaxyPatientId
          ? "linked"
          : "pending";

        if (statusFilters.length > 0 && !statusFilters.includes(pmsStatus)) {
          return false;
        }

        return matchesSearchQuery(searchQuery, [
          patient.firstName,
          patient.lastName,
          [patient.firstName, patient.lastName].filter(Boolean).join(" "),
          patient.originalEmail,
          patient.generatedEmail,
          patient.mobile,
          patient.dateOfBirth,
          patient.halaxyPatientId,
          patient.pbsPatientId,
          patient.city,
          patient.state,
          patient.postcode,
          patient.country,
          patient.medicareNumber,
          pmsStatus === "linked" ? "linked" : "pending",
        ]);
      }),
    [patients, searchQuery, statusFilters]
  );

  const clearFilters = useCallback(() => {
    onSearchChange("");
    onStatusFiltersChange([]);
  }, [onSearchChange, onStatusFiltersChange]);

  const columns: GridColDef<PatientMapping>[] = [
    {
      field: "patientName",
      headerName: "Name",
      flex: 1,
      minWidth: 160,
      valueGetter: (_value: unknown, row: PatientMapping) => {
        const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
        return name || "—";
      },
      renderCell: (params) => (
        <Link
          href={`/patients/${params.row.id}`}
          prefetch
          scroll={false}
          onClick={(e) => e.stopPropagation()}
          className="truncate font-medium text-foreground hover:underline"
        >
          {params.value as string}
        </Link>
      ),
    },
    {
      field: "originalEmail",
      headerName: "Email",
      flex: 1,
      minWidth: 220,
    },
    {
      field: "dateOfBirth",
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
      field: "generatedEmail",
      headerName: "Generated Email",
      flex: 1,
      minWidth: 250,
    },
    {
      field: "halaxyPatientId",
      headerName: "PMS ID",
      width: 140,
      valueFormatter: (value: string | null) => value ?? "—",
    },
    {
      field: "pmsStatus",
      headerName: "Status",
      width: 120,
      sortable: true,
      type: "singleSelect",
      valueOptions: ["Linked", "Pending"],
      valueGetter: (_value: unknown, row: PatientMapping) =>
        row.halaxyPatientId ? "Linked" : "Pending",
      renderCell: (params) => <PmsStatusCell value={params.row.halaxyPatientId} />,
    },
    {
      field: "createdAt",
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
      renderCell: (params) => (
        <ActionsCell
          patient={params.row}
          onView={() => router.push(`/patients/${params.row.id}`)}
          onCopyEmail={() => handleCopyEmail(params.row.originalEmail)}
          onDelete={() => setDeleteTarget(params.row)}
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

  const toolbar = (
    <FilterBar
      searchPlaceholder="Filter patients…"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      filters={statusFilterDefs}
      resultCount={
        hasActiveFilters ? visiblePatients.length : (total ?? patients.length)
      }
      resultLabel="patients"
      trailing={
        <>
          <DropdownMenu open={viewMenuOpen} onOpenChange={setViewMenuOpen}>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-border px-3 h-9 text-sm font-medium transition-colors hover:bg-accent">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              View
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-60">
              {(Object.keys(COLUMN_LABELS) as (keyof ColumnVisibility)[]).map((key) => (
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
              ))}
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
  );

  if (!loading && patients.length === 0 && !hasActiveFilters) {
    return (
      <EmptyState
        title="No patients yet"
        description="Get started by adding your first patient intake."
        actionLabel="Add Patient"
        onAction={() => router.push("/patients/new")}
      />
    );
  }

  if (!loading && visiblePatients.length === 0) {
    return (
      <div style={{ width: "100%" }}>
        {toolbar}
        <EmptyState
          title="No patients match your filters"
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
          rows={visiblePatients}
          columns={visibleColumns}
          loading={loading}
          autoHeight
          pagination
          checkboxSelection
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={44}
          sortModel={sortModel}
          onSortModelChange={onSortModelChange}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          rowHeight={56}
          onRowClick={(params: GridRowParams<PatientMapping>) =>
            router.push(`/patients/${params.row.id}`, { scroll: false })
          }
          slotProps={{
            row: {
              onMouseEnter: (event) => {
                const id = (event.currentTarget as HTMLElement).getAttribute("data-id");
                if (id) router.prefetch(`/patients/${id}`);
              },
            },
          }}
          sx={dataGridSx}
        />
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently delete ${
                    [deleteTarget.firstName, deleteTarget.lastName]
                      .filter(Boolean)
                      .join(" ") || deleteTarget.originalEmail
                  } and all related records (consultations, notes, documents, prescriptions). This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                const target = deleteTarget;
                deleteMutation.mutate(target.id, {
                  onSuccess: () => {
                    toast.success("Patient deleted");
                    setDeleteTarget(null);
                  },
                  onError: (err) => {
                    toast.error(
                      err instanceof Error ? err.message : "Failed to delete patient"
                    );
                  },
                });
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
