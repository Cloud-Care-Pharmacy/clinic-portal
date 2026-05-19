"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/shared/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useCreatePractitionerLeave,
  useDeletePractitionerLeave,
  usePractitionerLeave,
} from "@/lib/hooks/use-practitioner-leave";
import type { PractitionerLeave, PractitionerLeaveKind } from "@/types";

interface LeaveSectionProps {
  /** `users.id` of the current practitioner. Section is disabled when absent. */
  practitionerId: string | null;
}

const KIND_OPTIONS: ReadonlyArray<{ value: PractitionerLeaveKind; label: string }> = [
  { value: "annual", label: "Annual leave" },
  { value: "sick", label: "Sick leave" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

const KIND_LABEL: Record<PractitionerLeaveKind, string> = {
  annual: "Annual",
  sick: "Sick",
  personal: "Personal",
  other: "Other",
};

const KIND_VARIANT: Record<
  PractitionerLeaveKind,
  "info" | "danger" | "accent" | "neutral"
> = {
  annual: "info",
  sick: "danger",
  personal: "accent",
  other: "neutral",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addYearsIso(iso: string, years: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

const DATE_FMT = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const SHORT_DATE_FMT = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
});

function formatRange(start: string, end: string): string {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  if (start === end) return DATE_FMT.format(a);
  // Same year → omit year on the start date.
  if (a.getFullYear() === b.getFullYear()) {
    return `${SHORT_DATE_FMT.format(a)} – ${DATE_FMT.format(b)}`;
  }
  return `${DATE_FMT.format(a)} – ${DATE_FMT.format(b)}`;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

export function LeaveSection({ practitionerId }: LeaveSectionProps) {
  const today = useMemo(() => todayIso(), []);
  const to = useMemo(() => addYearsIso(today, 1), [today]);

  const leaveQuery = usePractitionerLeave(
    practitionerId ? { from: today, to, practitionerId } : undefined,
    Boolean(practitionerId)
  );

  const entries = useMemo(() => {
    const list = leaveQuery.data?.data?.leave ?? [];
    return list.toSorted((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leaveQuery.data]);

  if (!practitionerId) {
    return (
      <p className="text-sm text-muted-foreground">
        Save your prescriber details first to record leave.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {entries.length === 0
            ? "No upcoming leave scheduled."
            : `${entries.length} upcoming leave period${entries.length === 1 ? "" : "s"}.`}
        </p>
        <AddLeaveDialog practitionerId={practitionerId} today={today} />
      </div>

      {leaveQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="size-4 animate-spin" />
          Loading leave…
        </div>
      ) : leaveQuery.isError ? (
        <p className="text-sm text-destructive">
          {(leaveQuery.error as Error).message}
        </p>
      ) : entries.length > 0 ? (
        <ul className="divide-y rounded-xl border bg-card">
          {entries.map((leave) => (
            <LeaveRow key={leave.id} leave={leave} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row + delete confirm
// ---------------------------------------------------------------------------

function LeaveRow({ leave }: { leave: PractitionerLeave }) {
  const del = useDeletePractitionerLeave();

  function handleDelete() {
    del.mutate(leave.id, {
      onSuccess: () => toast.success("Leave removed"),
      onError: (err) => toast.error(err.message),
    });
  }

  const days = daysBetween(leave.startDate, leave.endDate);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <CalendarDays className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">
            {formatRange(leave.startDate, leave.endDate)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            · {days} day{days === 1 ? "" : "s"}
          </span>
          <StatusBadge variant={KIND_VARIANT[leave.kind]} dot>
            {KIND_LABEL[leave.kind]}
          </StatusBadge>
        </div>
        {leave.note ? (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {leave.note}
          </p>
        ) : null}
      </div>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={del.isPending}
              aria-label="Remove leave"
            />
          }
        >
          {del.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this leave period?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatRange(leave.startDate, leave.endDate)} (
              {KIND_LABEL[leave.kind].toLowerCase()}) will be deleted. Patients will be
              able to book consultations in this window again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Add leave dialog
// ---------------------------------------------------------------------------

interface AddLeaveDialogProps {
  practitionerId: string;
  today: string;
}

function AddLeaveDialog({ practitionerId, today }: AddLeaveDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [kind, setKind] = useState<PractitionerLeaveKind>("annual");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useCreatePractitionerLeave();

  function reset() {
    setStartDate(today);
    setEndDate(today);
    setKind("annual");
    setNote("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit() {
    setError(null);
    if (!startDate || !endDate) {
      setError("Pick a start and end date.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    create.mutate(
      {
        practitionerId,
        startDate,
        endDate,
        kind,
        note: note.trim() ? note.trim() : null,
      },
      {
        onSuccess: () => {
          toast.success("Leave added");
          setOpen(false);
          reset();
        },
        onError: (err) => setError(err.message),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="border-dashed">
            <Plus className="mr-2 size-4" />
            Add leave period
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add leave period</DialogTitle>
          <DialogDescription>
            Block out whole-day windows when you&apos;re unavailable for consultations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leaveStart">Start date</Label>
              <DatePicker
                id="leaveStart"
                value={startDate}
                min={today}
                onChange={setStartDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaveEnd">End date</Label>
              <DatePicker
                id="leaveEnd"
                value={endDate}
                min={startDate || today}
                onChange={setEndDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaveKind">Type</Label>
            <Select
              value={kind}
              onValueChange={(value) => {
                if (value) setKind(value as PractitionerLeaveKind);
              }}
            >
              <SelectTrigger id="leaveKind" className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaveNote">Note (optional)</Label>
            <Textarea
              id="leaveNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Visible to admins on the roster."
              rows={3}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Add leave"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
