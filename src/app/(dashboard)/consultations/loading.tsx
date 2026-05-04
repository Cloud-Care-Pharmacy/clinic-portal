import { CalendarDays, Plus, Search, Table2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

const TABLE_GRID_TEMPLATE = "minmax(220px, 1fr) minmax(180px, 1fr) 130px 130px 200px";
const TABLE_HEADERS = ["Patient", "Doctor", "Type", "Status", "Scheduled"];

export default function ConsultationsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        description="Schedule, review, and follow up on patient consultations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1"
            >
              <div
                role="tab"
                aria-selected="true"
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-background px-2.5 text-xs font-semibold text-foreground shadow-xs"
              >
                <Table2 className="h-3.5 w-3.5" />
                Table
              </div>
              <div
                role="tab"
                aria-selected="false"
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar
              </div>
            </div>
            <div className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-primary bg-primary px-2.5 text-sm font-medium text-primary-foreground">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Schedule Consultation</span>
              <span className="sm:hidden">Schedule</span>
            </div>
          </div>
        }
      />

      <div style={{ width: "100%" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-foreground">
              <CalendarDays className="size-4 text-muted-foreground" />
              Date range
            </div>
            <div className="relative h-9 w-full rounded-lg border border-input bg-background text-sm text-muted-foreground sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
              <span className="absolute left-8 top-1/2 -translate-y-1/2">
                Search consultations...
              </span>
            </div>
            <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-foreground">
              Status
            </div>
            <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-foreground">
              Type
            </div>
          </div>
          <div className="ml-auto text-sm text-muted-foreground tabular-nums">
            Loading consultations
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 860 }}>
              <div
                className="grid h-11 items-center border-b border-border"
                style={{
                  backgroundColor: "var(--table-header)",
                  gridTemplateColumns: TABLE_GRID_TEMPLATE,
                }}
              >
                {TABLE_HEADERS.map((header) => (
                  <div
                    key={header}
                    className="px-4 text-sm font-semibold text-foreground"
                  >
                    {header}
                  </div>
                ))}
              </div>

              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingConsultationRow key={index} />
              ))}
            </div>
          </div>

          <div className="flex min-h-14 items-center justify-end gap-6 border-t border-border bg-card px-4 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <span className="tabular-nums">25</span>
            <span className="tabular-nums">Loading rows</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingConsultationRow() {
  return (
    <div
      className="grid items-center border-b border-border last:border-b-0"
      style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE, minHeight: 76 }}
    >
      <div className="flex min-w-0 items-center gap-3 px-4">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="min-w-0 space-y-2 px-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="px-4">
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="px-4">
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-2 px-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
