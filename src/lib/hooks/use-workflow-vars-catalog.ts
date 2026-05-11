"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type {
  WorkflowVarsCatalog,
  WorkflowVarsCatalogPreviewPayload,
  WorkflowVarsCatalogResponse,
} from "@/types";
import { readError, WorkflowApiError } from "./use-workflows";

const DRAFT_DEBOUNCE_MS = 350;

// ---- Fetchers ----

async function fetchGlobalCatalog(): Promise<WorkflowVarsCatalogResponse> {
  const res = await fetch(`/api/proxy/workflows/vars-catalog`);
  if (!res.ok) throw await readError(res, "Failed to load workflow vars catalog");
  return res.json();
}

async function fetchWorkflowCatalog(
  workflowId: string,
): Promise<WorkflowVarsCatalogResponse> {
  const res = await fetch(
    `/api/proxy/workflows/${encodeURIComponent(workflowId)}/vars-catalog`,
  );
  if (!res.ok) throw await readError(res, "Failed to load workflow vars catalog");
  return res.json();
}

async function previewCatalog(
  payload: WorkflowVarsCatalogPreviewPayload,
): Promise<WorkflowVarsCatalogResponse> {
  const res = await fetch(`/api/proxy/workflows/vars-catalog/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await readError(res, "Failed to preview workflow vars catalog");
  return res.json();
}

// ---- Query options ----

export function globalVarsCatalogQueryOptions() {
  return queryOptions({
    queryKey: ["workflows", "vars-catalog", "global"],
    queryFn: fetchGlobalCatalog,
    staleTime: 5 * 60_000,
  });
}

export function workflowVarsCatalogQueryOptions(workflowId: string) {
  return queryOptions({
    queryKey: ["workflows", "vars-catalog", "workflow", workflowId],
    queryFn: () => fetchWorkflowCatalog(workflowId),
    enabled: Boolean(workflowId),
    staleTime: 30_000,
  });
}

// ---- Hooks ----

export function useGlobalVarsCatalog() {
  return useQuery(globalVarsCatalogQueryOptions());
}

export function useWorkflowVarsCatalog(workflowId: string | undefined) {
  return useQuery({
    ...workflowVarsCatalogQueryOptions(workflowId ?? ""),
    enabled: Boolean(workflowId),
  });
}

/**
 * Stable JSON stringify that sorts object keys recursively. Used to dedupe
 * draft catalog requests across cosmetic key-order differences.
 */
function stableHash(value: unknown): string {
  function walk(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v as Record<string, unknown>).sort()) {
        out[key] = walk((v as Record<string, unknown>)[key]);
      }
      return out;
    }
    return v;
  }
  return JSON.stringify(walk(value));
}

interface DraftVarsCatalogState {
  catalog: WorkflowVarsCatalog | null;
  loading: boolean;
  error: WorkflowApiError | null;
}

/**
 * Debounced draft catalog. Sends the current draft to
 * `POST /workflows/vars-catalog/preview` after a short pause, dedupes
 * by stable hash, and falls back to the previous successful catalog on
 * 400 (per the contract: "draft is structurally invalid; show the error
 * inline, keep the previous catalog").
 *
 * Pass `enabled: false` to skip preview entirely (e.g. while no edits
 * have been made yet and the saved catalog is still valid).
 */
export function useDraftVarsCatalog(
  draft: WorkflowVarsCatalogPreviewPayload | null,
  opts: { enabled?: boolean } = {},
): DraftVarsCatalogState {
  const enabled = opts.enabled ?? true;
  const hash = useMemo(() => (draft ? stableHash(draft) : null), [draft]);

  const [state, setState] = useState<DraftVarsCatalogState>({
    catalog: null,
    loading: false,
    error: null,
  });
  const lastSuccessHashRef = useRef<string | null>(null);
  const inFlightHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !draft || !hash) return;
    if (hash === lastSuccessHashRef.current) return;
    if (hash === inFlightHashRef.current) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      inFlightHashRef.current = hash;
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const body = await previewCatalog(draft);
        if (cancelled) return;
        lastSuccessHashRef.current = hash;
        setState({ catalog: body.data, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        const apiErr =
          err instanceof WorkflowApiError
            ? err
            : new WorkflowApiError(0, (err as Error).message ?? "Unknown error");
        // Per the contract, treat 400 as "draft is structurally invalid":
        // keep the previous catalog and surface the error.
        setState((prev) => ({
          catalog: prev.catalog,
          loading: false,
          error: apiErr,
        }));
      } finally {
        if (inFlightHashRef.current === hash) {
          inFlightHashRef.current = null;
        }
      }
    }, DRAFT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft, hash, enabled]);

  return state;
}
