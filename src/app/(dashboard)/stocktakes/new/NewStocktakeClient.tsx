"use client";

import { useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  StocktakeForm,
  useStocktakeForm,
} from "@/components/stocktakes/StocktakeForm";
import { stocktakeStore } from "@/components/stocktakes/mock-stocktakes";

export function NewStocktakeClient() {
  const { push } = useRouter();
  const formId = useId();
  const form = useStocktakeForm();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          href="/stocktakes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to stocktakes
        </Link>
      </div>

      <PageHeader
        title="New stocktake"
        description="Generate a count sheet from the catalog and record physical counts. Mocked locally until the backend ships."
      />

      <div className="rounded-sm border border-border bg-card p-6">
        <StocktakeForm
          id={formId}
          form={form}
          onValidSubmit={(input) => {
            const created = stocktakeStore.add(input);
            toast.success(`Started ${created.reference}`);
            push(`/stocktakes/${created.id}`);
          }}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => push("/stocktakes")}
        >
          Cancel
        </Button>
        <Button type="submit" form={formId}>
          Start stocktake
        </Button>
      </div>
    </div>
  );
}
