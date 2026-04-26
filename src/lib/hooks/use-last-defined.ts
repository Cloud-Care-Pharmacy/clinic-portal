"use client";

import { useRef } from "react";

/**
 * Returns the last non-null/undefined value seen for `value`. Useful for
 * keeping detail-sheet content rendered during the close transition while the
 * controlling parent has already cleared the selection.
 */
export function useLastDefined<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(null);
  if (value != null) ref.current = value;
  return ref.current;
}
