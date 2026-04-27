"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { ShieldCheck, Clock } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AppSheet } from "@/components/shared/AppSheet";
import { Separator } from "@/components/ui/separator";
import { useClinicalData, useApproveClinicalRecord } from "@/lib/hooks/use-patients";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import {
  formatSlugList,
  highRiskMedLabel,
  medicalConditionLabel,
  quitMethodLabel,
  quitMotivationLabel,
  smokingStatusLabel,
  vapingStatusLabel,
} from "@/components/patients/clinical-labels";
import type { ClinicalDataListResponse, ClinicalDataRecord, UserRole } from "@/types";

function nonEmpty(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
  patientId,
  isLatest,
  reviewMode,
  open,
  onOpenChange,
}: {
  record: ClinicalDataRecord | null;
  patientId: string;
  isLatest: boolean;
  reviewMode?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const record = useLastDefined(input);
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as UserRole) ?? "staff";
  const canApprove = role === "doctor" || role === "admin";
  const approveRecord = useApproveClinicalRecord(patientId);
  const [reviewNotes, setReviewNotes] = useState("");

  const isApproved = record?.reviewStatus === "approved";

  function handleApprove() {
    if (!record) return;
    approveRecord.mutate(
      { recordId: record.id, reviewNotes: reviewNotes.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Clinical submission approved");
          setReviewNotes("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  const sections: {
    title: string;
    fields: { label: string; value: string }[];
  }[] = record
    ? (() => {
        const isSmoker = record.smokingStatus !== "never-smoked-or-vaped";
        const isVaping = record.vapingStatus === "yes";
        const conditionsIncludeOther = record.medicalConditions?.includes("other");
        const medsIncludeOther = record.highRiskMedications?.includes("other");

        const quitMethodNotes = nonEmpty(record.quitMethodExplanation);
        const vapingNotes = nonEmpty(record.vapingNotes);
        const conditionsOther = nonEmpty(record.medicalConditionsOther);
        const medicationsList = nonEmpty(record.medicationsList);
        const additionalNotes = nonEmpty(record.additionalNotes);

        return [
          {
            title: "SMOKING STATUS",
            fields: [
              {
                label: "Smoking status",
                value: smokingStatusLabel(record.smokingStatus),
              },
              ...(isSmoker && record.cigarettesPerDay
                ? [{ label: "Cigarettes per day", value: record.cigarettesPerDay }]
                : []),
              ...(isSmoker && record.yearsSmoked
                ? [{ label: "Years smoked", value: record.yearsSmoked }]
                : []),
              ...(isSmoker && record.timesTriedQuitting
                ? [{ label: "Quit attempts", value: record.timesTriedQuitting }]
                : []),
              ...(isSmoker && record.quitMotivation?.length
                ? [
                    {
                      label: "Quit motivation",
                      value: formatSlugList(record.quitMotivation, quitMotivationLabel),
                    },
                  ]
                : []),
              ...(isSmoker && record.quitMethods?.length
                ? [
                    {
                      label: "Quit methods",
                      value: formatSlugList(record.quitMethods, quitMethodLabel),
                    },
                  ]
                : []),
              ...(isSmoker && quitMethodNotes
                ? [{ label: "Quit method notes", value: quitMethodNotes }]
                : []),
              ...(isSmoker && record.lastCigarette
                ? [{ label: "Last cigarette", value: record.lastCigarette }]
                : []),
            ],
          },
          {
            title: "VAPING STATUS",
            fields: [
              {
                label: "Vaping status",
                value: vapingStatusLabel(record.vapingStatus),
              },
              ...(isVaping && record.vapingMethod
                ? [{ label: "Method", value: record.vapingMethod }]
                : []),
              ...(isVaping && record.vapingStrength
                ? [{ label: "Strength", value: record.vapingStrength }]
                : []),
              ...(isVaping && record.vapingVolume
                ? [{ label: "Volume", value: record.vapingVolume }]
                : []),
              ...(isVaping && vapingNotes
                ? [{ label: "Notes", value: vapingNotes }]
                : []),
            ],
          },
          {
            title: "MEDICAL CONDITIONS",
            fields: [
              {
                label: "Has conditions",
                value: record.hasMedicalConditions === "yes" ? "Yes" : "No",
              },
              ...(record.medicalConditions?.length
                ? [
                    {
                      label: "Conditions",
                      value: formatSlugList(
                        record.medicalConditions,
                        medicalConditionLabel
                      ),
                    },
                  ]
                : []),
              ...(conditionsIncludeOther && conditionsOther
                ? [{ label: "Other", value: conditionsOther }]
                : []),
            ],
          },
          {
            title: "MEDICATIONS",
            fields: [
              {
                label: "Takes medication",
                value: record.takesMedication === "yes" ? "Yes" : "No",
              },
              ...(record.highRiskMedications?.length
                ? [
                    {
                      label: "High-risk medications",
                      value: formatSlugList(
                        record.highRiskMedications,
                        highRiskMedLabel
                      ),
                    },
                  ]
                : []),
              ...(medsIncludeOther && medicationsList
                ? [{ label: "Medications list", value: medicationsList }]
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
              ...(record.safetyAcknowledgment
                ? [
                    {
                      label: "Safety acknowledgment",
                      value: record.safetyAcknowledgment === "yes" ? "Yes" : "No",
                    },
                  ]
                : []),
            ],
          },
          ...(additionalNotes
            ? [
                {
                  title: "ADDITIONAL NOTES",
                  fields: [{ label: "Notes", value: additionalNotes }],
                },
              ]
            : []),
        ];
      })()
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
          {record &&
            (isApproved ? (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-status-success-bg text-status-success-fg border-status-success-border"
              >
                <ShieldCheck className="mr-1 h-3 w-3" />
                Approved
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-status-warning-bg text-status-warning-fg border-status-warning-border"
              >
                <Clock className="mr-1 h-3 w-3" />
                Pending review
              </Badge>
            ))}
        </span>
      }
      description={
        record
          ? `${reviewMode ? "Review requested · " : ""}Submitted ${formatDateTime(record.submittedAt)}`
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

        {record && (
          <>
            <Separator />
            <section aria-label="Doctor review" className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em]">
                  Doctor Review
                </h4>
              </div>

              {isApproved ? (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                  <p>
                    <span className="text-muted-foreground">Approved by:</span>{" "}
                    <span className="font-medium">{record.reviewedBy ?? "—"}</span>
                    {record.reviewedByRole ? (
                      <span className="text-muted-foreground">
                        {" "}
                        ({record.reviewedByRole})
                      </span>
                    ) : null}
                  </p>
                  {record.reviewedAt && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(record.reviewedAt)}
                    </p>
                  )}
                  {record.reviewNotes && (
                    <div className="mt-2 rounded-md border bg-background p-3 whitespace-pre-wrap">
                      {record.reviewNotes}
                    </div>
                  )}
                </div>
              ) : canApprove ? (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    Review the submission above and approve when ready. You can leave an
                    optional comment for the record.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="clinical-review-notes">
                      Review comment (optional)
                    </Label>
                    <Textarea
                      id="clinical-review-notes"
                      placeholder="Add any review comments…"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleApprove} disabled={approveRecord.isPending}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {approveRecord.isPending ? "Approving…" : "Approve"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  This submission is awaiting review by a doctor.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </AppSheet>
  );
}

// ---- Clinical History Tab ----

const historyColumns: GridColDef<ClinicalDataRecord>[] = [
  {
    field: "submittedAt",
    headerName: "Submitted",
    width: 180,
    valueFormatter: (value: string) => formatDateTime(value),
  },
  {
    field: "smokingStatus",
    headerName: "Type",
    flex: 1,
    minWidth: 150,
    valueFormatter: () => "Intake Form",
  },
  {
    field: "hasMedicalConditions",
    headerName: "Sections",
    width: 100,
    valueFormatter: () => "6",
  },
  {
    field: "safetyAcknowledgment",
    headerName: "Status",
    width: 120,
    renderCell: () => <StatusBadge variant="success">Completed</StatusBadge>,
  },
];

interface ClinicalHistoryTabProps {
  patientId: string;
  selectedClinicalId?: string;
  reviewMode?: boolean;
  initialClinicalData?: ClinicalDataListResponse;
}

export function ClinicalHistoryTab({
  patientId,
  selectedClinicalId,
  reviewMode,
  initialClinicalData,
}: ClinicalHistoryTabProps) {
  const router = useRouter();
  const { data, isLoading, error } = useClinicalData(
    patientId,
    undefined,
    initialClinicalData
  );
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
          new Date(a.submittedAt) > new Date(b.submittedAt) ? a : b
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
              sortModel: [{ field: "submittedAt", sort: "desc" }],
            },
          }}
          onRowClick={(params) => openClinicalRecord(params.row)}
          sx={dataGridSx}
        />
      </div>
      <IntakeFormSheet
        record={selected}
        patientId={patientId}
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
