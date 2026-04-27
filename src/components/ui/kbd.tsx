import * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-grid h-5 min-w-4.5 place-items-center rounded border border-border border-b-2 bg-background px-1.5 font-mono text-[11px] font-medium leading-none text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
