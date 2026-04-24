"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useUpdateConsultation } from "@/lib/hooks/use-consultations";
import type { Consultation, ConsultationType } from "@/types";

const TYPE_COLORS: Record<ConsultationType, string> = {
  initial: "bg-blue-100 text-blue-800 border-blue-200",
  "follow-up": "bg-purple-100 text-purple-800 border-purple-200",
  renewal: "bg-green-100 text-green-800 border-green-200",
};

interface ConsultationDetailSheetProps {
  consultation: Consultation | null;
  onClose: () => void;
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
  consultation,
  onClose,
}: ConsultationDetailSheetProps) {
  const updateConsultation = useUpdateConsultation();
  const [outcomeText, setOutcomeText] = useState("");
  const [showOutcomeInput, setShowOutcomeInput] = useState(false);

  if (!consultation) return null;

  const isScheduled = consultation.status === "scheduled";

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

  return (
    <Sheet open={!!consultation} onOpenChange={() => onClose()}>
      <SheetContent className="flex flex-col w-full sm:max-w-[33vw] sm:min-w-[400px]">
        <SheetHeader>
          <SheetTitle>Consultation Details</SheetTitle>
          <SheetDescription>
            {consultation.patientName} — {consultation.type} consultation
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex flex-1 flex-col gap-5 p-4 overflow-y-auto">
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
            {consultation.patientName}
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
              {consultation.notes}
            </DetailRow>
          )}

          {consultation.completedAt && (
            <DetailRow icon={<CheckCircle2 className="h-4 w-4" />} label="Completed At">
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
              {consultation.outcome}
            </DetailRow>
          )}

          {/* Actions for scheduled consultations */}
          {isScheduled && (
            <>
              <Separator />

              {showOutcomeInput && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Outcome / Summary</p>
                  <Textarea
                    value={outcomeText}
                    onChange={(e) => setOutcomeText(e.target.value)}
                    placeholder="Enter consultation outcome…"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleComplete}
                  disabled={updateConsultation.isPending}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {showOutcomeInput
                    ? updateConsultation.isPending
                      ? "Saving…"
                      : "Confirm Complete"
                    : "Complete"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={updateConsultation.isPending}
                  className="gap-1.5"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("no-show")}
                  disabled={updateConsultation.isPending}
                  className="gap-1.5"
                >
                  <AlertTriangle className="h-4 w-4" />
                  No-Show
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
