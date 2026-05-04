import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

const TABLE_GRID_TEMPLATE = "minmax(160px, 1fr) minmax(220px, 1fr) 130px 120px 140px 60px";
const TABLE_HEADERS = ["Name", "Email", "Date of Birth", "Status", "Created", ""];

export default function PatientsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Patients" />
      <p className="-mt-4 text-sm text-muted-foreground">
        Manage your patients and their intake records here.
      </p>

      <div style={{ width: "100%" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="relative h-9 w-full rounded-lg border border-input bg-background text-sm text-muted-foreground sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
              <span className="absolute left-8 top-1/2 -translate-y-1/2">
                Filter patients...
              </span>
            </div>
            <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-foreground">
              Status
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
              Loading patients
            </span>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium text-foreground">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              View
            </div>
            <div className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary bg-primary px-2.5 text-sm font-medium text-primary-foreground">
              <Plus className="size-4" />
              Add Patient
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 830 }}>
              <div
                className="grid h-11 items-center border-b border-border"
                style={{
                  backgroundColor: "var(--table-header)",
                  gridTemplateColumns: TABLE_GRID_TEMPLATE,
                }}
              >
                {TABLE_HEADERS.map((header, index) => (
                  <div
                    key={`${header}-${index}`}
                    className="px-4 text-sm font-semibold text-foreground"
                  >
                    {header}
                  </div>
                ))}
              </div>

              {Array.from({ length: 8 }).map((_, index) => (
                <LoadingPatientRow key={index} />
              ))}
            </div>
          </div>

          <div className="flex min-h-14 items-center justify-end gap-6 border-t border-border bg-card px-4 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <span className="tabular-nums">10</span>
            <span className="tabular-nums">Loading rows</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingPatientRow() {
  return (
    <div
      className="grid items-center border-b border-border last:border-b-0"
      style={{ gridTemplateColumns: TABLE_GRID_TEMPLATE, minHeight: 56 }}
    >
      <div className="px-4">
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="px-4">
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="px-4">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="px-4">
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="px-4">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex justify-center px-4">
        <Skeleton className="size-8 rounded-md" />
      </div>
    </div>
  );
}
