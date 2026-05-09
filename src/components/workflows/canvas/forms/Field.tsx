"use client";

import { useId, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-[11px] font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}

interface TemplatedFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  monospace?: boolean;
}

/**
 * String input that supports `{{event.payload.x}}` template interpolation.
 * Renders a small hint reminding the author about the templating syntax.
 */
export function TemplatedField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  multiline,
  rows = 4,
  monospace,
}: TemplatedFieldProps) {
  const id = useId();
  const Cmp = multiline ? Textarea : Input;
  return (
    <Field
      label={label}
      hint={
        hint ?? "Use {{event.payload.x}} or {{vars.someStore.field}} to interpolate."
      }
      error={error}
    >
      <Cmp
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        className={cn(monospace && "font-mono text-xs", error && "border-destructive")}
      />
    </Field>
  );
}
