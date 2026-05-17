import { Leaf, Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPrescriptionSourceLabel } from "@/lib/prescriptions";
import type { PrescriptionSource } from "@/types";

/**
 * Source badge for a prescription row.
 *
 * - `parchment` → green leaf badge (mirrored from Parchment)
 * - `internal`  → accent pill badge (authored in the CRM by a doctor)
 */
export function PrescriptionSourceBadge({ source }: { source: PrescriptionSource }) {
  const isInternal = source === "internal";
  return (
    <Badge
      variant="outline"
      className={
        isInternal
          ? "gap-1 border-status-accent-border bg-status-accent-bg text-status-accent-fg"
          : "gap-1 border-status-success-border bg-status-success-bg text-status-success-fg"
      }
    >
      {isInternal ? (
        <Pill className="size-3" aria-hidden="true" />
      ) : (
        <Leaf className="size-3" aria-hidden="true" />
      )}
      {getPrescriptionSourceLabel(source)}
    </Badge>
  );
}
