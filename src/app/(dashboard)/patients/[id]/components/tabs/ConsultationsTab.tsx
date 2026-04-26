"use client";

import { useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConsultations } from "@/lib/hooks/use-consultations";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import type { Consultation, ConsultationType } from "@/types";

const CONSULT_TYPE_LABELS: Record<ConsultationType, string> = {
  initial: "Initial",
  "follow-up": "Follow-up",
  renewal: "Renewal",
};

const CONSULT_TYPE_VARIANTS: Record<ConsultationType, "info" | "accent" | "success"> = {
  initial: "info",
  "follow-up": "accent",
  renewal: "success",
};

// ---- Consultations Tab ----

const consultationColumns: GridColDef<Consultation>[] = [
  {
    field: "doctorName",
    headerName: "Doctor",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "type",
    headerName: "Type",
    width: 120,
    renderCell: (params) => (
      <StatusBadge variant={CONSULT_TYPE_VARIANTS[params.value as ConsultationType]}>
        {CONSULT_TYPE_LABELS[params.value as ConsultationType]}
      </StatusBadge>
    ),
  },
  {
    field: "scheduledAt",
    headerName: "When",
    width: 180,
    valueFormatter: (value: string) =>
      new Date(value).toLocaleString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
  },
  {
    field: "status",
    headerName: "Status",
    width: 120,
    renderCell: (params) => <StatusBadge status={params.value} />,
  },
  {
    field: "outcome",
    headerName: "Outcome",
    flex: 1,
    minWidth: 150,
    valueFormatter: (value: string | undefined) => value ?? "—",
  },
];

interface ConsultationsTabProps {
  patientId: string;
  patientName: string;
}

export function ConsultationsTab({ patientId, patientName }: ConsultationsTabProps) {
  const { data, isLoading } = useConsultations(patientId);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Consultation | null>(null);

  const consultations = data?.data?.consultations ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (consultations.length === 0) {
    return (
      <>
        <EmptyState
          title="No consultations yet"
          description="Schedule a consultation to get started."
          actionLabel="Schedule consultation"
          onAction={() => setNewSheetOpen(true)}
        />
        <NewConsultationSheet
          open={newSheetOpen}
          onOpenChange={setNewSheetOpen}
          defaultPatientId={patientId}
          defaultPatientName={patientName}
        />
      </>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={consultations}
          columns={consultationColumns}
          autoHeight
          pagination
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={44}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={56}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: {
              sortModel: [{ field: "scheduledAt", sort: "desc" }],
            },
          }}
          onRowClick={(params) => setSelected(params.row)}
          sx={dataGridSx}
        />
      </div>

      {selected && (
        <NewConsultationSheet
          key={selected.id}
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          defaultPatientId={patientId}
          defaultPatientName={patientName}
          consultation={selected}
        />
      )}
    </div>
  );
}
