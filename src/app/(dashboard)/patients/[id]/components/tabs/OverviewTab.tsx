"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Stethoscope, RotateCw, RefreshCw } from "lucide-react";
import { cn, htmlToPlainText } from "@/lib/utils";
import type { PatientMapping, ConsultationType } from "@/types";
import { useConsultations } from "@/lib/hooks/use-consultations";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { usePatientNotes } from "@/lib/hooks/use-notes";
import { useLatestClinicalData } from "@/lib/hooks/use-patients";
import { StatusBadge } from "@/components/shared/StatusBadge";

/* ── Helpers ── */

function relTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 30) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const CONSULT_TYPE_CONFIG: Record<
  ConsultationType,
  { icon: typeof Stethoscope; tileClass: string }
> = {
  initial: {
    icon: Stethoscope,
    tileClass: "bg-status-info-bg text-status-info-fg border-status-info-border",
  },
  "follow-up": {
    icon: RotateCw,
    tileClass: "bg-status-accent-bg text-status-accent-fg border-status-accent-border",
  },
  renewal: {
    icon: RefreshCw,
    tileClass:
      "bg-status-success-bg text-status-success-fg border-status-success-border",
  },
};

/* ── Shared section-card-head ── */

function SectionHead({
  title,
  count,
  actionLabel,
  onAction,
}: {
  title: string;
  count?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="text-base font-semibold leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <div className="inline-flex items-center gap-2">
        {count && (
          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        )}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-[13px] font-medium text-primary hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Card shell ── */

function OverviewCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-5", className)}>
      {children}
    </div>
  );
}

/* ── Main component ── */

interface OverviewTabProps {
  patient: PatientMapping | undefined;
  patientId: string;
  onTabChange: (tab: string) => void;
}

