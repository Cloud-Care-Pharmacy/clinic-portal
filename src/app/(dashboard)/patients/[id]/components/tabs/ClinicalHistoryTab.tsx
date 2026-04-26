"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AppSheet } from "@/components/shared/AppSheet";
import { Separator } from "@/components/ui/separator";
import { useClinicalData } from "@/lib/hooks/use-patients";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import type { ClinicalDataRecord } from "@/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- Intake Form Sheet ----

function IntakeFormSheet({
  record: input,
  isLatest,
  reviewMode,
  open,
  onOpenChange,
}: {
  record: ClinicalDataRecord | null;
  isLatest: boolean;
  reviewMode?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const record = useLastDefined(input);

  const sections: {
    title: string;
    fields: { label: string; value: string }[];
  }[] = record
    ? [
        {
          title: "SMOKING STATUS",
          fields: [
            { label: "Smoking status", value: record.smoking_status },
            ...(record.cigarettes_per_day
              ? [{ label: "Cigarettes per day", value: record.cigarettes_per_day }]
              : []),
            ...(record.years_smoked
              ? [{ label: "Years smoked", value: record.years_smoked }]
              : []),
            ...(record.times_tried_quitting
              ? [{ label: "Quit attempts", value: record.times_tried_quitting }]
              : []),
            ...(record.last_cigarette
              ? [{ label: "Last cigarette", value: record.last_cigarette }]
              : []),
          ],
        },
        {
          title: "VAPING STATUS",
          fields: [
            { label: "Vaping status", value: record.vaping_status },
            ...(record.vaping_method
              ? [{ label: "Method", value: record.vaping_method }]
              : []),
            ...(record.vaping_strength
              ? [{ label: "Strength", value: record.vaping_strength }]
              : []),
            ...(record.vaping_volume
              ? [{ label: "Volume", value: record.vaping_volume }]
              : []),
          ],
        },
        {
          title: "MEDICAL CONDITIONS",
          fields: [
            {
              label: "Has conditions",
              value: record.has_medical_conditions === "yes" ? "Yes" : "No",
            },
            ...(record.medical_conditions?.length
              ? [
                  {
                    label: "Conditions",
                    value: record.medical_conditions.join(", "),
                  },
                ]
              : []),
            ...(record.medical_conditions_other
              ? [
                  {
                    label: "Other conditions",
                    value: record.medical_conditions_other,
                  },
                ]
              : []),
          ],
        },
        {
          title: "MEDICATIONS",
          fields: [
            {
              label: "Takes medication",
              value: record.takes_medication === "yes" ? "Yes" : "No",
            },
            ...(record.high_risk_medications?.length
              ? [
                  {
                    label: "High-risk medications",
                    value: record.high_risk_medications.join(", "),
                  },
                ]
              : []),
            ...(record.medications_list
              ? [{ label: "Medications list", value: record.medications_list }]
              : []),
          ],
        },
        {
          title: "RISK FACTORS",
          fields: [
            {
              label: "Cardiovascular",
              value: record.cardiovascular === "yes" ? "Yes" : "No",
            },
            {
              label: "Pregnancy",
              value:
                record.pregnancy === "yes"
                  ? "Yes"
                  : record.pregnancy === "na"
                    ? "N/A"
                    : "No",
            },
          ],
        },
        ...(record.additional_notes
          ? [
              {
                title: "ADDITIONAL NOTES",
                fields: [{ label: "Notes", value: record.additional_notes }],
              },
            ]
          : []),
      ]
    : [];

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          Intake form
          {isLatest && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
              LATEST
            </Badge>
          )}
        </span>
      }
      description={
        record
          ? `${reviewMode ? "Review requested · " : ""}Submitted ${formatDateTime(record.submitted_at)}`
          : ""
      }
    >
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && <Separator className="mb-6" />}
            <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-3">
              {section.title}
            </h4>
            <div className="space-y-2">
              {section.fields.map((field) => (
                <div
                  key={field.label}
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: "minmax(150px, 0.7fr) minmax(0, 1.3fr)",
                  }}
                >
                  <span className="text-sm text-muted-foreground">{field.label}</span>
                  <span className="text-sm text-foreground">{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppSheet>
  );
}

// ---- Clinical History Tab ----

const historyColumns: GridColDef<ClinicalDataRecord>[] = [
  {
    field: "submitted_at",
    headerName: "Submitted",
    width: 180,
    valueFormatter: (value: string) => formatDateTime(value),
  },
  {
    field: "smoking_status",
    headerName: "Type",
    flex: 1,
    minWidth: 150,
    valueFormatter: () => "Intake Form",
  },
  {
    field: "has_medical_conditions",
    headerName: "Sections",
    width: 100,
    valueFormatter: () => "6",
  },
  {
    field: "safety_acknowledgment",
    headerName: "Status",
    width: 120,
    renderCell: () => <StatusBadge variant="success">Completed</StatusBadge>,
  },
];

interface ClinicalHistoryTabProps {
  patientId: string;
  selectedClinicalId?: string;
  reviewMode?: boolean;
}

export function ClinicalHistoryTab({
  patientId,
  selectedClinicalId,
  reviewMode,
}: ClinicalHistoryTabProps) {
  const router = useRouter();
  const { data, isLoading, error } = useClinicalData(patientId);
  const [selectedFromRow, setSelectedFromRow] = useState<ClinicalDataRecord | null>(
    null
  );

  const records = data?.data?.records ?? [];
  const selected = selectedClinicalId
    ? (records.find((record) => record.id === selectedClinicalId) ?? null)
    : selectedFromRow;
  const latestId =
    records.length > 0
      ? records.reduce((a, b) =>
          new Date(a.submitted_at) > new Date(b.submitted_at) ? a : b
        ).id
      : null;

  function selectedClinicalHref(recordId: string) {
    return `/patients/${encodeURIComponent(patientId)}/clinical?selected=${encodeURIComponent(recordId)}`;
  }

  function clearSelectedClinicalRecord() {
    setSelectedFromRow(null);
    router.replace(`/patients/${encodeURIComponent(patientId)}/clinical`, {
      scroll: false,
    });
  }

  function openClinicalRecord(record: ClinicalDataRecord) {
    setSelectedFromRow(record);
    router.push(selectedClinicalHref(record.id), { scroll: false });
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

  if (error || records.length === 0) {
    return (
      <EmptyState
        title="No clinical history"
        description="No intake form submissions have been recorded for this patient."
      />
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={records}
          columns={historyColumns}
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
              sortModel: [{ field: "submitted_at", sort: "desc" }],
            },
          }}
          onRowClick={(params) => openClinicalRecord(params.row)}
          sx={dataGridSx}
        />
      </div>
      <IntakeFormSheet
        record={selected}
        isLatest={selected?.id === latestId}
        reviewMode={reviewMode && selected?.id === selectedClinicalId}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) clearSelectedClinicalRecord();
        }}
      />
    </>
  );
}
