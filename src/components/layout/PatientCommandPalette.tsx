"use client";

import {
  ArrowRight,
  CalendarDays,
  Loader2,
  Mail,
  Phone,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePatientSearch } from "@/lib/hooks/use-patients";
import { cn } from "@/lib/utils";
import type { PatientSearchResult } from "@/types";

const SEARCH_LIMIT = 8;
const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

interface PatientCommandPaletteProps {
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getPatientName(patient: PatientSearchResult) {
  return patient.displayName;
}

function getPatientLabel(patient: PatientSearchResult) {
  return (
    getPatientName(patient) ||
    patient.originalEmail ||
    patient.generatedEmail ||
    "Patient"
  );
}

function formatDateOfBirth(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const match = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(dateOfBirth);

  if (Number.isNaN(date.getTime())) return dateOfBirth;
  return dateFormatter.format(date);
}

function patientDetails(patient: PatientSearchResult) {
  const formattedDob = formatDateOfBirth(patient.dateOfBirth);

  return [
    patient.originalEmail || patient.generatedEmail
      ? {
          icon: Mail,
          label: patient.originalEmail || patient.generatedEmail || "",
        }
      : null,
    patient.mobile ? { icon: Phone, label: patient.mobile } : null,
    formattedDob ? { icon: CalendarDays, label: `DOB ${formattedDob}` } : null,
  ].filter(Boolean) as { icon: LucideIcon; label: string }[];
}

function patientIdentifier(patient: PatientSearchResult) {
  if (patient.halaxyPatientId) return `PMS ${patient.halaxyPatientId}`;
  if (patient.pbsPatientId) return `PBS ${patient.pbsPatientId}`;
  return "PMS pending";
}

export function PatientCommandPalette({
  entityId,
  open,
  onOpenChange,
}: PatientCommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const currentQuery = query.trim();
  const trimmedQuery = useDeferredValue(currentQuery);
  const isSettlingQuery = currentQuery !== trimmedQuery;
  const canSearch = open && Boolean(entityId) && trimmedQuery.length > 0;
  const search = usePatientSearch(canSearch ? entityId : undefined, {
    q: trimmedQuery,
    limit: SEARCH_LIMIT,
  });
  const patients = search.data?.data?.patients ?? [];
  const hasQuery = currentQuery.length > 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const resultTitle = useMemo(() => {
    if (!hasQuery) return "Search patients";
    if (isSettlingQuery || search.isFetching) return "Searching patients";
    if (patients.length === 1) return "1 patient found";
    return `${patients.length} patients found`;
  }, [hasQuery, isSettlingQuery, patients.length, search.isFetching]);

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) setQuery("");
    onOpenChange(nextOpen);
  }

  function handleSelect(patient: PatientSearchResult) {
    setQuery("");
    onOpenChange(false);
    router.push(`/patients/${encodeURIComponent(patient.id)}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[15%] max-h-[min(680px,calc(100vh-2rem))] translate-y-0 gap-0 overflow-hidden rounded-2xl border border-border bg-popover p-0 shadow-2xl sm:max-w-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Patient search</DialogTitle>
          <DialogDescription>
            Search patients by name, email, or phone number.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3 focus-within:ring-3 focus-within:ring-ring/20">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patients by name, email, or phone…"
            aria-label="Search patients by name, email, or phone"
            className="h-11 border-0 px-0 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 md:text-base"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground sm:inline-flex">
            Esc
          </kbd>
        </div>

        <div className="max-h-130 overflow-y-auto p-2">
          <div className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">
            {resultTitle}
          </div>

          {!entityId ? (
            <CommandMessage
              icon={<User className="size-5" />}
              title="Patient search is unavailable"
              body="No default pharmacy entity is configured for patient lookup."
            />
          ) : !hasQuery ? (
            <CommandMessage
              icon={<Search className="size-5" />}
              title="Start typing to search patients"
              body="Search by patient name, email address, or phone number."
            />
          ) : isSettlingQuery || search.isFetching ? (
            <CommandMessage
              icon={<Loader2 className="size-5 animate-spin" />}
              title="Searching patients…"
              body="Matching patients by name, email, and phone number."
            />
          ) : search.isError ? (
            <CommandMessage
              icon={<Search className="size-5" />}
              title="Could not search patients"
              body={search.error.message || "Try again in a moment."}
            />
          ) : patients.length === 0 ? (
            <CommandMessage
              icon={<Search className="size-5" />}
              title="No patients found"
              body="Try a different name, email address, or phone number."
            />
          ) : (
            <div className="space-y-1">
              {patients.map((patient) => (
                <PatientResult
                  key={patient.id}
                  patient={patient}
                  onSelect={() => handleSelect(patient)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommandMessage({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-background text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function PatientResult({
  patient,
  onSelect,
}: {
  patient: PatientSearchResult;
  onSelect: () => void;
}) {
  const label = getPatientLabel(patient);
  const details = patientDetails(patient);
  const detailTitle = [
    ...details.map((detail) => detail.label),
    patientIdentifier(patient),
  ].join(" · ");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Open patient profile for ${label}`}
      className={cn(
        "group flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-background">
        <User className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-sm font-medium text-foreground"
          title={label}
        >
          {label}
        </span>
        <span
          className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
          title={detailTitle}
        >
          {details.map((detail) => {
            const Icon = detail.icon;
            return (
              <span
                key={detail.label}
                className="inline-flex min-w-0 items-center gap-1"
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{detail.label}</span>
              </span>
            );
          })}
          <span className="inline-flex min-w-0 items-center gap-1">
            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span className="truncate">{patientIdentifier(patient)}</span>
          </span>
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
