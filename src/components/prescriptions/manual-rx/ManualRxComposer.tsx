"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  blankMed,
  CESSATION_FORMULARY,
  medFromFormulary,
  type FormularyItem,
} from "./data";
import { RxMedCard } from "./RxMedCard";
import { RxQuickPick } from "./RxQuickPick";
import type { Medication } from "./types";

export interface ManualRxComposerProps {
  value: Medication[];
  onChange: (next: Medication[]) => void;
  formulary?: readonly FormularyItem[];
  className?: string;
}

/**
 * Card-based medication composer used inside the Wrap-up consultation modal's
 * Prescription step (Manual segment). See the Manual Prescription Composer
 * spec for behaviour, geometry, and token usage.
 */
export function ManualRxComposer({
  value,
  onChange,
  formulary = CESSATION_FORMULARY,
  className,
}: ManualRxComposerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function addMed(med: Medication) {
    onChange([...value, med]);
    setEditingId(med.id);
  }

  function updateMed(id: string, next: Medication) {
    onChange(value.map((m) => (m.id === id ? next : m)));
  }

  function removeMed(id: string) {
    onChange(value.filter((m) => m.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function handleQuickPick(item: FormularyItem) {
    addMed(medFromFormulary(item));
  }

  function handleSearchSubmit() {
    const name = search.trim();
    if (!name) return;
    addMed(blankMed(name));
    setSearch("");
  }

  function handleSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearchSubmit();
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* (1) Search row */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={handleSearchKey}
          placeholder="Search medication - e.g. Nicotine 20 mg/mL…"
          aria-label="Search medication"
          className="h-9 rounded-sm border-border bg-background pl-8 pr-20 text-[13px] focus-visible:border-primary"
        />
        <button
          type="button"
          onClick={handleSearchSubmit}
          disabled={!search.trim()}
          className="absolute right-1.5 top-1/2 inline-flex h-6 -translate-y-1/2 items-center gap-1 rounded-sm bg-primary px-2 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Plus className="size-3" aria-hidden="true" />
          Add
        </button>
      </div>

      {/* (2) Quick-pick row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Nicotine
        </span>
        {formulary.map((item) => (
          <RxQuickPick key={item.key} item={item} onAdd={handleQuickPick} />
        ))}
      </div>

      {/* (3) Medication cards (or empty state) */}
      {value.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border bg-popover/40 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
          No medications added yet. Pick a nicotine strength above to start.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {value.map((med) => (
            <RxMedCard
              key={med.id}
              med={med}
              editing={editingId === med.id}
              onOpen={() => setEditingId(med.id)}
              onClose={() => setEditingId(null)}
              onChange={(next) => updateMed(med.id, next)}
              onRemove={() => removeMed(med.id)}
            />
          ))}
        </div>
      )}

      {/* (4) Add another */}
      <button
        type="button"
        onClick={() => addMed(blankMed())}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-dashed border-border bg-transparent px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-popover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add another medication
      </button>
    </div>
  );
}
