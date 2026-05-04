"use client";

import { useState } from "react";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { CalendarDays, Table2 } from "lucide-react";
import { ConsultationTable } from "@/components/consultations/ConsultationTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Button } from "@/components/ui/button";
import type { Consultation, ConsultationStatus, ConsultationType } from "@/types";
import type { DateRangeFilter } from "./ConsultationsClient";

type ViewMode = "table" | "calendar";

const EMPTY_CONSULTATIONS: Consultation[] = [];
const EMPTY_STATUS_FILTERS: ConsultationStatus[] = [];
const EMPTY_TYPE_FILTERS: ConsultationType[] = [];
const EMPTY_DOCTOR_FILTERS: string[] = [];
const EMPTY_DATE_RANGE: DateRangeFilter = {};

export default function ConsultationsLoading() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        description="Schedule, review, and follow up on patient consultations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                {
                  value: "table",
                  label: "Table",
                  icon: <Table2 className="h-3.5 w-3.5" />,
                },
                {
                  value: "calendar",
                  label: "Calendar",
                  icon: <CalendarDays className="h-3.5 w-3.5" />,
                },
              ]}
            />
            <Button size="sm" className="h-8">
              <span className="sm:hidden">+ Schedule</span>
              <span className="hidden sm:inline">+ Schedule Consultation</span>
            </Button>
          </div>
        }
      />

      <ConsultationTable
        consultations={EMPTY_CONSULTATIONS}
        loading
        resultCountLoading
        onRowClick={() => undefined}
        onSchedule={() => undefined}
        searchQuery=""
        onSearchChange={() => undefined}
        statusFilters={EMPTY_STATUS_FILTERS}
        onStatusFiltersChange={() => undefined}
        typeFilters={EMPTY_TYPE_FILTERS}
        onTypeFiltersChange={() => undefined}
        doctorOptions={[]}
        doctorFilters={EMPTY_DOCTOR_FILTERS}
        onDoctorFiltersChange={() => undefined}
        dateRange={EMPTY_DATE_RANGE}
        onDateRangeChange={() => undefined}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />
    </div>
  );
}