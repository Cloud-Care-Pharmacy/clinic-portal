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
import { SimpleEditor } from "@/components/shared/SimpleEditor";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppSheet } from "@/components/shared/AppSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useUpdateConsultation } from "@/lib/hooks/use-consultations";
import type { Consultation, ConsultationType } from "@/types";

const TYPE_COLORS: Record<ConsultationType, string> = {
  initial: "bg-status-info-bg text-status-info-fg border-status-info-border",
  "follow-up": "bg-status-accent-bg text-status-accent-fg border-status-accent-border",
  renewal: "bg-status-success-bg text-status-success-fg border-status-success-border",
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
    <AppSheet
      open={!!consultation}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Consultation Details"
      description={`${consultation.patientName} — ${consultation.type} consultation`}
      footer={
        isScheduled ? (
          <>
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
              No-show
            </Button>
            <Button
              onClick={handleComplete}
              disabled={updateConsultation.isPending}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {showOutcomeInput
                ? updateConsultation.isPending
                  ? "Saving…"
                  : "Confirm complete"
                : "Complete"}
            </Button>
          </>
        ) : undefined
      }
    >
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
            <div
              className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
              dangerouslySetInnerHTML={{ __html: consultation.notes }}
            />
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
            <div
              className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
              dangerouslySetInnerHTML={{ __html: consultation.outcome }}
            />
          </DetailRow>
        )}

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
    </AppSheet>
  );
}
