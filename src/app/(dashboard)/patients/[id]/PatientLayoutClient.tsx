"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { usePatient, useLatestClinicalData } from "@/lib/hooks/use-patients";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { usePatientCounts } from "@/lib/hooks/use-patient-counts";
import { computeRedFlags } from "@/components/patients/red-flag-utils";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";
import { PatientHeader } from "./components/PatientHeader";
import { RedFlagAlert } from "./components/RedFlagAlert";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", segment: "", countKey: null },
  {
    label: "Consultations",
    segment: "consultations",
    countKey: "consultations" as const,
  },
  {
    label: "Prescriptions",
    segment: "prescriptions",
    countKey: "prescriptions" as const,
  },
  { label: "Documents", segment: "documents", countKey: "documents" as const },
  { label: "Clinical", segment: "clinical", countKey: "clinical" as const },
  { label: "Notes", segment: "notes", countKey: "notes" as const },
  { label: "Activity", segment: "activity", countKey: "activity" as const },
];

interface PatientLayoutClientProps {
  id: string;
  children: React.ReactNode;
}

export default function PatientLayoutClient({
  id,
  children,
}: PatientLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: patientData, isLoading } = usePatient(id);
  const patient = patientData?.data?.patient;
  const { data: latestClinical } = useLatestClinicalData(id);
  const redFlags = latestClinical?.data?.clinicalData
    ? computeRedFlags(latestClinical.data.clinicalData)
    : null;
  const { setOverride, clearOverride } = useBreadcrumbOverrides();

  // Fetch counts for tab badges. Prescriptions are fetched directly because the
  // counts endpoint currently returns zeroes for Parchment-derived prescriptions.
  const { data: countsData } = usePatientCounts(id);
  const { data: rxData } = usePrescriptions(id);
  const counts = countsData?.data;

  const tabCounts: Record<string, number | undefined> = {
    consultations: counts?.consultations,
    prescriptions: rxData?.data?.prescriptions?.length,
    documents: counts?.documents,
    clinical: counts?.clinicalRecords,
    notes: counts?.notes,
    activity: counts?.activity,
  };

  const fullName = [patient?.first_name, patient?.last_name].filter(Boolean).join(" ");
  const displayName =
    fullName ||
    (patient?.original_email
      ? patient.original_email.split("@")[0].replace(/[._+]/g, " ")
      : "Loading…");

  useEffect(() => {
    if (displayName && displayName !== "Loading…") {
      setOverride(`/patients/${id}`, displayName);
    }
    return () => clearOverride(`/patients/${id}`);
  }, [displayName, id, setOverride, clearOverride]);

  // Determine active tab from pathname
  const basePath = `/patients/${id}`;
  const activeSegment =
    pathname === basePath || pathname === `${basePath}/`
      ? ""
      : pathname.replace(`${basePath}/`, "");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-13 w-96 rounded-[14px]" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Patient Header (includes stat strip) */}
      <PatientHeader patient={patient} displayName={displayName} />

      {/* Red-flag alert — separate banner between header and tabs */}
      {redFlags?.hasRedFlag && <RedFlagAlert redFlags={redFlags} />}

      {/* Pill-style tab navigation */}
      <nav className="inline-flex bg-muted rounded-[14px] p-1.5">
        {TABS.map((tab) => {
          const href = tab.segment ? `${basePath}/${tab.segment}` : basePath;
          const isActive = activeSegment === tab.segment;
          const count = tab.countKey ? tabCounts[tab.countKey] : undefined;

          return (
            <button
              key={tab.segment}
              onClick={() => router.push(href, { scroll: false })}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 h-10 px-4.5 rounded-[10px] text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className="inline-flex items-center justify-center rounded-full px-1.5 text-[11px] font-semibold min-w-5 h-5 bg-[color-mix(in_srgb,currentColor_12%,transparent)]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
