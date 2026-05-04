"use client";

import { useState } from "react";
import type { GridSortModel } from "@mui/x-data-grid";
import { PatientTable } from "@/components/patients/PatientTable";
import { PageHeader } from "@/components/shared/PageHeader";
import type { PatientMapping, PatientPmsStatusFilter } from "@/types";

const EMPTY_PATIENTS: PatientMapping[] = [];
const EMPTY_STATUS_FILTERS: PatientPmsStatusFilter[] = [];

export default function PatientsLoading() {
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  return (
    <div className="space-y-6">
      <PageHeader title="Patients" />
      <p className="-mt-4 text-sm text-muted-foreground">
        Manage your patients and their intake records here.
      </p>

      <PatientTable
        patients={EMPTY_PATIENTS}
        loading
        resultCountLoading
        searchQuery=""
        onSearchChange={() => undefined}
        statusFilters={EMPTY_STATUS_FILTERS}
        onStatusFiltersChange={() => undefined}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
      />
    </div>
  );
}