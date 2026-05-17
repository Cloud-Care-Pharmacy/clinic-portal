"use client";

import { useEffect, useId } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppSheet } from "@/components/shared/AppSheet";
import {
  EMPTY_PRODUCT_FORM,
  ProductForm,
  useProductForm,
} from "./ProductForm";
import { productStore } from "./mock-products";

interface NewProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProductSheet({ open, onOpenChange }: NewProductSheetProps) {
  const formId = useId();
  const form = useProductForm();

  useEffect(() => {
    if (open) form.reset(EMPTY_PRODUCT_FORM);
  }, [open, form]);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add product"
      description="Add a new product to the catalog. Mocked locally until the backend ships."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Add product
          </Button>
        </>
      }
    >
      <ProductForm
        id={formId}
        form={form}
        onValidSubmit={(input) => {
          const created = productStore.add(input);
          toast.success(`Added ${created.name}`);
          onOpenChange(false);
        }}
      />
    </AppSheet>
  );
}
