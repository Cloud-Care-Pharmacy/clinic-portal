"use client";

import { useId, useRef, type ReactNode } from "react";
import { Braces } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { VarPickerPopover } from "./VarPickerPopover";

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
  /** Disable the {{var}} autocomplete picker. Defaults to enabled. */
  disablePicker?: boolean;
}

/**
 * String input that supports `{{event.payload.x}}` template interpolation.
 * Renders a small hint reminding the author about the templating syntax,
 * and mounts a `VarPickerPopover` that opens when the caret is inside an
 * unclosed `{{`.
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
  disablePicker,
}: TemplatedFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const Cmp = multiline ? Textarea : Input;
  return (
    <Field
      label={label}
      hint={
        hint ?? "Use {{event.payload.x}} or {{vars.someStore.field}} to interpolate."
      }
      error={error}
    >
      <div className="relative">
        <Cmp
          id={id}
          ref={inputRef as React.Ref<HTMLInputElement & HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={multiline ? rows : undefined}
          className={cn(
            monospace && "font-mono text-xs",
            error && "border-destructive",
            !disablePicker && (multiline ? "pr-9" : "pr-9"),
          )}
        />
        {!disablePicker && (
          <>
            <button
              type="button"
              aria-label="Insert template variable"
              title="Insert variable"
              onMouseDown={(e) => {
                // Insert `{{` at the caret (or end) and focus, which causes
                // the popover's caret-watcher to open the picker.
                e.preventDefault();
                const el = inputRef.current;
                if (!el) return;
                const caret = el.selectionStart ?? value.length;
                const before = value.slice(0, caret);
                const after = value.slice(caret);
                // Don't double-insert if the caret is already inside an open `{{`.
                const alreadyOpen = /\{\{[^{}]*$/.test(before);
                const next = alreadyOpen ? value : `${before}{{${after}`;
                if (!alreadyOpen) onChange(next);
                const newCaret = alreadyOpen ? caret : before.length + 2;
                requestAnimationFrame(() => {
                  el.focus();
                  el.setSelectionRange(newCaret, newCaret);
                  // setSelectionRange doesn't fire a selection event, so
                  // poke the popover's caret watcher manually.
                  el.dispatchEvent(new Event("keyup"));
                });
              }}
              className={cn(
                "absolute right-1.5 grid size-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                multiline ? "top-1.5" : "top-1/2 -translate-y-1/2",
              )}
            >
              <Braces className="size-3.5" />
            </button>
            <VarPickerPopover
              inputRef={inputRef}
              value={value}
              onChange={(v) => onChange(v)}
            />
          </>
        )}
      </div>
    </Field>
  );
}

