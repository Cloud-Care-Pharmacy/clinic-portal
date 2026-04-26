"use client";

import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

/**
 * Staff administration is pending backend support.
 *
 * The `prescription-gateway` API exposes `GET /api/users` for listing user
 * profiles, but it does not yet expose endpoints to add, remove, or change
 * staff roles, and the user profile shape does not include the display name
 * and email needed for a staff list.
 *
 * Per the production-readiness plan we hide the admin workflow until the
 * backend endpoints are available rather than ship a browser-only mock that
 * pretends to persist changes.
 */
export function AdminClient() {
  return (
    <div className="space-y-6">
      <PageHeader title="Administration" />
      <EmptyState
        icon={ShieldCheck}
        title="Staff management coming soon"
        description="Staff administration is being wired to the backend. Once the prescription-gateway exposes staff list, role, and invite endpoints, this page will let admins manage team members."
        dashed
      />
    </div>
  );
}
