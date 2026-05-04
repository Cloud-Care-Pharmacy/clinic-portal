import type {
  UserRole,
  WorkspaceInvitationStatus,
  WorkspaceUser,
  WorkspaceUserStatus,
} from "@/types";

export const WORKSPACE_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  staff: "Staff",
};

export const WORKSPACE_ROLE_VARIANTS = {
  admin: "accent",
  doctor: "info",
  staff: "neutral",
} as const;

export const WORKSPACE_INVITATION_STATUS_LABELS: Record<
  WorkspaceInvitationStatus,
  string
> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
};

export const WORKSPACE_INVITATION_STATUS_VARIANTS = {
  pending: "warning",
  accepted: "success",
  expired: "neutral",
  revoked: "danger",
} as const;

export const WORKSPACE_USER_STATUS_LABELS: Record<WorkspaceUserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export const WORKSPACE_USER_STATUS_VARIANTS = {
  active: "success",
  inactive: "neutral",
} as const;

export function getWorkspaceUserName(user: WorkspaceUser) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.name || fullName || user.email || "User";
}

export function getWorkspaceUserStatus(user: WorkspaceUser): WorkspaceUserStatus {
  if (user.status) return user.status;
  return user.active && !user.deactivatedAt ? "active" : "inactive";
}

export function formatWorkspaceDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatWorkspaceTimestamp(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
