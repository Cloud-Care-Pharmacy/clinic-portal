"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] bg-card border border-border px-8 py-10 shadow-lg gap-4">
      <p className="text-lg font-semibold text-status-danger-fg">
        Authentication error
      </p>
      <p className="text-sm text-muted-foreground">
        {error.message || "Something went wrong. Please try again."}
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
