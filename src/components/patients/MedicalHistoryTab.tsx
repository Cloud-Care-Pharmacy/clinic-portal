"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { AppSheet } from "@/components/shared/AppSheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { dataGridSx } from "@/lib/datagrid-theme";
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
import { useLatestClinicalData, useClinicalData } from "@/lib/hooks/use-patients";
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
      description={record ? `Submitted ${formatDate(record.submitted_at)}` : ""}
    >
      {record ? (
        <div className="space-y-6">
          {/* Smoking */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Smoking</h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {SMOKING_LABELS[record.smoking_status] ?? record.smoking_status}
              </p>
              {record.cigarettes_per_day && (
                <p>
                  <span className="text-muted-foreground">Cigarettes/day:</span>{" "}
                  {record.cigarettes_per_day}
                </p>
              )}
              {record.years_smoked && (
                <p>
                  <span className="text-muted-foreground">Years smoked:</span>{" "}
                  {record.years_smoked}
                </p>
              )}
              {record.times_tried_quitting && (
                <p>
                  <span className="text-muted-foreground">Quit attempts:</span>{" "}
                  {record.times_tried_quitting}
                </p>
              )}
              {record.quit_motivation && record.quit_motivation.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Quit motivation:</span>{" "}
                  {formatList(record.quit_motivation)}
                </p>
              )}
              {record.quit_methods && record.quit_methods.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Quit methods:</span>{" "}
                  {formatList(record.quit_methods)}
                </p>
              )}
              {record.quit_method_explanation && (
                <p>
                  <span className="text-muted-foreground">Method details:</span>{" "}
                  {record.quit_method_explanation}
                </p>
              )}
              {record.last_cigarette && (
                <p>
                  <span className="text-muted-foreground">Last cigarette:</span>{" "}
                  {record.last_cigarette}
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
                {VAPING_LABELS[record.vaping_status] ?? record.vaping_status}
              </p>
              {record.vaping_method && (
                <p>
                  <span className="text-muted-foreground">Method:</span>{" "}
                  {record.vaping_method}
                </p>
              )}
              {record.vaping_strength && (
                <p>
                  <span className="text-muted-foreground">Strength:</span>{" "}
                  {record.vaping_strength}
                </p>
              )}
              {record.vaping_volume && (
                <p>
                  <span className="text-muted-foreground">Volume:</span>{" "}
                  {record.vaping_volume}
                </p>
              )}
              {record.vaping_notes && (
                <p>
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  {record.vaping_notes}
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
                {record.has_medical_conditions === "yes" ? "Yes" : "No"}
              </p>
              {record.medical_conditions && record.medical_conditions.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Conditions:</span>{" "}
                  {formatList(record.medical_conditions)}
                </p>
              )}
              {record.medical_conditions_other && (
                <p>
                  <span className="text-muted-foreground">Other:</span>{" "}
                  {record.medical_conditions_other}
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
                {record.takes_medication === "yes" ? "Yes" : "No"}
              </p>
              {record.high_risk_medications &&
                record.high_risk_medications.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">
                      High-risk medications:
                    </span>{" "}
                    {formatList(record.high_risk_medications)}
                  </p>
                )}
              {record.medications_list && (
                <p>
                  <span className="text-muted-foreground">Medications list:</span>{" "}
                  {record.medications_list}
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

          {record.additional_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Additional Notes</h4>
                <p className="text-sm">{record.additional_notes}</p>
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
  const storageKey = `red-flag-reviewed-${patientId}`;

  const [reviewed, setReviewed] = useState(() => {
    if (typeof window === "undefined") return false;
    const isReviewed = localStorage.getItem(storageKey) === "true";
    const storedAt = localStorage.getItem(`${storageKey}-at`);
    if (isReviewed && storedAt && storedAt !== record.submitted_at) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}-at`);
      return false;
    }
    return isReviewed;
  });

  const redFlags = computeRedFlags(record);

  const toggleReviewed = useCallback(() => {
    setReviewed((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, String(next));
      if (next) {
        localStorage.setItem(`${storageKey}-at`, record.submitted_at);
      } else {
        localStorage.removeItem(`${storageKey}-at`);
      }
      return next;
    });
  }, [storageKey, record.submitted_at]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Current Medical Summary
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Last updated {formatDate(record.submitted_at)}
          </span>
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
                onClick={toggleReviewed}
              >
                {reviewed ? "Mark Unreviewed" : "Mark as Reviewed"}
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
            value={SMOKING_LABELS[record.smoking_status] ?? record.smoking_status}
            badge={record.cigarettes_per_day ?? undefined}
          />
          <SummaryField
            icon={<Wind className="h-4 w-4" />}
            label="Vaping Status"
            value={VAPING_LABELS[record.vaping_status] ?? record.vaping_status}
            badge={record.vaping_method ?? undefined}
          />
          <SummaryField
            icon={<HeartPulse className="h-4 w-4" />}
            label="Medical Conditions"
            value={
              record.has_medical_conditions === "yes"
                ? formatList(record.medical_conditions)
                : "None reported"
            }
          />
          <SummaryField
            icon={<Pill className="h-4 w-4" />}
            label="Medications"
            value={
              record.takes_medication === "yes"
                ? (record.medications_list ?? formatList(record.high_risk_medications))
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
    field: "submitted_at",
    headerName: "Date",
    width: 140,
    valueFormatter: (value: string) => formatDate(value),
  },
  {
    field: "smoking_status",
    headerName: "Smoking",
    flex: 1,
    minWidth: 150,
    valueFormatter: (value: string) => SMOKING_LABELS[value] ?? value,
  },
  {
    field: "vaping_status",
    headerName: "Vaping",
    width: 100,
    valueFormatter: (value: string) => VAPING_LABELS[value] ?? value,
  },
  {
    field: "has_medical_conditions",
    headerName: "Conditions",
    width: 110,
    valueFormatter: (value: string) => (value === "yes" ? "Yes" : "No"),
  },
  {
    field: "takes_medication",
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
                    sortModel: [{ field: "submitted_at", sort: "desc" }],
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
