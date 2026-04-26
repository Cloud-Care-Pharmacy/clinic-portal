"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { usePatient, useLatestClinicalData } from "@/lib/hooks/use-patients";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { usePatientCounts } from "@/lib/hooks/use-patient-counts";
import {
  canIdlePrefetchPatientTabs,
  isPatientTabSegment,
  prefetchLikelyPatientTabs,
  type PatientTabSegment,
} from "@/lib/hooks/patient-tab-prefetch";
import { computeRedFlags } from "@/components/patients/red-flag-utils";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";
import { PatientHeader } from "./components/PatientHeader";
import { PatientShellProvider } from "./components/PatientShellContext";
import { RedFlagAlert } from "./components/RedFlagAlert";
import type { PatientShellInitialData } from "./patient-shell-data";
import { cn } from "@/lib/utils";

type TabCountKey =
  | "consultations"
  | "prescriptions"
  | "documents"
  | "clinical"
  | "notes"
  | "activity";

const TABS: {
  label: string;
  segment: PatientTabSegment;
  countKey: TabCountKey | null;
}[] = [
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
  initialData?: PatientShellInitialData;
  children: React.ReactNode;
}

export default function PatientLayoutClient({
  id,
  initialData,
  children,
}: PatientLayoutClientProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: patientData, isLoading } = usePatient(id, initialData?.patient);
  const patient = patientData?.data?.patient;
  const { data: latestClinical } = useLatestClinicalData(
    id,
    initialData?.latestClinical
  );
  const redFlags = latestClinical?.data?.clinicalData
    ? computeRedFlags(latestClinical.data.clinicalData)
    : null;
  const { setOverride, clearOverride } = useBreadcrumbOverrides();

  // Fetch counts for tab badges. Prescriptions are fetched directly because the
  // counts endpoint currently returns zeroes for Parchment-derived prescriptions.
  const { data: countsData } = usePatientCounts(id, initialData?.counts);
  const { data: rxData } = usePrescriptions(id, initialData?.prescriptions);
  const counts = countsData?.data;

  const tabCounts: Record<TabCountKey, number | undefined> = {
    consultations: counts?.consultations,
    prescriptions: rxData?.data?.prescriptions?.length,
    documents: counts?.documents,
    clinical: counts?.clinicalRecords,
    notes: counts?.notes,
    activity: counts?.activity,
  };

  const fullName = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ");
  const displayName =
    fullName ||
    (patient?.originalEmail
      ? patient.originalEmail.split("@")[0].replace(/[._+]/g, " ")
      : "Loading…");

  useEffect(() => {
    if (displayName && displayName !== "Loading…") {
      setOverride(`/patients/${id}`, displayName);
    }
    return () => clearOverride(`/patients/${id}`);
  }, [displayName, id, setOverride, clearOverride]);

  // Determine active tab from pathname
  const basePath = `/patients/${id}`;
  const activePathSegment =
    pathname === basePath || pathname === `${basePath}/`
      ? ""
      : pathname.replace(`${basePath}/`, "").split("/")[0];
  const activeSegment = isPatientTabSegment(activePathSegment) ? activePathSegment : "";

  useEffect(() => {
    if (isLoading) return;
    if (!canIdlePrefetchPatientTabs()) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const prefetch = () => {
      void prefetchLikelyPatientTabs(queryClient, id, activeSegment);
    };

    const requestIdle = window.requestIdleCallback;
    const cancelIdle = window.cancelIdleCallback;

    if (typeof requestIdle === "function") {
      idleId = requestIdle(prefetch, { timeout: 3000 });
    } else {
      timeoutId = globalThis.setTimeout(prefetch, 750);
    }

    return () => {
      if (idleId != null && typeof cancelIdle === "function") cancelIdle(idleId);
      if (timeoutId != null) globalThis.clearTimeout(timeoutId);
    };
  }, [activeSegment, id, isLoading, queryClient]);

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
    <PatientShellProvider patientId={id} patient={patient} displayName={displayName}>
      <div className="flex flex-col gap-6">
        {/* Patient Header (includes stat strip) */}
        <PatientHeader
          patient={patient}
          displayName={displayName}
          statData={initialData}
        />

        {/* Red-flag alert — separate banner between header and tabs */}
        {redFlags?.hasRedFlag && <RedFlagAlert redFlags={redFlags} />}

        {/* Pill-style tab navigation */}
        <nav className="inline-flex bg-muted rounded-[14px] p-1.5">
          {TABS.map((tab) => {
            const href = tab.segment ? `${basePath}/${tab.segment}` : basePath;
            const isActive = activeSegment === tab.segment;
            const count = tab.countKey ? tabCounts[tab.countKey] : undefined;

            return (
              <Link
                key={tab.segment}
                href={href}
                scroll={false}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
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
              </Link>
            );
          })}
        </nav>

        {/* Tab content */}
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </PatientShellProvider>
  );
}
