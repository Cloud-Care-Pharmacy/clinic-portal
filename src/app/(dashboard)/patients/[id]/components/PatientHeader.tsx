"use client";

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
  Archive,
  Copy,
} from "lucide-react";
import type { PatientMapping } from "@/types";
import { PatientStatStrip } from "./PatientStatStrip";

interface PatientHeaderProps {
  patient: PatientMapping | undefined;
  displayName: string;
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

export function PatientHeader({ patient, displayName }: PatientHeaderProps) {
  const age = getAge(patient?.date_of_birth ?? null);
  const gender = patient?.gender ?? "";
  const ageGender = [age, gender].filter(Boolean).join(" · ");
  const pmsId = patient?.halaxy_patient_id ?? "";

  const locationParts = [patient?.city, patient?.state].filter(Boolean);
  const locationText =
    locationParts.length > 0 ? locationParts.join(", ") : "Not available";

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      {/* Identity row */}
      <div className="flex items-start gap-4">
        {/* Avatar — 56×56 */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary text-lg font-semibold">
          {patient?.first_name ? (
            (
              patient.first_name.charAt(0) + (patient.last_name?.charAt(0) ?? "")
            ).toUpperCase()
          ) : patient?.original_email ? (
            patient.original_email.charAt(0).toUpperCase()
          ) : (
            <User className="h-5 w-5" />
          )}
        </div>

        {/* Identity + meta */}
        <div className="flex-1 min-w-0">
          {/* Name row — name/age left, PMS ID + Actions right */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.01em]">
              {displayName}
            </h2>

            {ageGender && (
              <span className="text-sm text-muted-foreground">{ageGender}</span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* PMS ID pill — top right */}
            {pmsId && (
              <button
                onClick={() => copyToClipboard(pmsId)}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                #{pmsId}
                <Copy className="size-3.5 text-muted-foreground" />
              </button>
            )}

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
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem>
                  <CalendarPlus className="mr-2 size-4" />
                  New consultation
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pill className="mr-2 size-4" />
                  New prescription
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <StickyNote className="mr-2 size-4" />
                  Add note
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Upload className="mr-2 size-4" />
                  Upload document
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Pencil className="mr-2 size-4" />
                  Edit patient details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flag className="mr-2 size-4" />
                  Flag for review
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Archive className="mr-2 size-4" />
                  Archive patient
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meta row — all contact/location info as inline text */}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-[13px] text-muted-foreground">
            {patient?.original_email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {patient.original_email}
              </span>
            )}
            {patient?.mobile && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" />
                {patient.mobile}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {locationText}
            </span>
            {patient?.created_at && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Patient since{" "}
                {new Date(patient.created_at).toLocaleDateString("en-AU", {
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
      <PatientStatStrip patientId={patient?.id} />
    </div>
  );
}
