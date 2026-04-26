"use client";

import { useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { CalendarCheck, User } from "lucide-react";
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

// ---- Consultation Detail Sheet ----

function ConsultationDetailSheetInline({
  consultation,
  open,
  onOpenChange,
}: {
  consultation: Consultation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!consultation) return null;
  const c = consultation;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto w-full sm:min-w-125 sm:max-w-145 p-0"
      >
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Consultation</SheetTitle>
          <SheetDescription>
            {new Date(c.scheduledAt).toLocaleString("en-AU", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Header info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{c.doctorName}</p>
              <p className="text-xs text-muted-foreground">Doctor</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <StatusBadge variant={CONSULT_TYPE_VARIANTS[c.type]}>
                {CONSULT_TYPE_LABELS[c.type]}
              </StatusBadge>
              <StatusBadge status={c.status} />
            </div>
          </div>

          {c.duration && (
            <p className="text-sm text-muted-foreground">
              Duration: {c.duration} minutes
            </p>
          )}

          <Separator />

          {/* Notes */}
          {c.notes && (
            <>
              <div>
                <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2">
                  CLINICAL NOTES
                </h4>
                <div
                  className="text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: c.notes }}
                />
              </div>
              <Separator />
            </>
          )}

          {/* Outcome */}
          {c.outcome && (
            <div>
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2">
                OUTCOME
              </h4>
              <p className="text-sm">{c.outcome}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setNewSheetOpen(true)}
          className="gap-1.5"
        >
          <CalendarCheck className="h-4 w-4" />
          Schedule
        </Button>
      </div>

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

      <NewConsultationSheet
        open={newSheetOpen}
        onOpenChange={setNewSheetOpen}
        defaultPatientId={patientId}
        defaultPatientName={patientName}
      />
      <ConsultationDetailSheetInline
        consultation={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
