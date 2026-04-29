import type { Task, TaskPriority, TaskStatus, TaskType } from "@/types";

const TASK_TIME_REFERENCE_MS = Date.now();

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  review_intake: "Review intake",
  schedule_consultation: "Schedule consultation",
  verify_identity: "Verify identity",
  request_missing_information: "Request missing information",
  clinical_follow_up: "Clinical follow-up",
  manual: "Manual",
};

export const TASK_STATUS_VARIANTS: Record<
  TaskStatus,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  open: "warning",
  in_progress: "info",
  completed: "success",
  cancelled: "neutral",
};

export const TASK_PRIORITY_VARIANTS: Record<
  TaskPriority,
  "warning" | "danger" | "info" | "neutral"
> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

export function formatTaskDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTaskDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isTaskOverdue(value?: string | null) {
  return Boolean(value && new Date(value).getTime() < TASK_TIME_REFERENCE_MS);
}

export function formatTaskDueRelative(value?: string | null, status?: TaskStatus) {
  if (!value) return "No due date";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";

  const diff = new Date(value).getTime() - TASK_TIME_REFERENCE_MS;
  const absoluteDiff = Math.abs(diff);
  const isPast = diff < 0;
  const minutes = Math.max(1, Math.round(absoluteDiff / 60_000));
  const hours = Math.max(1, Math.round(absoluteDiff / 3_600_000));
  const days = Math.max(1, Math.round(absoluteDiff / 86_400_000));

  if (minutes < 60) return isPast ? `Overdue ${minutes}m` : `In ${minutes}m`;
  if (hours < 24) return isPast ? `Overdue ${hours}h` : `In ${hours}h`;
  return isPast ? `Overdue ${days}d` : `In ${days}d`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getTaskDisplayTitle(taskType: TaskType, title: string) {
  const typeLabel = TASK_TYPE_LABELS[taskType] ?? taskType;
  const prefixPattern = new RegExp(`^${escapeRegExp(typeLabel)}\\s*[—–-]\\s*`, "i");
  return title.replace(prefixPattern, "");
}

function metadataString(task: Task, keys: string[]) {
  if (!task.metadata) return undefined;

  for (const key of keys) {
    const value = task.metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return undefined;
}

export function getTaskPatientPhone(task: Task) {
  return metadataString(task, [
    "phone",
    "mobile",
    "mobileNumber",
    "patientPhone",
    "patient_phone",
    "patientMobile",
    "patient_mobile",
  ]);
}
