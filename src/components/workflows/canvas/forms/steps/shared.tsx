"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, TemplatedField } from "../Field";

export function StringListEditor({
  values,
  onChange,
  placeholder,
  addLabel,
  monospace,
  max,
}: {
  values: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
  placeholder?: string;
  addLabel: string;
  monospace?: boolean;
  max?: number;
}) {
  const list = values ?? [];
  function update(next: string[]) {
    onChange(next.length ? next : undefined);
  }
  return (
    <div className="flex flex-col gap-1.5">
      {list.map((v, i) => (
        // Append/remove-from-end editor; stable ids would require restructuring
        // the string[] controlled-component API.
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={v}
            onChange={(e) => {
              const next = [...list];
              next[i] = e.target.value;
              update(next);
            }}
            placeholder={placeholder}
            className={monospace ? "font-mono text-xs" : undefined}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => update(list.filter((_, j) => j !== i))}
            aria-label="Remove"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      {(max === undefined || list.length < max) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit gap-1 text-xs"
          onClick={() => update([...list, ""])}
        >
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}

export function KeyValueEditor({
  values,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
}: {
  values: Record<string, string> | undefined;
  onChange: (next: Record<string, string> | undefined) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel: string;
}) {
  // Local row state so users can add empty rows and type keys/values
  // before they are propagated upward. The parent only ever sees rows
  // with non-empty keys, but the editor preserves all rows visually.
  const [rows, setRows] = useState<[string, string][]>(() =>
    Object.entries(values ?? {})
  );
  // Sync from upstream when the canonical object changes from outside
  // (e.g. switching nodes). We compare a normalized projection of local
  // rows to the incoming values to avoid clobbering in-progress edits.
  const lastSyncedRef = useRef<string>(JSON.stringify(values ?? {}));
  useEffect(() => {
    const incoming = JSON.stringify(values ?? {});
    if (incoming === lastSyncedRef.current) return;
    lastSyncedRef.current = incoming;
    setRows(Object.entries(values ?? {}));
  }, [values]);

  function commit(next: [string, string][]) {
    setRows(next);
    const obj: Record<string, string> = {};
    for (const [k, v] of next) {
      if (k) obj[k] = v;
    }
    const out = Object.keys(obj).length ? obj : undefined;
    lastSyncedRef.current = JSON.stringify(out ?? {});
    onChange(out);
  }
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([k, v], i) => (
        // Append/remove-from-end editor; stable ids would require restructuring
        // the [key, value][] tuple state.
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={k}
            onChange={(e) => {
              const next: [string, string][] = rows.map((p, j) =>
                j === i ? [e.target.value, p[1]] : p
              );
              commit(next);
            }}
            placeholder={keyPlaceholder ?? "key"}
            className="font-mono text-xs"
          />
          <Input
            value={v}
            onChange={(e) => {
              const next: [string, string][] = rows.map((p, j) =>
                j === i ? [p[0], e.target.value] : p
              );
              commit(next);
            }}
            placeholder={valuePlaceholder ?? "value"}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => commit(rows.filter((_, j) => j !== i))}
            aria-label="Remove"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit gap-1 text-xs"
        onClick={() => setRows((prev) => [...prev, ["", ""]])}
      >
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

export function Collapsible({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 rounded-sm border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        {label}
      </button>
      {open && <div className="border-t border-border/60 px-3 pt-3">{children}</div>}
    </div>
  );
}

/**
 * Editor for a step's `variables` map (used by `send_email` and `send_sms`
 * when `templateId` is set). Keys are the template author's declared
 * binding names (dot-notation supported \u2014 `patient.firstName` is expanded
 * server-side into a nested object). Values are workflow template strings
 * with `{{event.*}}` / `{{vars.*}}` autocomplete.
 *
 * Rows for `declared` keys render first \u2014 even when unset \u2014 so the form
 * mirrors the template's expected inputs. Extra keys are editable and
 * removable so unusual bindings can still be supplied.
 */
export function VariablesEditor({
  declared,
  values,
  onChange,
  error,
}: {
  declared: string[] | undefined;
  values: Record<string, string> | undefined;
  onChange: (next: Record<string, string> | undefined) => void;
  error?: string;
}) {
  const declaredKeys = declared ?? [];
  const valueKeys = values ? Object.keys(values) : [];
  const extraKeys = valueKeys.filter((k) => !declaredKeys.includes(k));
  const [pending, setPending] = useState<string[]>([]);
  const rows = [
    ...declaredKeys,
    ...extraKeys,
    ...pending.filter((k) => !declaredKeys.includes(k) && !extraKeys.includes(k)),
  ];

  function setValue(key: string, value: string) {
    const next = { ...(values ?? {}) };
    if (value === "") {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(Object.keys(next).length ? next : undefined);
  }
  function removeKey(key: string) {
    setPending((p) => p.filter((k) => k !== key));
    if (!values || !(key in values)) return;
    const next = { ...values };
    delete next[key];
    onChange(Object.keys(next).length ? next : undefined);
  }

  return (
    <Field
      label="Variables"
      hint="Bindings interpolated against the workflow context, then fed to the template. Keys with dots become nested (patient.firstName \u2192 {{patient.firstName}})."
      error={error}
    >
      <div className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            This template declares no variables. Add custom bindings below if
            needed.
          </p>
        )}
        {rows.map((key) => {
          const isDeclared = declaredKeys.includes(key);
          return (
            <div key={key} className="flex items-start gap-1.5">
              <div className="flex-1">
                <TemplatedField
                  label={key}
                  value={values?.[key] ?? ""}
                  onChange={(v) => setValue(key, v)}
                  placeholder="{{event.payload.firstName}}"
                />
              </div>
              {!isDeclared && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-7 size-7 shrink-0"
                  onClick={() => removeKey(key)}
                  aria-label={`Remove ${key}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          );
        })}
        <AddCustomVariable
          onAdd={(key) => {
            if (!key) return;
            if (rows.includes(key)) return;
            setPending((p) => [...p, key]);
          }}
        />
      </div>
    </Field>
  );
}

function AddCustomVariable({ onAdd }: { onAdd: (key: string) => void }) {
  const [key, setKey] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="custom.variable"
        className="font-mono text-xs"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={() => {
          onAdd(key.trim());
          setKey("");
        }}
      >
        <Plus className="size-3.5" />
        Add variable
      </Button>
    </div>
  );
}
