"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Template, TemplateType } from "@/types";
import {
  createTemplate,
  deleteTemplate,
  loadTemplates,
  updateTemplate,
} from "@/lib/templates/storage";

/**
 * TanStack Query hooks for the template system. The data layer is currently
 * backed by `localStorage` (see `src/lib/templates/storage.ts`) but the hook
 * shape mirrors the real API hooks (`use-notes`, `use-workflows`) so swapping
 * to `/api/proxy/templates` later is mechanical.
 */

const QUERY_KEY = ["templates"] as const;

function readAll(): Promise<Template[]> {
  return Promise.resolve(loadTemplates());
}

export function useTemplates(type?: TemplateType) {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: readAll,
    staleTime: 0,
  });
  const all = query.data ?? [];
  const data = type ? all.filter((t) => t.type === type) : all;
  return { ...query, data };
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY, id ?? ""],
    queryFn: () => {
      if (!id) return null;
      const all = loadTemplates();
      return all.find((t) => t.id === id) ?? null;
    },
    enabled: !!id,
  });
}

type CreateInput = Omit<Template, "id" | "createdAt" | "updatedAt">;

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInput) => createTemplate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

type UpdateInput = {
  id: string;
  patch: Partial<Omit<Template, "id" | "type" | "createdAt" | "createdBy">> & {
    updatedBy?: string;
  };
};

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateInput) => {
      const next = updateTemplate(id, patch);
      if (!next) throw new Error("Template not found");
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const ok = deleteTemplate(id);
      if (!ok) throw new Error("Template not found");
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
