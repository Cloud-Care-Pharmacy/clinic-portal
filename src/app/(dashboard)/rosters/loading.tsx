import { PageHeader } from "@/components/shared/PageHeader";

export default function RostersLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Rosters" }]}
        title="Doctor Rosters"
        description="Weekly availability across the practice. Click a doctor to view their full week."
      />
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-8 w-44 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-8 gap-px bg-border p-px">
          {Array.from({ length: 8 * 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