export function OverviewTab({ patient, patientId, onTabChange }: OverviewTabProps) {
  const { data: consultsData, isLoading: loadingConsults } =
    useConsultations(patientId);
  const { data: rxData, isLoading: loadingRx } = usePrescriptions(patientId);
  const { data: notesData, isLoading: loadingNotes } = usePatientNotes(patientId);
  const { data: clinicalData } = useLatestClinicalData(patientId);

  const consultations = consultsData?.data?.consultations ?? [];
  const prescriptions = rxData?.data?.prescriptions ?? [];
  const notes = notesData?.data?.notes ?? [];
  const clinical = clinicalData?.data?.clinicalData;

  const recentConsults = [...consultations]
    .sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    )
    .slice(0, 4);

  const activeMeds = prescriptions.filter((p) => p.status === "active");
  const recentNotes = notes.slice(0, 3);

  const conditions = clinical?.medical_conditions ?? [];

  // Unique care team from consultations
  const careTeamMap = new Map<string, { name: string; role: string }>();
  for (const c of consultations) {
    if (c.doctorName && !careTeamMap.has(c.doctorId)) {
      careTeamMap.set(c.doctorId, { name: c.doctorName, role: "Doctor" });
    }
  }
  const careTeam = Array.from(careTeamMap.values()).slice(0, 4);

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function formatDobWithAge(dob: string | null): { date: string; age: string } | null {
    if (!dob) return null;
    const d = new Date(dob);
    const formatted = d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return { date: formatted, age: `(${age}y)` };
  }

  function formatMedicare(number: string | null, irn: string | null): string {
    if (!number) return "—";
    const clean = number.replace(/\s/g, "");
    const formatted = clean.replace(/(\d{4})(\d{5})(\d)/, "$1 $2 $3");
    return irn ? `${formatted} ${irn}` : formatted;
  }

  return (
    <div className="grid grid-cols-12 gap-x-5 gap-y-6 max-[1100px]:grid-cols-1">
      {/* ── LEFT COLUMN ── */}

      {/* Recent consultations — span-8 */}
      <OverviewCard className="col-span-12 min-[1100px]:col-span-8 min-w-0">
        <SectionHead
          title="Recent consultations"
          count={`${consultations.length} total`}
          actionLabel="View all"
          onAction={() => onTabChange("consultations")}
        />
        {loadingConsults ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recentConsults.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-4">No consultations yet</p>
        ) : (
          <div className="flex flex-col">
            {recentConsults.map((c, i) => {
              const config = CONSULT_TYPE_CONFIG[c.type] ?? CONSULT_TYPE_CONFIG.initial;
              const Icon = config.icon;
              const summary =
                htmlToPlainText(c.outcome) || htmlToPlainText(c.notes) || c.status;
              return (
                <div key={c.id}>
                  {i > 0 && <div className="h-px bg-border" />}
                  <div
                    className={cn(
                      "flex gap-3 items-center py-3 cursor-pointer transition-colors duration-120 -mx-3 px-3 rounded-lg hover:bg-muted",
                      i === 0 && "pt-0",
                      i === recentConsults.length - 1 && "pb-0"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                        config.tileClass
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {c.doctorName}{" "}
                        <span className="font-normal text-muted-foreground capitalize">
                          · {c.type.replace("-", " ")}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
                      {fmtDate(c.scheduledAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </OverviewCard>

      {/* Conditions — span-4 (no allergies) */}
      <OverviewCard className="col-span-12 min-[1100px]:col-span-4 min-w-0">
        <SectionHead
          title="Conditions"
          actionLabel="Edit"
          onAction={() => onTabChange("clinical")}
        />
        {conditions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {conditions.map((c) => (
              <span
                key={c}
                className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-status-neutral-bg text-status-neutral-fg border border-status-neutral-border"
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">None recorded</p>
        )}
      </OverviewCard>

      {/* Active medications — span-8 */}
      <OverviewCard className="col-span-12 min-[1100px]:col-span-8 min-w-0">
        <SectionHead
          title="Active medications"
          count={`${activeMeds.length} active`}
          actionLabel="+ New prescription"
          onAction={() => onTabChange("prescriptions")}
        />
        {loadingRx ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : activeMeds.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-4">
            No active medications
          </p>
        ) : (
          <div className="flex flex-col">
            {activeMeds.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 items-center py-3",
                  i === 0 && "pt-0",
                  i === activeMeds.length - 1 ? "pb-0" : "border-b border-border"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {m.product} {m.dosage}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.dosage} · since {fmtDate(m.issuedAt)}
                  </p>
                </div>
                <StatusBadge status={m.status} />
                <span className="font-mono text-[11px] text-muted-foreground tracking-[0.02em]">
                  RX-{m.id.slice(-3)}
                </span>
              </div>
            ))}
          </div>
        )}
      </OverviewCard>

      {/* Right column stack: Demographics + Care team — span-4 */}
      <div className="col-span-12 min-[1100px]:col-span-4 min-w-0 flex flex-col gap-6">
        {/* Demographics */}
        <OverviewCard>
          <SectionHead title="Demographics" actionLabel="Edit" onAction={() => {}} />
          <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
            <dt className="text-muted-foreground">DOB</dt>
            <dd className="font-medium min-w-0 wrap-break-word">
              {(() => {
                const dob = formatDobWithAge(patient?.date_of_birth ?? null);
                if (!dob) return "—";
                return (
                  <>
                    {dob.date}{" "}
                    <span className="font-normal text-muted-foreground">{dob.age}</span>
                  </>
                );
              })()}
            </dd>
            <dt className="text-muted-foreground">Gender</dt>
            <dd className="font-medium">{patient?.gender ?? "—"}</dd>
            <dt className="text-muted-foreground">Mobile</dt>
            <dd className="font-medium">{patient?.mobile ?? "—"}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-xs min-w-0 wrap-break-word">
              {patient?.original_email ?? "—"}
            </dd>
            <dt className="text-muted-foreground">Address</dt>
            <dd className="font-medium">
              {[patient?.city, patient?.state].filter(Boolean).join(", ") || "—"}
            </dd>
            <dt className="text-muted-foreground">Medicare</dt>
            <dd className="font-mono text-xs font-normal tracking-[0.01em]">
              {formatMedicare(
                patient?.medicare_number ?? null,
                patient?.medicare_irn ?? null
              )}
            </dd>
          </dl>
        </OverviewCard>

        {/* Care team */}
        <OverviewCard>
          <SectionHead title="Care team" />
          {careTeam.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No care team assigned</p>
          ) : (
            <div className="flex flex-col gap-3">
              {careTeam.map((member, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary text-xs font-semibold">
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                      {member.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-px">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OverviewCard>
      </div>

      {/* Latest notes */}
      <OverviewCard className="col-span-12 min-w-0">
        <SectionHead
          title="Latest notes"
          actionLabel="+ Add note"
          onAction={() => onTabChange("notes")}
        />
        {loadingNotes ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recentNotes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-4">No notes yet</p>
        ) : (
          <div className="grid gap-4 min-[900px]:grid-cols-3">
            {recentNotes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <p className="text-[13px] leading-[1.55] text-foreground font-medium">
                  {n.title}
                </p>
                <div
                  className="text-[13px] leading-[1.55] text-foreground line-clamp-3 mt-1"
                  dangerouslySetInnerHTML={{ __html: n.content }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {n.authorName} · {relTime(n.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </OverviewCard>
    </div>
  );
}
