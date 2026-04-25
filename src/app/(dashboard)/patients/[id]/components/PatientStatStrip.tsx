"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, Pill, CalendarClock } from "lucide-react";
import { useConsultations } from "@/lib/hooks/use-consultations";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";

interface StatItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subText: string;
}

function StatItem({ icon, iconBg, label, value, subText }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 flex-1 px-4 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground truncate" title={subText}>
          {subText}
        </p>
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
    .filter((c) => c.status === "scheduled" && new Date(c.scheduledAt).getTime() > now)
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )[0];

  if (!patientId || loadingConsults || loadingRx) {
    return (
      <div className="flex rounded-lg border divide-x">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 px-4 py-3">
            <Skeleton className="h-14 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex rounded-lg border divide-x">
      <StatItem
        icon={<CalendarCheck className="h-4 w-4 text-status-info-fg" />}
        iconBg="bg-status-info-bg"
        label="Last consult"
        value={
          lastConsult
            ? new Date(lastConsult.scheduledAt).toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—"
        }
        subText={lastConsult?.doctorName ?? "No consultations"}
      />
      <StatItem
        icon={<CalendarClock className="h-4 w-4 text-status-accent-fg" />}
        iconBg="bg-status-accent-bg"
        label="Next appointment"
        value={
          nextAppt
            ? new Date(nextAppt.scheduledAt).toLocaleDateString("en-AU", {
                day: "2-digit",
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
      <StatItem
        icon={<Pill className="h-4 w-4 text-status-success-fg" />}
        iconBg="bg-status-success-bg"
        label="Active meds"
        value={String(activeMeds)}
        subText={`${activeMeds} prescription${activeMeds !== 1 ? "s" : ""}`}
      />
    </div>
  );
}
