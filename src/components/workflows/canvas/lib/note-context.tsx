"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { WorkflowNote } from "@/types";

/**
 * Callbacks exposed to NoteNode instances rendered by xyflow. Lives in a
 * context because xyflow only passes `{ data, selected, ... }` into custom
 * node components — there is no slot for arbitrary callback props. The
 * editor wraps the canvas in `<NoteCallbacksProvider>` so notes can call
 * back into draft state without prop-drilling through the graph builder.
 */
export interface NoteCallbacks {
  onUpdate: (id: string, patch: Partial<Omit<WorkflowNote, "id">>) => void;
  onDelete: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

const noop = () => {};

const NoteCallbacksContext = createContext<NoteCallbacks>({
  onUpdate: noop,
  onDelete: noop,
  onBringToFront: noop,
  onSendToBack: noop,
});

export function NoteCallbacksProvider({
  value,
  children,
}: {
  value: NoteCallbacks;
  children: ReactNode;
}) {
  return (
    <NoteCallbacksContext.Provider value={value}>
      {children}
    </NoteCallbacksContext.Provider>
  );
}

export function useNoteCallbacks(): NoteCallbacks {
  return useContext(NoteCallbacksContext);
}
