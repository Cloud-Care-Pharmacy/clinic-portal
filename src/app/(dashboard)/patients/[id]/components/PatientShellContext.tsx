"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PatientMapping } from "@/types";

interface PatientShellContextValue {
  patientId: string;
  patient: PatientMapping | undefined;
  displayName: string;
}

const PatientShellContext = createContext<PatientShellContextValue | null>(null);

export function PatientShellProvider({
  patientId,
  patient,
  displayName,
  children,
}: PatientShellContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ patientId, patient, displayName }),
    [displayName, patient, patientId]
  );

  return (
    <PatientShellContext.Provider value={value}>
      {children}
    </PatientShellContext.Provider>
  );
}

export function usePatientShell() {
  const context = useContext(PatientShellContext);
  if (!context) {
    throw new Error("usePatientShell must be used inside PatientShellProvider");
  }
  return context;
}
