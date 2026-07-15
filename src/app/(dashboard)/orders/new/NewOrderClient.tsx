"use client";

import { useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { OrderForm, useOrderForm } from "@/components/orders/OrderForm";
import { orderStore } from "@/components/orders/mock-orders";

export function NewOrderClient() {
  const { push } = useRouter();
  const formId = useId();
  const form = useOrderForm();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to orders
        </Link>
      </div>

      <PageHeader
        title="Add order"
        description="Create a new customer order. Mocked locally until the backend ships."
      />

      <div className="rounded-sm border border-border bg-card p-6">
        <OrderForm
          id={formId}
          form={form}
          onValidSubmit={(input) => {
            const created = orderStore.add(input);
            toast.success(`Created ${created.reference}`);
            push(`/orders/${created.id}`);
          }}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => push("/orders")}>
          Cancel
        </Button>
        <Button type="submit" form={formId}>
          Create order
        </Button>
      </div>
    </div>
  );
}
