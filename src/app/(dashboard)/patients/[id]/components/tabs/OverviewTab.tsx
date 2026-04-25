"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PatientMapping } from "@/types";
import { useConsultations } from "@/lib/hooks/use-consultations";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { usePatientNotes } from "@/lib/hooks/use-notes";
import { useLatestClinicalData } from "@/lib/hooks/use-patients";
import type { ConsultationType, ConsultationStatus } from "@/types";

const STATUS_DOT_COLORS: Record<ConsultationStatus, string> = {
  completed: "bg-status-success-fg",
  scheduled: "bg-status-info-fg",
  cancelled: "bg-status-danger-fg",
  "no-show": "bg-status-warning-fg",
};

const STATUS_LABELS: Record<ConsultationStatus, string> = {
  completed: "Completed",
  scheduled: "Scheduled",
  cancelled: "Cancelled",
  "no-show": "No show",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ");
}

interface OverviewTabProps {
  patient: PatientMapping | undefined;
  patientId: string;
  onTabChange: (tab: string) => void;
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-0">{children}</CardContent>
    </Card>
  );
}

function DemoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}

export function OverviewTab({ patient, patientId, onTabChange }: OverviewTabProps) {
  const { data: consultsData, isLoading: loadingConsults } =
    useConsultations(patientId);
  const { data: rxData, isLoading: loadingRx } = usePrescriptions(patientId);
  const { data: notesData, isLoading: loadingNotes } = usePatientNotes(patientId);
  const { data: clinicalData } = useLatestClinicalData(patientId);

  const consultations = consultsData?.data?.consultations ?? [];
  const prescriptions = rxData?.data?.prescriptions ?? [];
  const notes = notesData?.data?.notes ?? [];
  const clinical = clinicalData?.data?.clinicalData;

  const recentConsults = consultations
    .sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    )
    .slice(0, 3);

  const activeMeds = prescriptions.filter((p) => p.status === "active");
  const recentNotes = notes.slice(0, 3);

  const formatDobWithAge = (dob: string | null) => {
    if (!dob) return "—";
    const date = new Date(dob);
    const formatted = date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return `${formatted} (${age}y)`;
  };

  const formatMedicare = (number: string | null, irn: string | null) => {
    if (!number) return "—";
    // Format as "2428  89123  4  1" style
    const clean = number.replace(/\s/g, "");
    const formatted = clean.replace(/(\d{4})(\d{5})(\d)/, "$1  $2  $3");
    return irn ? `${formatted}  ${irn}` : formatted;
  };

  const formatAddress = (p: PatientMapping | undefined) => {
    if (!p) return "—";
    const parts = [p.city, p.state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Left column — clinical */}
      <div className="space-y-6">
        {/* Recent consultations */}
        <SectionCard
          title="Recent consultations"
          action={
            <button
              onClick={() => onTabChange("consultations")}
              className="text-xs text-primary hover:underline"
            >
              View all →
            </button>
          }
        >
          {loadingConsults ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentConsults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No consultations yet
            </p>
          ) : (
            <div className="divide-y">
              {recentConsults.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full mt-0.5",
                      STATUS_DOT_COLORS[c.status]
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.doctorName} · {capitalize(c.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {STATUS_LABELS[c.status]}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(c.scheduledAt).toLocaleDateString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Active medications */}
        <SectionCard
          title="Active medications"
          action={
            <button
              onClick={() => onTabChange("prescriptions")}
              className="text-xs text-primary hover:underline"
            >
              + New prescription
            </button>
          }
        >
          {loadingRx ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activeMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active medications
            </p>
          ) : (
            <div className="divide-y">
              {activeMeds.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {m.product}{" "}
                      <span className="text-muted-foreground font-normal">
                        {m.dosage}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.prescriberName ?? "Unknown prescriber"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {m.repeats ?? 0} refills
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Latest notes */}
        <SectionCard
          title="Latest notes"
          action={
            <button
              onClick={() => onTabChange("notes")}
              className="text-xs text-primary hover:underline"
            >
              + Add note
            </button>
          }
        >
          {loadingNotes ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No notes yet
            </p>
          ) : (
            <div className="divide-y">
              {recentNotes.map((n) => (
                <div key={n.id} className="py-2.5">
                  <p className="text-sm font-medium">{n.title}</p>
                  <div
                    className="text-xs text-muted-foreground line-clamp-2 mt-0.5"
                    dangerouslySetInnerHTML={{ __html: n.content }}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {n.authorName}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Right column — demographics + alerts */}
      <div className="space-y-6">
        {/* Demographics */}
        <SectionCard
          title="Demographics"
          action={
            <button className="text-xs text-primary hover:underline">
              Edit
            </button>
          }
        >
          <DemoField label="DOB" value={formatDobWithAge(patient?.date_of_birth ?? null)} />
          <DemoField label="Gender" value={patient?.gender} />
          <DemoField label="Mobile" value={patient?.mobile} />
          <DemoField label="Email" value={patient?.original_email} />
          <DemoField label="Address" value={formatAddress(patient)} />
          <DemoField label="Medicare" value={formatMedicare(patient?.medicare_number ?? null, patient?.medicare_irn ?? null)} />
          <DemoField label="PMS ID" value={patient?.halaxy_patient_id} />
        </SectionCard>

        {/* Conditions */}
        <SectionCard title="Conditions">
          {clinical?.has_medical_conditions === "yes" ? (
            <div className="divide-y">
              {(clinical.medical_conditions ?? []).map((c) => (
                <div key={c} className="flex items-center justify-between py-2">
                  <span className="text-sm">{c}</span>
                  <Badge variant="outline" className="text-xs">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No conditions recorded
            </p>
          )}
        </SectionCard>

        {/* Care team */}
        <SectionCard title="Care team">
          <p className="text-sm text-muted-foreground py-4 text-center">
            No care team assigned
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
