"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
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
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-red-200 bg-red-50">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <div>
            <p className="text-lg font-semibold text-red-800">
              Something went wrong
            </p>
            <p className="text-sm text-red-600 mt-1">
              {error.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
