"use client";

import { useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { OrderForm, useOrderForm } from "@/components/orders/OrderForm";
import { useCreateOrder } from "@/lib/hooks/use-orders";

export function NewOrderClient() {
  const { push } = useRouter();
  const formId = useId();
  const form = useOrderForm();
  const create = useCreateOrder();

  return (
    <div className="space-y-6 pb-12">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to orders
      </Link>

      <PageHeader
        title="New order"
        description="Create a customer order. Prices are taken from the catalog at checkout."
      />

      <div className="rounded-sm border border-border bg-card p-6">
        <OrderForm
          id={formId}
          form={form}
          onValidSubmit={(payload) =>
            create.mutate(payload, {
              onSuccess: (res) => {
                toast.success(`Order ${res.data.order.displayId} created`);
                push(`/orders/${res.data.order.id}`);
              },
              onError: (e) =>
                toast.error(
                  e instanceof Error ? e.message : "Failed to create order"
                ),
            })
          }
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => push("/orders")}>
          Cancel
        </Button>
        <Button type="submit" form={formId} disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create order"}
        </Button>
      </div>
    </div>
  );
}
