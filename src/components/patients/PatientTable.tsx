"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  DataGrid,
  GridToolbarQuickFilter,
  type GridColDef,
  type GridRowParams,
} from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import type { PatientMapping } from "@/types";

interface PatientTableProps {
  patients: PatientMapping[];
  loading?: boolean;
}

const columns: GridColDef<PatientMapping>[] = [
  {
    field: "original_email",
    headerName: "Email",
    flex: 1,
    minWidth: 220,
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
    width: 160,
    valueFormatter: (value: string | null) => value ?? "—",
  },
  {
    field: "created_at",
    headerName: "Created",
    width: 160,
    valueFormatter: (value: string) =>
      new Date(value).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
  },
];

function CustomToolbar() {
  return (
    <div className="flex items-center justify-between p-2 gap-2">
      <GridToolbarQuickFilter debounceMs={300} />
      <Link href="/patients/new">
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </Link>
    </div>
  );
}

export function PatientTable({ patients, loading }: PatientTableProps) {
  const router = useRouter();
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 25,
    page: 0,
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
      <DataGrid
        rows={patients}
        columns={columns}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50]}
        onRowClick={(params: GridRowParams<PatientMapping>) =>
          router.push(`/patients/${params.row.id}`)
        }
        slots={{ toolbar: CustomToolbar }}
        getRowClassName={(params) =>
          params.indexRelativeToCurrentPage % 2 === 0 ? "even" : ""
        }
        sx={{
          cursor: "pointer",
          "& .MuiDataGrid-cell:focus": { outline: "none" },
          "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
        }}
      />
    </div>
  );
}
