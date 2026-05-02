"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Stethoscope,
  CalendarDays,
  FileText,
  Pencil,
  Trash2,
  Pill,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleEditor } from "@/components/shared/SimpleEditor";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppSheet } from "@/components/shared/AppSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useUpdateConsultation,
  useDeleteConsultation,
} from "@/lib/hooks/use-consultations";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { formatPrescriptionDate } from "@/lib/prescriptions";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import type { Consultation, ConsultationType } from "@/types";

const TYPE_COLORS: Record<ConsultationType, string> = {
  initial: "bg-status-info-bg text-status-info-fg border-status-info-border",
  "follow-up": "bg-status-accent-bg text-status-accent-fg border-status-accent-border",
  renewal: "bg-status-success-bg text-status-success-fg border-status-success-border",
};

interface ConsultationDetailSheetProps {
  consultation: Consultation | null;
  onClose: () => void;
  onEdit?: (consultation: Consultation) => void;
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export function ConsultationDetailSheet({
  consultation: input,
  onClose,
  onEdit,
}: ConsultationDetailSheetProps) {
  const updateConsultation = useUpdateConsultation();
  const deleteConsultation = useDeleteConsultation();
  const [outcomeText, setOutcomeText] = useState("");
  const [showOutcomeInput, setShowOutcomeInput] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const consultation = useLastDefined(input);
  const prescriptionsQuery = usePrescriptions(consultation?.patientId);
  const recentPrescriptions =
    prescriptionsQuery.data?.data.prescriptions.slice(0, 5) ?? [];

  const isScheduled = consultation?.status === "scheduled";

  function handleComplete() {
    if (!showOutcomeInput) {
      setShowOutcomeInput(true);
      return;
    }

    updateConsultation.mutate(
      {
        id: consultation!.id,
        status: "completed",
        outcome: outcomeText || undefined,
        completedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Consultation completed");
          setOutcomeText("");
          setShowOutcomeInput(false);
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleStatusChange(status: "cancelled" | "no-show") {
    updateConsultation.mutate(
      { id: consultation!.id, status },
      {
        onSuccess: () => {
          toast.success(
            `Consultation marked as ${status === "no-show" ? "no-show" : "cancelled"}`
          );
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleDelete() {
    if (!consultation) return;
    deleteConsultation.mutate(consultation.id, {
      onSuccess: () => {
        toast.success("Consultation deleted");
        setDeleteOpen(false);
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  const isPending = updateConsultation.isPending || deleteConsultation.isPending;

  const footerActions = consultation ? (
    <div className="flex w-full items-center justify-between gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          disabled={isPending}
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(consultation)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {isScheduled && (
            <>
              <DropdownMenuItem onClick={() => handleStatusChange("no-show")}>
                <AlertTriangle className="h-4 w-4" />
                Mark as no-show
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("cancelled")}>
                <XCircle className="h-4 w-4" />
                Cancel consultation
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isScheduled ? (
        <Button onClick={handleComplete} disabled={isPending} className="gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          {showOutcomeInput
            ? updateConsultation.isPending
              ? "Saving…"
              : "Confirm complete"
            : "Mark completed"}
        </Button>
      ) : onEdit ? (
        <Button
          variant="outline"
          onClick={() => onEdit(consultation)}
          disabled={isPending}
          className="gap-1.5"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      ) : null}
    </div>
  ) : undefined;

  return (
    <>
      <AppSheet
        open={!!input}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Consultation Details"
        description={
          consultation
            ? `${consultation.patientName} — ${consultation.type} consultation`
            : ""
        }
        footer={footerActions}
      >
        {consultation ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <StatusBadge status={consultation.status} />
              <Badge
                variant="outline"
                className={`capitalize text-xs ${TYPE_COLORS[consultation.type]}`}
              >
                {consultation.type}
              </Badge>
            </div>

            <DetailRow icon={<User className="h-4 w-4" />} label="Patient">
              <Link
                href={`/patients/${consultation.patientId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {consultation.patientName}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </DetailRow>

            <DetailRow icon={<Stethoscope className="h-4 w-4" />} label="Doctor">
              {consultation.doctorName}
            </DetailRow>

            <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Scheduled">
              {new Date(consultation.scheduledAt).toLocaleString("en-AU", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </DetailRow>

            {consultation.duration && (
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Duration">
                {consultation.duration} minutes
              </DetailRow>
            )}

            {consultation.notes && (
              <DetailRow icon={<FileText className="h-4 w-4" />} label="Notes">
                <div
                  className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
                  dangerouslySetInnerHTML={{ __html: consultation.notes }}
                />
              </DetailRow>
            )}

            {consultation.completedAt && (
              <DetailRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Completed At"
              >
                {new Date(consultation.completedAt).toLocaleString("en-AU", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DetailRow>
            )}

            {consultation.outcome && (
              <DetailRow icon={<CheckCircle2 className="h-4 w-4" />} label="Outcome">
                <div
                  className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
                  dangerouslySetInnerHTML={{ __html: consultation.outcome }}
                />
              </DetailRow>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Recent prescriptions</p>
                </div>
                <Link
                  href={`/patients/${consultation.patientId}/prescriptions`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View all
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              {prescriptionsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : recentPrescriptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No prescriptions on record for this patient.
                </p>
              ) : (
                <ul className="space-y-1 rounded-md border bg-muted/30 p-2 text-sm">
                  {recentPrescriptions.map((rx) => (
                    <li key={rx.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="font-medium">
                          {formatPrescriptionDate(rx.prescriptionDate)}
                        </span>
                        {rx.prescriberName && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {rx.prescriberName}
                          </span>
                        )}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {rx.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions for scheduled consultations */}
            {isScheduled && (
              <>
                <Separator />

                {showOutcomeInput && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Outcome / Summary</p>
                    <SimpleEditor
                      content={outcomeText}
                      onChange={setOutcomeText}
                      placeholder="Enter consultation outcome…"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </AppSheet>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleteConsultation.isPending) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this consultation record. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConsultation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConsultation.isPending || !consultation}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleteConsultation.isPending ? "Deleting…" : "Delete consultation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
