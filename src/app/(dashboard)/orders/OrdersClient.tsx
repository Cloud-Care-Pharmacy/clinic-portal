"use client";

import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export function OrdersClient() {
  return (
    <div className="space-y-6">
      <PageHeader title="Orders" />
      <EmptyState
        icon={ShoppingCart}
        title="Orders coming soon"
        description="Order management is on the way. Once the backend exposes order endpoints, this page will let you track, fulfil, and review customer orders."
        dashed
      />
    </div>
  );
}
