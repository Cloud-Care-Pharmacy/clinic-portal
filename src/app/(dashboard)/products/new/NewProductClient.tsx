"use client";

import { useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductForm, useProductForm } from "@/components/products/ProductForm";
import { productStore } from "@/components/products/mock-products";

export function NewProductClient() {
  const { push } = useRouter();
  const formId = useId();
  const form = useProductForm();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to products
        </Link>
      </div>

      <PageHeader
        title="Add product"
        description="Add a new item to the clinic's product catalog. Mocked locally until the backend ships."
      />

      <div className="rounded-sm border border-border bg-card p-6">
        <ProductForm
          id={formId}
          form={form}
          onValidSubmit={(input) => {
            const created = productStore.add(input);
            toast.success(`Added ${created.name}`);
            push(`/products/${created.id}`);
          }}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => push("/products")}>
          Cancel
        </Button>
        <Button type="submit" form={formId}>
          Add product
        </Button>
      </div>
    </div>
  );
}
