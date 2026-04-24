"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Stethoscope, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PatientMapping } from "@/types";
import { useConsultations } from "@/lib/hooks/use-consultations";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { usePatientNotes } from "@/lib/hooks/use-notes";
import { useLatestClinicalData } from "@/lib/hooks/use-patients";
import type { ConsultationType } from "@/types";
import Link from "next/link";

const CONSULT_TYPE_COLORS: Record<ConsultationType, string> = {
  initial: "bg-status-info-bg text-status-info-fg border-status-info-border",
  "follow-up": "bg-status-accent-bg text-status-accent-fg border-status-accent-border",
  renewal: "bg-status-success-bg text-status-success-fg border-status-success-border",
};

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

  const formatDob = (dob: string | null) => {
    if (!dob) return "—";
    return new Date(dob).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getAge = (dob: string | null) => {
    if (!dob) return "—";
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age}`;
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.doctorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.scheduledAt).toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("capitalize text-xs", CONSULT_TYPE_COLORS[c.type])}
                  >
                    {c.type}
                  </Badge>
                  <StatusBadge status={c.status} />
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
              View all →
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
        <SectionCard title="Demographics">
          <DemoField label="DOB" value={formatDob(patient?.date_of_birth ?? null)} />
          <DemoField label="Age" value={getAge(patient?.date_of_birth ?? null)} />
          <DemoField label="Gender" value={patient?.gender} />
          <DemoField label="Medicare" value={patient?.medicare_number} />
          <DemoField label="GP" value="—" />
        </SectionCard>

        {/* Allergies */}
        <SectionCard title="Allergies">
          {clinical?.has_medical_conditions === "yes" &&
          clinical?.medical_conditions?.length ? (
            <div className="flex flex-wrap gap-1.5 py-2">
              {clinical.medical_conditions.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="bg-status-danger-bg text-status-danger-fg border-status-danger-border text-xs"
                >
                  {c}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No allergies recorded
            </p>
          )}
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
