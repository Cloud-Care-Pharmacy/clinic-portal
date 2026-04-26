"use client";

import { useState } from "react";
import { CalendarDays, Table2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ConsultationTable } from "@/components/consultations/ConsultationTable";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { ConsultationCalendar } from "@/components/consultations/ConsultationCalendar";
import { useConsultations } from "@/lib/hooks/use-consultations";
import type { Consultation } from "@/types";

type ViewMode = "table" | "calendar";

export function ConsultationsClient() {
  const { data, isLoading } = useConsultations();
  const consultations = data?.data?.consultations ?? [];
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("consultations-view") as ViewMode) || "table";
    }
    return "table";
  });

  function toggleView(mode: ViewMode) {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("consultations-view", mode);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-r-none"
                onClick={() => toggleView("table")}
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-l-none"
                onClick={() => toggleView("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              Schedule Consultation
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <ErrorBoundary>
          {viewMode === "table" ? (
            <ConsultationTable
              consultations={consultations}
              loading={isLoading}
              onRowClick={setSelected}
              onSchedule={() => setSheetOpen(true)}
            />
          ) : (
            <ConsultationCalendar
              consultations={consultations}
              onEventClick={setSelected}
            />
          )}
        </ErrorBoundary>
      )}

      <NewConsultationSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <NewConsultationSheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        consultation={selected}
      />
    </div>
  );
}
