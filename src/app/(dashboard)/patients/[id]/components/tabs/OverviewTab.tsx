"use client";

import { useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Stethoscope, RotateCw, RefreshCw } from "lucide-react";
import { cn, htmlToPlainText } from "@/lib/utils";
import type {
  ConsultationType,
  ConsultationsListResponse,
  LatestClinicalDataResponse,
  ParchmentPrescriptionsResponse,
  PatientNotesResponse,
  TasksListResponse,
} from "@/types";
import { useConsultations } from "@/lib/hooks/use-consultations";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { usePatientNotes } from "@/lib/hooks/use-notes";
import { useLatestClinicalData } from "@/lib/hooks/use-patients";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PatientEditSheet } from "@/components/patients/ProfileTab";
import { PatientTasksOverviewCard } from "@/components/tasks/PatientTasksOverviewCard";
import { usePatientShell } from "../PatientShellContext";
import { formatPrescriptionReference } from "@/components/prescriptions/PrescriptionDetailSheet";

/* ── Helpers ── */

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function patientTabHref(
  patientId: string,
  tab: "consultations" | "prescriptions" | "documents" | "clinical" | "notes",
  params?: Record<string, string | undefined>
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value);
  }

  const qs = search.toString();
  const path = `/patients/${encodeURIComponent(patientId)}/${tab}`;
  return qs ? `${path}?${qs}` : path;
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
  actionHref,
  onAction,
}: {
  title: string;
  count?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const actionClassName =
    "inline-flex min-h-11 items-center rounded-md text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="text-base font-semibold leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <div className="inline-flex items-center gap-2">
        {count && (
          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        )}
        {actionLabel && actionHref && (
          <Link href={actionHref} scroll={false} className={actionClassName}>
            {actionLabel}
          </Link>
        )}
        {actionLabel && !actionHref && onAction && (
          <button type="button" onClick={onAction} className={actionClassName}>
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
  patientId: string;
  initialConsultations?: ConsultationsListResponse;
  initialPrescriptions?: ParchmentPrescriptionsResponse;
  initialNotes?: PatientNotesResponse;
  initialLatestClinical?: LatestClinicalDataResponse;
  initialTasks?: TasksListResponse;
}

export function OverviewTab({
  patientId,
  initialConsultations,
  initialPrescriptions,
  initialNotes,
  initialLatestClinical,
  initialTasks,
}: OverviewTabProps) {
  const { patient } = usePatientShell();
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const { data: consultsData, isLoading: loadingConsults } = useConsultations(
    patientId,
    initialConsultations
  );
  const { data: rxData, isLoading: loadingRx } = usePrescriptions(
    patientId,
    initialPrescriptions
  );
  const { data: notesData, isLoading: loadingNotes } = usePatientNotes(
    patientId,
    initialNotes
  );
  const { data: clinicalData } = useLatestClinicalData(
    patientId,
    initialLatestClinical
  );

  const consultations = consultsData?.data?.consultations ?? [];
  const prescriptions = rxData?.data?.prescriptions ?? [];
  const notes = notesData?.data?.notes ?? [];
  const clinical = clinicalData?.data?.clinicalData;

  const recentConsults = [...consultations]
    .sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    )
    .slice(0, 4);

  const latestPrescription = [...prescriptions].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  )[0];
  const recentNotes = notes.slice(0, 3);

  const conditions = clinical?.medicalConditions ?? [];
  const clinicalEditHref = patientTabHref(
    patientId,
    "clinical",
    clinical?.id ? { selected: clinical.id, action: "review" } : undefined
  );

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
    <>
      <div className="grid grid-cols-12 gap-x-5 gap-y-6 max-[1100px]:grid-cols-1">
        {/* ── LEFT COLUMN ── */}

        <div className="col-span-12">
          <PatientTasksOverviewCard patientId={patientId} initialTasks={initialTasks} />
        </div>

        {/* Recent consultations — span-8 */}
        <OverviewCard className="col-span-12 min-[1100px]:col-span-8 min-w-0">
          <SectionHead
            title="Recent consultations"
            count={`${consultations.length} total`}
            actionLabel="View all"
            actionHref={patientTabHref(patientId, "consultations")}
          />
          {loadingConsults ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentConsults.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-4">
              No consultations yet
            </p>
          ) : (
            <div className="flex flex-col">
              {recentConsults.map((c, i) => {
                const config =
                  CONSULT_TYPE_CONFIG[c.type] ?? CONSULT_TYPE_CONFIG.initial;
                const Icon = config.icon;
                const summary =
                  htmlToPlainText(c.outcome) || htmlToPlainText(c.notes) || c.status;
                return (
                  <div key={c.id}>
                    {i > 0 && <div className="h-px bg-border" />}
                    <Link
                      href={patientTabHref(patientId, "consultations", {
                        selected: c.id,
                      })}
                      scroll={false}
                      aria-label={`Open consultation with ${c.doctorName} from ${fmtDate(c.scheduledAt)}`}
                      className={cn(
                        "flex min-h-11 gap-3 items-center py-3 transition-colors duration-120 -mx-3 px-3 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {summary}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
                        {fmtDate(c.scheduledAt)}
                      </span>
                    </Link>
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
            actionHref={clinicalEditHref}
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

        {/* Latest prescription — span-8 */}
        <OverviewCard className="col-span-12 min-[1100px]:col-span-8 min-w-0">
          <SectionHead
            title="Latest prescription"
            count={`${prescriptions.length} total`}
            actionLabel="View prescriptions"
            actionHref={patientTabHref(patientId, "prescriptions")}
          />
          {loadingRx ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !latestPrescription ? (
            <p className="text-[13px] text-muted-foreground py-4">
              No prescriptions on record
            </p>
          ) : (
            <Link
              href={patientTabHref(patientId, "prescriptions", {
                selected: latestPrescription.id,
              })}
              scroll={false}
              aria-label={`Open prescription ${formatPrescriptionReference(latestPrescription)}`}
              className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg py-3 text-left transition-colors duration-120 hover:bg-muted -mx-3 px-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {formatPrescriptionReference(latestPrescription)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Issued {fmtDate(latestPrescription.issuedAt)} ·{" "}
                  {latestPrescription.medications.length} item
                  {latestPrescription.medications.length === 1 ? "" : "s"}
                </p>
              </div>
              <StatusBadge status={latestPrescription.status} />
              <span className="font-mono text-[11px] text-muted-foreground tracking-[0.02em]">
                {latestPrescription.id.slice(-6).toUpperCase()}
              </span>
            </Link>
          )}
        </OverviewCard>

        {/* Right column stack: Demographics + Care team — span-4 */}
        <div className="col-span-12 min-[1100px]:col-span-4 min-w-0 flex flex-col gap-6">
          {/* Demographics */}
          <OverviewCard>
            <SectionHead
              title="Demographics"
              actionLabel="Edit"
              onAction={() => setEditPatientOpen(true)}
            />
            <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              <dt className="text-muted-foreground">DOB</dt>
              <dd className="font-medium min-w-0 wrap-break-word">
                {(() => {
                  const dob = formatDobWithAge(patient?.dateOfBirth ?? null);
                  if (!dob) return "—";
                  return (
                    <>
                      {dob.date}{" "}
                      <span className="font-normal text-muted-foreground">
                        {dob.age}
                      </span>
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
                {patient?.originalEmail ?? "—"}
              </dd>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium">
                {[patient?.city, patient?.state].filter(Boolean).join(", ") || "—"}
              </dd>
              <dt className="text-muted-foreground">Medicare</dt>
              <dd className="font-mono text-xs font-normal tracking-[0.01em]">
                {formatMedicare(
                  patient?.medicareNumber ?? null,
                  patient?.medicareIrn ?? null
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
                      <p className="text-xs text-muted-foreground mt-px">
                        {member.role}
                      </p>
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
            actionHref={patientTabHref(patientId, "notes", { action: "new" })}
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
            <div className="flex flex-col">
              {recentNotes.map((n, i) => {
                const noteText = htmlToPlainText(n.content) || n.title;

                return (
                  <div key={n.id}>
                    {i > 0 && <div className="h-px bg-border" />}
                    <Link
                      href={patientTabHref(patientId, "notes", { selected: n.id })}
                      scroll={false}
                      aria-label={`Open note ${n.title}`}
                      className={cn(
                        "block min-h-11 rounded-lg py-4 transition-colors duration-120 -mx-3 px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        i === 0 && "pt-0"
                      )}
                    >
                      <p className="text-sm leading-[1.6] text-foreground whitespace-pre-line">
                        {noteText}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {n.authorName} · {fmtDate(n.createdAt)}
                      </p>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </OverviewCard>
      </div>
      <PatientEditSheet
        patient={patient}
        open={editPatientOpen}
        onOpenChange={setEditPatientOpen}
      />
    </>
  );
}
