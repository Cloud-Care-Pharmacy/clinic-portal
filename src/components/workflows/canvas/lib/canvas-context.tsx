"use client";

import { createContext, useContext } from "react";

/**
 * Lightweight context that lets edge components dispatch "open the node
 * palette to insert a step here" without prop-drilling through React Flow.
 */
export interface InsertionRequest {
  afterFlatIndex: number | null;
  parentStepName?: string;
  branchIndex?: number;
}

export interface CanvasContextValue {
  onRequestInsert: (req: InsertionRequest, anchor: { x: number; y: number }) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export const CanvasContextProvider = CanvasContext.Provider;

export function useCanvasContext(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) {
    throw new Error("useCanvasContext must be used inside <CanvasContextProvider>");
  }
  return ctx;
}
