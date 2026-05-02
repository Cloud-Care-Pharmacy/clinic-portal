"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useConsultations } from "@/lib/hooks/use-consultations";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { ConsultationDetailSheet } from "@/components/consultations/ConsultationDetailSheet";
import { htmlToPlainText } from "@/lib/utils";
import type {
  Consultation,
  ConsultationsListResponse,
  ConsultationType,
} from "@/types";

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
    renderCell: (params) => {
      const text = htmlToPlainText(params.value as string | null | undefined);
      if (!text) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="truncate" title={text}>
          {text}
        </span>
      );
    },
  },
];

interface ConsultationsTabProps {
  patientId: string;
  patientName: string;
  selectedConsultationId?: string;
  initialConsultations?: ConsultationsListResponse;
}

export function ConsultationsTab({
  patientId,
  patientName,
  selectedConsultationId,
  initialConsultations,
}: ConsultationsTabProps) {
  const router = useRouter();
  const { data, isLoading } = useConsultations(patientId, initialConsultations);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [selectedFromRow, setSelectedFromRow] = useState<Consultation | null>(null);
  const [editing, setEditing] = useState<Consultation | null>(null);

  const consultations = data?.data?.consultations ?? [];
  const selected = selectedConsultationId
    ? (consultations.find(
        (consultation) => consultation.id === selectedConsultationId
      ) ?? null)
    : selectedFromRow;

  function selectedConsultationHref(consultationId: string) {
    return `/patients/${encodeURIComponent(patientId)}/consultations?selected=${encodeURIComponent(consultationId)}`;
  }

  function clearSelectedConsultation() {
    setSelectedFromRow(null);
    router.replace(`/patients/${encodeURIComponent(patientId)}/consultations`, {
      scroll: false,
    });
  }

  function openConsultation(consultation: Consultation) {
    setSelectedFromRow(consultation);
    router.push(selectedConsultationHref(consultation.id), { scroll: false });
  }

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
          onRowClick={(params) => openConsultation(params.row)}
          sx={dataGridSx}
        />
      </div>

      <NewConsultationSheet
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        defaultPatientId={patientId}
        defaultPatientName={patientName}
        consultation={editing}
      />
      <ConsultationDetailSheet
        consultation={selected}
        onClose={clearSelectedConsultation}
        onEdit={(consultation) => {
          setEditing(consultation);
          clearSelectedConsultation();
        }}
      />
    </div>
  );
}
