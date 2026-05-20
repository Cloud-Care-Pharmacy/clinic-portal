"use client";

import { VARIABLE_CATALOG } from "@/lib/templates/variables";
import { cn } from "@/lib/utils";

interface VariablePickerProps {
  onInsert: (path: string) => void;
  className?: string;
}

/**
 * Grouped chip strip of every variable in the catalog. Clicking a chip calls
 * `onInsert(path)`; the host editor is responsible for splicing the token
 * (`{{path}}`) at the current cursor position.
 */
export function VariablePicker({ onInsert, className }: VariablePickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {VARIABLE_CATALOG.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.variables.map((v) => (
              <button
                key={v.path}
                type="button"
                onClick={() => onInsert(v.path)}
                title={v.path}
                className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-muted-foreground">{v.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {`{{${v.path}}}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
