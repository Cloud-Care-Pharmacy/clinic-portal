"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { AppSheet } from "@/components/shared/AppSheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { dataGridSx } from "@/lib/datagrid-theme";
import { toast } from "sonner";
import {
  Cigarette,
  Wind,
  HeartPulse,
  Pill,
  ShieldAlert,
  Baby,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  useApproveClinicalRecord,
  useLatestClinicalData,
  useClinicalData,
} from "@/lib/hooks/use-patients";
import type { ClinicalDataRecord } from "@/types";
import { computeRedFlags } from "@/components/patients/red-flag-utils";

// ---- Helpers ----

const SMOKING_LABELS: Record<string, string> = {
  "currently-smoking": "Currently Smoking",
  "current-smoker": "Current Smoker",
  "ex-smoker": "Ex-Smoker",
  vaper: "Vaper",
  "never-smoked-or-vaped": "Never Smoked or Vaped",
};

const VAPING_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatList(items: string[] | undefined | null): string {
  if (!items || items.length === 0) return "None";
  return items.join(", ");
}

// ---- Summary field ----

function SummaryField({
  icon,
  label,
  value,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm">{value || "Not recorded"}</p>
          {badge && (
            <Badge variant="outline" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Detail Sheet for a single clinical record ----

function ClinicalDetailSheet({
  record: input,
  open,
  onOpenChange,
}: {
  record: ClinicalDataRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const record = useLastDefined(input);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Clinical Data Snapshot"
      description={record ? `Submitted ${formatDate(record.submittedAt)}` : ""}
    >
      {record ? (
        <div className="space-y-6">
          {/* Smoking */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Smoking</h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {SMOKING_LABELS[record.smokingStatus] ?? record.smokingStatus}
              </p>
              {record.cigarettesPerDay && (
                <p>
                  <span className="text-muted-foreground">Cigarettes/day:</span>{" "}
                  {record.cigarettesPerDay}
                </p>
              )}
              {record.yearsSmoked && (
                <p>
                  <span className="text-muted-foreground">Years smoked:</span>{" "}
                  {record.yearsSmoked}
                </p>
              )}
              {record.timesTriedQuitting && (
                <p>
                  <span className="text-muted-foreground">Quit attempts:</span>{" "}
                  {record.timesTriedQuitting}
                </p>
              )}
              {record.quitMotivation && record.quitMotivation.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Quit motivation:</span>{" "}
                  {formatList(record.quitMotivation)}
                </p>
              )}
              {record.quitMethods && record.quitMethods.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Quit methods:</span>{" "}
                  {formatList(record.quitMethods)}
                </p>
              )}
              {record.quitMethodExplanation && (
                <p>
                  <span className="text-muted-foreground">Method details:</span>{" "}
                  {record.quitMethodExplanation}
                </p>
              )}
              {record.lastCigarette && (
                <p>
                  <span className="text-muted-foreground">Last cigarette:</span>{" "}
                  {record.lastCigarette}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Vaping */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Vaping</h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {VAPING_LABELS[record.vapingStatus] ?? record.vapingStatus}
              </p>
              {record.vapingMethod && (
                <p>
                  <span className="text-muted-foreground">Method:</span>{" "}
                  {record.vapingMethod}
                </p>
              )}
              {record.vapingStrength && (
                <p>
                  <span className="text-muted-foreground">Strength:</span>{" "}
                  {record.vapingStrength}
                </p>
              )}
              {record.vapingVolume && (
                <p>
                  <span className="text-muted-foreground">Volume:</span>{" "}
                  {record.vapingVolume}
                </p>
              )}
              {record.vapingNotes && (
                <p>
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  {record.vapingNotes}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Medical Conditions */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Medical Conditions</h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Has conditions:</span>{" "}
                {record.hasMedicalConditions === "yes" ? "Yes" : "No"}
              </p>
              {record.medicalConditions && record.medicalConditions.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Conditions:</span>{" "}
                  {formatList(record.medicalConditions)}
                </p>
              )}
              {record.medicalConditionsOther && (
                <p>
                  <span className="text-muted-foreground">Other:</span>{" "}
                  {record.medicalConditionsOther}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Medications */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Medications</h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Takes medication:</span>{" "}
                {record.takesMedication === "yes" ? "Yes" : "No"}
              </p>
              {record.highRiskMedications && record.highRiskMedications.length > 0 && (
                <p>
                  <span className="text-muted-foreground">High-risk medications:</span>{" "}
                  {formatList(record.highRiskMedications)}
                </p>
              )}
              {record.medicationsList && (
                <p>
                  <span className="text-muted-foreground">Medications list:</span>{" "}
                  {record.medicationsList}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Risk Factors */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Risk Factors</h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Cardiovascular:</span>{" "}
                {record.cardiovascular === "yes" ? "Yes" : "No"}
              </p>
              <p>
                <span className="text-muted-foreground">Pregnancy:</span>{" "}
                {record.pregnancy === "yes"
                  ? "Yes"
                  : record.pregnancy === "na"
                    ? "N/A"
                    : "No"}
              </p>
            </div>
          </div>

          {record.additionalNotes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Additional Notes</h4>
                <p className="text-sm">{record.additionalNotes}</p>
              </div>
            </>
          )}
        </div>
      ) : null}
    </AppSheet>
  );
}

// ---- Medical Summary Card (with integrated Red Flag alert) ----

function MedicalSummaryCard({
  record,
  patientId,
}: {
  record: ClinicalDataRecord;
  patientId: string;
}) {
  const redFlags = computeRedFlags(record);
  const approveClinicalRecord = useApproveClinicalRecord(patientId);
  const reviewed = record.reviewStatus === "approved";

  const handleApprove = useCallback(() => {
    approveClinicalRecord.mutate(
      { recordId: record.id, reviewNotes: "Reviewed and approved in portal." },
      {
        onSuccess: () => toast.success("Clinical data approved"),
        onError: (err) => toast.error(err.message),
      }
    );
  }, [approveClinicalRecord, record.id]);

  const reviewLabel = reviewed
    ? record.reviewedAt
      ? `Approved ${formatDate(record.reviewedAt)}`
      : "Approved"
    : "Pending review";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">
            Current Medical Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Last updated {formatDate(record.submittedAt)}
            </span>
            <StatusBadge variant={reviewed ? "success" : "warning"}>
              {reviewLabel}
            </StatusBadge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Red Flag Alert */}
        {redFlags.hasRedFlag ? (
          <div
            className={cn(
              "rounded-lg border p-4",
              reviewed
                ? "border-status-warning-border bg-status-warning-bg"
                : "border-status-danger-border bg-status-danger-bg"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {reviewed ? (
                  <CheckCircle2 className="h-5 w-5 text-status-warning-fg" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-status-danger-fg" />
                )}
                <span
                  className={cn(
                    "text-sm font-semibold",
                    reviewed ? "text-status-warning-fg" : "text-status-danger-fg"
                  )}
                >
                  {reviewed
                    ? "Red Flag — Reviewed"
                    : "Red Flag — Doctor Review Required"}
                </span>
              </div>
              <Button
                variant={reviewed ? "outline" : "destructive"}
                size="sm"
                onClick={handleApprove}
                disabled={reviewed || approveClinicalRecord.isPending}
              >
                {reviewed
                  ? "Approved"
                  : approveClinicalRecord.isPending
                    ? "Approving…"
                    : "Approve"}
              </Button>
            </div>
            <p
              className={cn(
                "text-xs mb-3",
                reviewed ? "text-status-warning-fg" : "text-status-danger-fg"
              )}
            >
              {reviewed
                ? "This patient's medical history has been reviewed by a doctor."
                : "One or more medical history answers require doctor review before proceeding."}
            </p>
            <div className="flex flex-wrap gap-2">
              {redFlags.triggers.map((trigger) => (
                <Badge
                  key={trigger}
                  variant="outline"
                  className={cn(
                    reviewed
                      ? "border-status-warning-border text-status-warning-fg bg-status-warning-bg"
                      : "border-status-danger-border text-status-danger-fg bg-status-danger-bg"
                  )}
                >
                  {trigger}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-status-success-border bg-status-success-bg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-status-success-fg" />
              <div>
                <p className="text-sm font-medium text-status-success-fg">
                  No Red Flags
                </p>
                <p className="text-xs text-status-success-fg">
                  All medical history questions answered negatively — no doctor review
                  required.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryField
            icon={<Cigarette className="h-4 w-4" />}
            label="Smoking Status"
            value={SMOKING_LABELS[record.smokingStatus] ?? record.smokingStatus}
            badge={record.cigarettesPerDay ?? undefined}
          />
          <SummaryField
            icon={<Wind className="h-4 w-4" />}
            label="Vaping Status"
            value={VAPING_LABELS[record.vapingStatus] ?? record.vapingStatus}
            badge={record.vapingMethod ?? undefined}
          />
          <SummaryField
            icon={<HeartPulse className="h-4 w-4" />}
            label="Medical Conditions"
            value={
              record.hasMedicalConditions === "yes"
                ? formatList(record.medicalConditions)
                : "None reported"
            }
          />
          <SummaryField
            icon={<Pill className="h-4 w-4" />}
            label="Medications"
            value={
              record.takesMedication === "yes"
                ? (record.medicationsList ?? formatList(record.highRiskMedications))
                : "None"
            }
          />
          <SummaryField
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Cardiovascular Risk"
            value={record.cardiovascular === "yes" ? "Yes" : "No"}
          />
          <SummaryField
            icon={<Baby className="h-4 w-4" />}
            label="Pregnancy"
            value={
              record.pregnancy === "yes"
                ? "Yes"
                : record.pregnancy === "na"
                  ? "N/A"
                  : "No"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---- History DataGrid columns ----

const historyColumns: GridColDef<ClinicalDataRecord>[] = [
  {
    field: "submittedAt",
    headerName: "Date",
    width: 140,
    valueFormatter: (value: string) => formatDate(value),
  },
  {
    field: "smokingStatus",
    headerName: "Smoking",
    flex: 1,
    minWidth: 150,
    valueFormatter: (value: string) => SMOKING_LABELS[value] ?? value,
  },
  {
    field: "vapingStatus",
    headerName: "Vaping",
    width: 100,
    valueFormatter: (value: string) => VAPING_LABELS[value] ?? value,
  },
  {
    field: "hasMedicalConditions",
    headerName: "Conditions",
    width: 110,
    valueFormatter: (value: string) => (value === "yes" ? "Yes" : "No"),
  },
  {
    field: "takesMedication",
    headerName: "Medications",
    width: 110,
    valueFormatter: (value: string) => (value === "yes" ? "Yes" : "No"),
  },
];

// ---- Main Component ----

export function MedicalHistoryTab({ patientId }: { patientId: string }) {
  const [selectedRecord, setSelectedRecord] = useState<ClinicalDataRecord | null>(null);

  const {
    data: latestData,
    isLoading: loadingLatest,
    error: latestError,
  } = useLatestClinicalData(patientId);

  const {
    data: historyData,
    isLoading: loadingHistory,
    error: historyError,
  } = useClinicalData(patientId);

  const isLoading = loadingLatest || loadingHistory;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (latestError && historyError) {
    return (
      <EmptyState
        title="No medical history"
        description="No clinical data has been recorded for this patient yet."
      />
    );
  }

  const latest = latestData?.data?.clinicalData;
  const records = historyData?.data?.records ?? [];

  if (!latest && records.length === 0) {
    return (
      <EmptyState
        title="No medical history"
        description="No clinical data has been recorded for this patient yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Medical Summary with Red Flag status */}
      {latest && <MedicalSummaryCard record={latest} patientId={patientId} />}

      {/* History Table */}
      {records.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Clinical Data History
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                onRowClick={(params) => setSelectedRecord(params.row)}
                sx={dataGridSx}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Sheet */}
      <ClinicalDetailSheet
        record={selectedRecord}
        open={!!selectedRecord}
        onOpenChange={(open) => {
          if (!open) setSelectedRecord(null);
        }}
      />
    </div>
  );
}
