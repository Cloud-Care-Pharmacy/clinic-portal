"use client";

import { useState } from "react";

/**
 * Returns the last non-null/undefined value seen for `value`. Useful for
 * keeping detail-sheet content rendered during the close transition while the
 * controlling parent has already cleared the selection.
 */
export function useLastDefined<T>(value: T | null | undefined): T | null {
  const [stash, setStash] = useState<T | null>(value ?? null);
  if (value != null && value !== stash) {
    setStash(value);
    return value;
  }
  return stash;
}
