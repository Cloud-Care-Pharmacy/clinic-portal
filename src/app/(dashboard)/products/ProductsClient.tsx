"use client";

import { Package } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export function ProductsClient() {
  return (
    <div className="space-y-6">
      <PageHeader title="Products" />
      <EmptyState
        icon={Package}
        title="Products coming soon"
        description="Product catalog management is on the way. Once the backend exposes product endpoints, this page will let you browse, add, and manage your inventory."
        dashed
      />
    </div>
  );
}
