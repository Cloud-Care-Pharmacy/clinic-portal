import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "active"
  | "pending"
  | "flagged"
  | "expired"
  | "inactive"
  | "received"
  | "processed"
  | "failed"
  | "uploaded"
  | "verified"
  | "rejected"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no-show";

const statusStyles: Record<StatusType, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  flagged: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-red-100 text-red-800 border-red-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
  received: "bg-blue-100 text-blue-800 border-blue-200",
  processed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  uploaded: "bg-blue-100 text-blue-800 border-blue-200",
  verified: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  "no-show": "bg-red-100 text-red-800 border-red-200",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status as StatusType] ?? statusStyles.inactive;
  return (
    <Badge
      variant="outline"
      className={cn("capitalize font-medium text-xs", style, className)}
    >
      {status}
    </Badge>
  );
}
