"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, Pill, CalendarClock, HeartPulse } from "lucide-react";
import { useConsultations } from "@/lib/hooks/use-consultations";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
}

function StatCard({ icon, iconBg, value, label }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-lg font-semibold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

interface PatientStatStripProps {
  patientId: string | undefined;
}

export function PatientStatStrip({ patientId }: PatientStatStripProps) {
  const { data: consultsData, isLoading: loadingConsults } = useConsultations(
    patientId ?? ""
  );
  const { data: rxData, isLoading: loadingRx } = usePrescriptions(patientId ?? "");

  const consultations = consultsData?.data?.consultations ?? [];
  const prescriptions = rxData?.data?.prescriptions ?? [];

  const lastConsult = consultations
    .filter((c) => c.status === "completed")
    .sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    )[0];

  const activeMeds = prescriptions.filter((p) => p.status === "active").length;

  // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for filtering future appointments
  const now = Date.now();
  const nextAppt = consultations
    .filter(
      (c) => c.status === "scheduled" && new Date(c.scheduledAt).getTime() > now
    )
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )[0];

  if (!patientId || loadingConsults || loadingRx) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<CalendarCheck className="h-4 w-4 text-status-info-fg" />}
        iconBg="bg-status-info-bg"
        value={
          lastConsult
            ? new Date(lastConsult.scheduledAt).toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—"
        }
        label="Last consult"
      />
      <StatCard
        icon={<Pill className="h-4 w-4 text-status-success-fg" />}
        iconBg="bg-status-success-bg"
        value={String(activeMeds)}
        label="Active meds"
      />
      <StatCard
        icon={<CalendarClock className="h-4 w-4 text-status-accent-fg" />}
        iconBg="bg-status-accent-bg"
        value={
          nextAppt
            ? new Date(nextAppt.scheduledAt).toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
              })
            : "—"
        }
        label="Next appt"
      />
      <StatCard
        icon={<HeartPulse className="h-4 w-4 text-status-warning-fg" />}
        iconBg="bg-status-warning-bg"
        value="—"
        label="Conditions"
      />
    </div>
  );
}
