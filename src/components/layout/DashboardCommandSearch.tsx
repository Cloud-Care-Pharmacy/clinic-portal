"use client";

import { useCallback, useState } from "react";
import { Header } from "@/components/layout/Header";
import { PatientCommandPalette } from "@/components/layout/PatientCommandPalette";

interface DashboardCommandSearchProps {
  entityId: string;
}

export function DashboardCommandSearch({ entityId }: DashboardCommandSearchProps) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);

  return (
    <>
      <Header onSearchOpen={openSearch} />
      <PatientCommandPalette entityId={entityId} open={open} onOpenChange={setOpen} />
    </>
  );
}
