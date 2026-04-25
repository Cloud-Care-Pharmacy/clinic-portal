"use client";

import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpandableIconButton } from "@/components/shared/ExpandableIconButton";
import {
  Mail,
  Phone,
  MapPin,
  User,
  Copy,
  Sparkles,
  ChevronDown,
  CalendarPlus,
  Pill,
  StickyNote,
  Upload,
  Pencil,
  Flag,
  Archive,
} from "lucide-react";
import type { PatientMapping } from "@/types";
import type { RedFlagResult } from "@/components/patients/red-flag-utils";
import { PatientStatStrip } from "./PatientStatStrip";

interface PatientHeaderProps {
  patient: PatientMapping | undefined;
  displayName: string;
  redFlags: RedFlagResult | null;
  isLoading: boolean;
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

export function PatientHeader({
  patient,
  displayName,
  redFlags,
  isLoading,
}: PatientHeaderProps) {
  const age = getAge(patient?.date_of_birth ?? null);
  const gender = patient?.gender ?? "";
  const ageGender = [age, gender].filter(Boolean).join(" · ");
  const pmsId = patient?.halaxy_patient_id ?? "";

  const locationParts = [patient?.city, patient?.state].filter(Boolean);
  const locationText =
    locationParts.length > 0 ? locationParts.join(", ") : "Not available";

  return (
    <Card>
      <CardContent className="px-6 py-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: Avatar · Name · Age/Gender · contact chips · PMS-ID · Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-semibold">
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

            {/* Name */}
            <h2 className="text-lg font-semibold leading-tight">{displayName}</h2>

            {/* Age · Gender */}
            {ageGender && (
              <span className="text-[13px] text-muted-foreground">{ageGender}</span>
            )}

            {/* Email chip */}
            <ExpandableIconButton
              icon={<Mail className="size-4" />}
              label={patient?.original_email ?? ""}
              ariaLabel={`Email: ${patient?.original_email ?? "Not available"}`}
              disabled={!patient?.original_email}
            />

            {/* Phone chip */}
            <ExpandableIconButton
              icon={<Phone className="size-4" />}
              label={patient?.mobile ?? "Not available"}
              ariaLabel={`Phone: ${patient?.mobile ?? "Not available"}`}
              disabled={!patient?.mobile}
            />

            {/* Spacer */}
            <div className="flex-1" />

            {/* PMS ID pill */}
            {pmsId && (
              <button
                onClick={() => copyToClipboard(pmsId)}
                className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 h-8 font-mono text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <span className="text-muted-foreground/60">#</span>
                {pmsId}
                <Copy className="size-3.5" />
              </button>
            )}

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Sparkles className="size-3.5" />
                    Actions
                    <ChevronDown className="size-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
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
                <DropdownMenuItem>
                  <Archive className="mr-2 size-4" />
                  Archive patient
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Row 2: Location · Patient since */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {locationText}
            </span>
            {patient?.created_at && (
              <span className="text-xs">
                Patient since{" "}
                {new Date(patient.created_at).toLocaleDateString("en-AU", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Row 3: Stat strip */}
          <PatientStatStrip patientId={patient?.id} />
        </div>
      </CardContent>
    </Card>
  );
}
