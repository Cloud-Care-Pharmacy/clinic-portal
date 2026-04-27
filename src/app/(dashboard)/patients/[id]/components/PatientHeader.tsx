"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  Zap,
  ChevronDown,
  CalendarPlus,
  Pill,
  StickyNote,
  Upload,
  Pencil,
  Flag,
  Trash2,
  Copy,
  ListTodo,
} from "lucide-react";
import type { PatientMapping } from "@/types";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { NewTaskSheet } from "@/components/tasks/NewTaskSheet";
import { PatientEditSheet } from "@/components/patients/ProfileTab";
import { ExpandableIconButton } from "@/components/shared/ExpandableIconButton";
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
import { useDeletePatient } from "@/lib/hooks/use-patients";
import { PatientStatStrip } from "./PatientStatStrip";
import type { PatientShellInitialData } from "../patient-shell-data";

interface PatientHeaderProps {
  patient: PatientMapping | undefined;
  displayName: string;
  statData?: PatientShellInitialData;
}

function sameHeaderPatient(
  previous: PatientMapping | undefined,
  next: PatientMapping | undefined
) {
  if (previous === next) return true;
  if (!previous || !next) return false;

  return (
    previous.id === next.id &&
    previous.firstName === next.firstName &&
    previous.lastName === next.lastName &&
    previous.originalEmail === next.originalEmail &&
    previous.dateOfBirth === next.dateOfBirth &&
    previous.gender === next.gender &&
    previous.halaxyPatientId === next.halaxyPatientId &&
    previous.city === next.city &&
    previous.state === next.state &&
    previous.mobile === next.mobile &&
    previous.createdAt === next.createdAt
  );
}

function getAge(dob: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age}y`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("PMS ID copied");
}

export const PatientHeader = memo(
  function PatientHeader({ patient, displayName, statData }: PatientHeaderProps) {
    const router = useRouter();
    const [consultationOpen, setConsultationOpen] = useState(false);
    const [newTaskOpen, setNewTaskOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const deleteMutation = useDeletePatient();
    const age = getAge(patient?.dateOfBirth ?? null);
    const gender = patient?.gender ?? "";
    const ageGender = [age, gender].filter(Boolean).join(" · ");
    const pmsId = patient?.halaxyPatientId ?? "";
    const patientId = patient?.id;
    const actionsDisabled = !patientId;

    const locationParts = [patient?.city, patient?.state].filter(Boolean);
    const locationText =
      locationParts.length > 0 ? locationParts.join(", ") : "Not available";

    function navigateTo(segment: string, action?: string) {
      if (!patientId) return;
      const query = action ? `?action=${encodeURIComponent(action)}` : "";
      router.push(`/patients/${encodeURIComponent(patientId)}/${segment}${query}`, {
        scroll: false,
      });
    }

    return (
      <>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          {/* Identity row */}
          <div className="flex items-start gap-4">
            {/* Avatar — 56×56 */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary text-lg font-semibold">
              {patient?.firstName ? (
                (
                  patient.firstName.charAt(0) + (patient.lastName?.charAt(0) ?? "")
                ).toUpperCase()
              ) : patient?.originalEmail ? (
                patient.originalEmail.charAt(0).toUpperCase()
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>

            {/* Identity + meta */}
            <div className="flex flex-1 min-w-0 flex-col gap-1">
              {/* Name row — name/age left, PMS ID + Actions right */}
              <div className="flex flex-wrap items-start gap-x-2.5 gap-y-1">
                <h2 className="text-[22px] font-semibold leading-none tracking-[-0.01em]">
                  {displayName}
                </h2>

                {ageGender && (
                  <span className="pt-1 text-sm leading-none text-muted-foreground">
                    {ageGender}
                  </span>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* PMS ID pill — top right */}
                {pmsId && (
                  <button
                    onClick={() => copyToClipboard(pmsId)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-muted px-3 font-mono text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    #{pmsId}
                    <Copy className="size-3.5 text-muted-foreground" />
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <ExpandableIconButton
                    icon={<Mail className="size-4" />}
                    label={patient?.originalEmail ?? "No email"}
                    ariaLabel={`Email: ${patient?.originalEmail ?? "No email"}`}
                    disabled={!patient?.originalEmail}
                    expandDirection="left"
                  />
                  <ExpandableIconButton
                    icon={<Phone className="size-4" />}
                    label={patient?.mobile ?? "No phone"}
                    ariaLabel={`Phone: ${patient?.mobile ?? "No phone"}`}
                    disabled={!patient?.mobile}
                    expandDirection="left"
                  />
                </div>

                {/* Actions dropdown — top right */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="sm"
                        className="h-9 gap-2 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        <Zap className="size-3.5" />
                        Actions
                        <ChevronDown className="size-3.5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-55">
                    <DropdownMenuItem
                      disabled={actionsDisabled}
                      onClick={() => setConsultationOpen(true)}
                    >
                      <CalendarPlus className="mr-2 size-4" />
                      New consultation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={actionsDisabled}
                      onClick={() => navigateTo("prescriptions")}
                    >
                      <Pill className="mr-2 size-4" />
                      New prescription
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={actionsDisabled}
                      onClick={() => navigateTo("notes", "new")}
                    >
                      <StickyNote className="mr-2 size-4" />
                      Add note
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={actionsDisabled}
                      onClick={() => setNewTaskOpen(true)}
                    >
                      <ListTodo className="mr-2 size-4" />
                      New task
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={actionsDisabled}
                      onClick={() => navigateTo("documents", "upload")}
                    >
                      <Upload className="mr-2 size-4" />
                      Upload document
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={actionsDisabled}
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit patient details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={actionsDisabled}
                      onClick={() => navigateTo("clinical")}
                    >
                      <Flag className="mr-2 size-4" />
                      Flag for review
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={actionsDisabled}
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete patient
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Meta row — location and patient tenure */}
              <div className="-mt-2 flex flex-wrap items-center gap-4 text-[13px] leading-none text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {locationText}
                </span>
                {patient?.createdAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Patient since{" "}
                    {new Date(patient.createdAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stat strip — separated by border-top */}
          <PatientStatStrip patientId={patient?.id} statData={statData} />
        </div>

        <NewConsultationSheet
          open={consultationOpen}
          onOpenChange={setConsultationOpen}
          defaultPatientId={patientId}
          defaultPatientName={displayName === "Loading…" ? "" : displayName}
        />

        <NewTaskSheet
          open={newTaskOpen}
          onOpenChange={setNewTaskOpen}
          defaultPatientId={patientId}
          defaultPatientName={displayName === "Loading…" ? "" : displayName}
        />

        <PatientEditSheet
          patient={patient}
          open={editOpen}
          onOpenChange={setEditOpen}
        />

        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!deleteMutation.isPending) setDeleteOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete patient?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {displayName} and all related records
                (consultations, notes, documents, prescriptions). This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteMutation.isPending || !patientId}
                onClick={(e) => {
                  e.preventDefault();
                  if (!patientId) return;
                  deleteMutation.mutate(patientId, {
                    onSuccess: () => {
                      toast.success("Patient deleted");
                      setDeleteOpen(false);
                      router.push("/patients");
                    },
                    onError: (err) => {
                      toast.error(
                        err instanceof Error ? err.message : "Failed to delete patient"
                      );
                    },
                  });
                }}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  },
  (previous, next) =>
    previous.displayName === next.displayName &&
    sameHeaderPatient(previous.patient, next.patient)
);
