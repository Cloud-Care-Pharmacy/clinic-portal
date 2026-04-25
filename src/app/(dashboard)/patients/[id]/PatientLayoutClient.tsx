"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { usePatient, useLatestClinicalData } from "@/lib/hooks/use-patients";
import { computeRedFlags } from "@/components/patients/red-flag-utils";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";
import { PatientHeader } from "./components/PatientHeader";
import { RedFlagAlert } from "./components/RedFlagAlert";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", segment: "" },
  { label: "Consultations", segment: "consultations" },
  { label: "Prescriptions", segment: "prescriptions" },
  { label: "Documents", segment: "documents" },
  { label: "Clinical History", segment: "clinical" },
  { label: "Notes", segment: "notes" },
  { label: "Activity", segment: "activity" },
] as const;

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

  const fullName = [patient?.first_name, patient?.last_name]
    .filter(Boolean)
    .join(" ");
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
  const activeSegment = pathname === basePath || pathname === `${basePath}/`
    ? ""
    : pathname.replace(`${basePath}/`, "");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <PatientHeader
        patient={patient}
        displayName={displayName}
        redFlags={redFlags}
        isLoading={isLoading}
      />

      {/* Red-flag alert */}
      {redFlags?.hasRedFlag && <RedFlagAlert redFlags={redFlags} />}

      {/* Tab navigation */}
      <nav className="flex items-center gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => {
          const href = tab.segment ? `${basePath}/${tab.segment}` : basePath;
          const isActive = activeSegment === tab.segment;

          return (
            <button
              key={tab.segment}
              onClick={() => router.push(href, { scroll: false })}
              className={cn(
                "relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                "hover:text-foreground",
                isActive
                  ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
                  : "text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
