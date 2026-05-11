"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { WorkflowVarLeaf, WorkflowVarsCatalog } from "@/types";

interface VarsCatalogContextValue {
  catalog: WorkflowVarsCatalog | null;
  loading: boolean;
  error: Error | null;
  /**
   * Active step index in the steps[] array, when the consumer is rendering
   * a step's form. Picker UIs can use this to demote (grey out) leaves
   * produced by steps that run *after* the current one.
   */
  stepIndex?: number;
}

const EMPTY: VarsCatalogContextValue = {
  catalog: null,
  loading: false,
  error: null,
};

const VarsCatalogContext = createContext<VarsCatalogContextValue>(EMPTY);

interface VarsCatalogProviderProps extends VarsCatalogContextValue {
  children: ReactNode;
}

export function VarsCatalogProvider({
  catalog,
  loading,
  error,
  stepIndex,
  children,
}: VarsCatalogProviderProps) {
  const value = useMemo<VarsCatalogContextValue>(
    () => ({ catalog, loading, error, stepIndex }),
    [catalog, loading, error, stepIndex],
  );
  return (
    <VarsCatalogContext.Provider value={value}>
      {children}
    </VarsCatalogContext.Provider>
  );
}

/**
 * Re-wraps the existing context with a new `stepIndex` while inheriting
 * `catalog` / `loading` / `error` from the parent provider.
 */
export function VarsCatalogStepProvider({
  stepIndex,
  children,
}: {
  stepIndex: number | undefined;
  children: ReactNode;
}) {
  const parent = useVarsCatalog();
  const value = useMemo<VarsCatalogContextValue>(
    () => ({ ...parent, stepIndex }),
    [parent, stepIndex],
  );
  return (
    <VarsCatalogContext.Provider value={value}>
      {children}
    </VarsCatalogContext.Provider>
  );
}

export function useVarsCatalog(): VarsCatalogContextValue {
  return useContext(VarsCatalogContext);
}

/**
 * Returns true if a leaf is "available" at the active step. Leaves with
 * a step source produced by a *later* step (or by the current step itself
 * when it's `vars.<storeAs>`) are unavailable, and the picker should grey
 * them out instead of inserting them silently.
 */
export function isLeafAvailableAtStep(
  leaf: WorkflowVarLeaf,
  stepIndex: number | undefined,
): boolean {
  if (stepIndex === undefined) return true;
  const src = leaf.source;
  if (src.kind === "step" || src.kind === "wait_for_event" || src.kind === "loop") {
    if (src.stepIndex < 0) return true; // global synthetic — treat as available
    return src.stepIndex < stepIndex;
  }
  return true;
}
