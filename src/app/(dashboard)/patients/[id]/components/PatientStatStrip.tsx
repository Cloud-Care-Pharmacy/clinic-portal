"use client";

import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, FileText, CalendarClock, Heart } from "lucide-react";
import type { PatientShellInitialData } from "../patient-shell-data";

interface StatCellProps {
  icon: React.ReactNode;
  tileClass: string;
  label: string;
  value: string;
  subText: string;
}

function StatCell({ icon, tileClass, label, value, subText }: StatCellProps) {
  return (
    <div className="flex flex-1 gap-3 px-5 first:pl-0 last:pr-0 not-last:border-r border-border">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border ${tileClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-1.5 truncate">
          {label}
        </p>
        <p
          className="text-lg font-semibold leading-[1.2] truncate tabular-nums"
          title={value}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate" title={subText}>
          {subText}
        </p>
      </div>
    </div>
  );
}

interface PatientStatStripProps {
  patientId: string | undefined;
  statData?: PatientShellInitialData;
}

export const PatientStatStrip = memo(function PatientStatStrip({
  patientId,
  statData,
}: PatientStatStripProps) {
  const consultsData = statData?.consultations;
  const rxData = statData?.prescriptions;
  const clinicalData = statData?.latestClinical;
  const clinical = clinicalData?.data?.clinicalData;

  const consultations = consultsData?.data?.consultations ?? [];
  const prescriptions = rxData?.data?.prescriptions ?? [];

  const lastConsult = consultations
    .filter((c) => c.status === "completed")
    .sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    )[0];

  const latestPrescription = [...prescriptions].sort(
    (a, b) =>
      new Date(b.prescriptionDate).getTime() - new Date(a.prescriptionDate).getTime()
  )[0];

  // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for filtering future appointments
  const now = Date.now();
  const nextAppt = consultations
    .filter((c) => c.status === "scheduled" && new Date(c.scheduledAt).getTime() > now)
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )[0];

  // Conditions count (since no allergies)
  const conditions = clinical?.medicalConditions ?? [];

  if (!patientId) {
    return (
      <div className="flex border-t border-border mt-4 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 px-5 first:pl-0 last:pr-0">
            <Skeleton className="h-14 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex border-t border-border mt-4 pt-4">
      <StatCell
        icon={<Activity className="size-4.5 text-status-info-fg" />}
        tileClass="bg-status-info-bg text-status-info-fg border-status-info-border"
        label="Last consult"
        value={
          lastConsult
            ? new Date(lastConsult.scheduledAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—"
        }
        subText={lastConsult?.doctorName ?? "No consultations"}
      />
      <StatCell
        icon={<CalendarClock className="size-4.5 text-status-success-fg" />}
        tileClass="bg-status-success-bg text-status-success-fg border-status-success-border"
        label="Next appointment"
        value={
          nextAppt
            ? new Date(nextAppt.scheduledAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
              }) +
              ", " +
              new Date(nextAppt.scheduledAt).toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
            : "—"
        }
        subText={nextAppt?.doctorName ?? "None scheduled"}
      />
      <StatCell
        icon={<FileText className="size-4.5 text-status-accent-fg" />}
        tileClass="bg-status-accent-bg text-status-accent-fg border-status-accent-border"
        label="Latest prescription"
        value={
          latestPrescription
            ? new Date(latestPrescription.prescriptionDate).toLocaleDateString(
                "en-AU",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              )
            : "—"
        }
        subText={
          latestPrescription
            ? (latestPrescription.prescriberName ?? "Prescription on record")
            : "No prescriptions"
        }
      />
      <StatCell
        icon={<Heart className="size-4.5 text-status-danger-fg" />}
        tileClass="bg-status-danger-bg text-status-danger-fg border-status-danger-border"
        label="Conditions"
        value={conditions.length > 0 ? String(conditions.length) : "—"}
        subText={
          conditions.length > 0 ? conditions.slice(0, 2).join(", ") : "None recorded"
        }
      />
    </div>
  );
});
