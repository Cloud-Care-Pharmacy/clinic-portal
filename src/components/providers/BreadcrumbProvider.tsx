"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface BreadcrumbOverrides {
  [path: string]: string;
}

interface BreadcrumbContextValue {
  overrides: BreadcrumbOverrides;
  setOverride: (path: string, label: string) => void;
  clearOverride: (path: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  overrides: {},
  setOverride: () => {},
  clearOverride: () => {},
});

export function useBreadcrumbOverrides() {
  return useContext(BreadcrumbContext);
}

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<BreadcrumbOverrides>({});

  const setOverride = useCallback((path: string, label: string) => {
    setOverrides((prev) => ({ ...prev, [path]: label }));
  }, []);

  const clearOverride = useCallback((path: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ overrides, setOverride, clearOverride }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}
