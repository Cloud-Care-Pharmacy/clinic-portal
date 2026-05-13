"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        // eslint-disable-next-line react-doctor/no-array-index-as-key
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
        // eslint-disable-next-line react-doctor/no-array-index-as-key
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
