"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Template, TemplateType } from "@/types";

/**
 * TanStack Query hooks for the templates API.
 *
 * The Cloudflare Worker endpoints live at `/api/templates`; we hit them via the
 * patient-portal auth proxy (`/api/proxy/templates`), which injects the
 * `X-API-Key` and `X-Internal-User-Id` headers server-side.
 *
 * Server is the source of truth for `id`, `variables`, `createdAt`,
 * `updatedAt`, and (for email) `plainTextFallback` when not supplied.
 */

const QUERY_KEY = ["templates"] as const;
const BASE = "/api/proxy/templates";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class TemplatesApiError extends Error {
  code: string;
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(
    message: string,
    opts: { code: string; status: number; fieldErrors?: Record<string, string> }
  ) {
    super(message);
    this.name = "TemplatesApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.fieldErrors = opts.fieldErrors;
  }
}

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

interface ListResponse {
  success: true;
  data: { templates: Template[]; total: number };
}

interface SingleResponse {
  success: true;
  data: { template: Template };
}

interface DeleteResponse {
  success: true;
  data: { id: string };
}

interface ErrorResponse {
  success: false;
  error:
    | string
    | {
        code?: string;
        message?: string;
        fieldErrors?: Record<string, string>;
      };
  code?: string;
  details?: unknown;
}

async function request<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | boolean | undefined> }
): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  // 204 / empty
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload = text ? (JSON.parse(text) as T | ErrorResponse) : (undefined as T);

  if (!res.ok) {
    const err = payload as ErrorResponse | undefined;
    const errObj =
      err && typeof err.error === "object" && err.error !== null ? err.error : null;
    const message =
      (errObj && errObj.message) ||
      (typeof err?.error === "string" ? err.error : null) ||
      `Request failed with status ${res.status}`;
    const code =
      (errObj && errObj.code) ||
      err?.code ||
      (res.status === 404 ? "not_found" : "request_failed");
    throw new TemplatesApiError(message, {
      code,
      status: res.status,
      fieldErrors: errObj?.fieldErrors,
    });
  }

  return payload as T;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTemplates(type?: TemplateType) {
  const query = useQuery({
    queryKey: type ? [...QUERY_KEY, { type }] : QUERY_KEY,
    queryFn: async () => {
      const json = await request<ListResponse>(BASE, {
        method: "GET",
        query: { type, limit: 500 },
      });
      return json.data.templates;
    },
    staleTime: 30_000,
  });
  // Always expose an array so callers can do `data.length` while loading.
  return { ...query, data: query.data ?? ([] as Template[]) };
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY, id ?? ""],
    queryFn: async () => {
      if (!id) return null;
      const json = await request<SingleResponse>(`${BASE}/${encodeURIComponent(id)}`, {
        method: "GET",
      });
      return json.data.template;
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Fields the server manages on every write. The FE must not send any of
 * these on POST or PATCH — the response carries the populated row.
 */
type ServerManaged =
  | "id"
  | "variables"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "updatedBy";

// Distributive Omit so the per-variant discriminator + fields survive.
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

type CreateInput = DistributiveOmit<Template, ServerManaged>;

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInput) => {
      const json = await request<SingleResponse>(BASE, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return json.data.template;
    },
    onSuccess: (template) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.setQueryData([...QUERY_KEY, template.id], template);
    },
  });
}

type UpdateInput = {
  id: string;
  patch: Partial<DistributiveOmit<Template, ServerManaged | "type">>;
};

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateInput) => {
      const json = await request<SingleResponse>(
        `${BASE}/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        }
      );
      return json.data.template;
    },
    onSuccess: (template) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.setQueryData([...QUERY_KEY, template.id], template);
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const json = await request<DeleteResponse>(
        `${BASE}/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      return json.data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.removeQueries({ queryKey: [...QUERY_KEY, id] });
    },
  });
}
