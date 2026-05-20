import type {
  UserRole,
  WorkspaceInvitationStatus,
  WorkspaceUser,
  WorkspaceUserStatus,
} from "@/types";

export const WORKSPACE_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  practitioner: "Practitioner",
  staff: "Staff",
};

export const WORKSPACE_ROLE_VARIANTS = {
  admin: "accent",
  practitioner: "info",
  staff: "neutral",
} as const;

export const WORKSPACE_INVITATION_STATUS_LABELS: Record<
  WorkspaceInvitationStatus,
  string
> = {
  pending: "Pending",
  invited: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
};

export const WORKSPACE_INVITATION_STATUS_VARIANTS = {
  pending: "warning",
  invited: "warning",
  accepted: "success",
  expired: "neutral",
  revoked: "danger",
} as const;

export const WORKSPACE_USER_STATUS_LABELS: Record<WorkspaceUserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  invited: "Invited",
  revoked: "Revoked",
};

export const WORKSPACE_USER_STATUS_VARIANTS = {
  active: "success",
  inactive: "neutral",
  invited: "warning",
  revoked: "danger",
} as const;

export function formatWorkspaceRole(role?: UserRole | null) {
  return role ? WORKSPACE_ROLE_LABELS[role] : "Unassigned";
}

export function getWorkspaceRoleVariant(role?: UserRole | null) {
  return role ? WORKSPACE_ROLE_VARIANTS[role] : "neutral";
}

export function getWorkspaceUserName(user: WorkspaceUser) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.name || fullName || user.email || user.invitedEmail || "User";
}

export function getWorkspaceUserEmail(user: WorkspaceUser) {
  return user.email || user.invitedEmail || "—";
}

export function getWorkspaceUserStatus(user: WorkspaceUser): WorkspaceUserStatus {
  if (user.deactivatedAt) return "inactive";
  if (user.status) return user.status;
  return user.active && !user.deactivatedAt ? "active" : "inactive";
}

export function getWorkspaceInvitationId(invitation: { invitationId?: string; id?: string }) {
  return invitation.invitationId ?? invitation.id ?? "";
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
