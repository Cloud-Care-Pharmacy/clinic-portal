"use client";

import { useEffect, useRef, useState } from "react";
import { NodeResizer, NodeToolbar, Position, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NOTE_COLOR_KEYS,
  NOTE_COLORS,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
} from "../lib/canvas-consts";
import { useNoteCallbacks } from "../lib/note-context";
import type { WorkflowNodeData } from "../lib/graph-builder";
import type { WorkflowNoteColor } from "@/types";

interface NoteDraft {
  title: string;
  body: string;
}

/**
 * Sticky-note canvas node. Renders a tinted card with an optional title
 * and multi-line body. Double-click to edit inline; selection exposes a
 * floating toolbar with color swatches, z-order, and delete. Resizable
 * via the corner handle (xyflow `<NodeResizer>`).
 *
 * Notes are non-executable and are not part of the chain graph; they
 * carry their own absolute `x`/`y`/`width`/`height` on `WorkflowNote`.
 *
 * Draft state is initialized once when entering edit mode and committed on
 * blur / Cmd+Enter — display mode reads `note.title` / `note.body`
 * directly so external updates (e.g. color swatch) never need to sync
 * back into a local `useState`.
 */
export function NoteNode({ data, selected }: NodeProps) {
  const noteData = data as Extract<WorkflowNodeData, { kind: "note" }>;
  const note = noteData.note;
  const callbacks = useNoteCallbacks();

  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const editing = draft !== null;
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus the body textarea when entering edit mode. The dependency is the
  // `editing` flag, which only flips when entering / leaving edit mode.
  useEffect(() => {
    if (editing) bodyRef.current?.focus();
  }, [editing]);

  const palette = NOTE_COLORS[note.color] ?? NOTE_COLORS.yellow;

  function startEditing() {
    setDraft({ title: note.title ?? "", body: note.body });
  }

  function commit(next: NoteDraft) {
    const nextTitle = next.title.trim() ? next.title : undefined;
    const nextBody = next.body;
    if (nextTitle !== note.title || nextBody !== note.body) {
      callbacks.onUpdate(note.id, { title: nextTitle, body: nextBody });
    }
    setDraft(null);
  }

  function cancel() {
    setDraft(null);
  }

  function handleColor(color: WorkflowNoteColor) {
    callbacks.onUpdate(note.id, { color });
  }

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={NOTE_MIN_WIDTH}
        minHeight={NOTE_MIN_HEIGHT}
        onResizeEnd={(_, params) => {
          callbacks.onUpdate(note.id, {
            width: params.width,
            height: params.height,
          });
        }}
        lineClassName="!border-primary/40"
        handleClassName="!size-2 !rounded-sm !border !border-primary !bg-background"
      />

      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
        <div className="flex items-center gap-1 rounded-full border border-border bg-popover px-2 py-1 shadow-md">
          {NOTE_COLOR_KEYS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`${NOTE_COLORS[color].label} note`}
              onClick={() => handleColor(color)}
              style={{
                backgroundColor: NOTE_COLORS[color].bg,
                borderColor: NOTE_COLORS[color].border,
              }}
              className={cn(
                "size-4 rounded-full border transition-all",
                color === note.color
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-popover"
                  : "hover:scale-110",
              )}
            />
          ))}
          <div className="mx-1 h-4 w-px bg-border" />
          <button
            type="button"
            onClick={() => callbacks.onBringToFront(note.id)}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Bring to front"
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => callbacks.onSendToBack(note.id)}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Send to back"
          >
            Back
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <button
            type="button"
            onClick={() => callbacks.onDelete(note.id)}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </NodeToolbar>

      <div
        onDoubleClick={startEditing}
        style={{
          backgroundColor: palette.bg,
          borderColor: palette.border,
        }}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-lg border p-3 shadow-sm",
          selected && "ring-2 ring-primary/50",
          // Sticky-note-style cursor; xyflow handles the actual drag.
          editing ? "cursor-text" : "cursor-grab active:cursor-grabbing",
        )}
      >
        {draft ? (
          <>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Title"
              className="bg-transparent text-sm font-semibold text-foreground placeholder:text-foreground/40 focus:outline-none"
              // Block xyflow keyboard handlers (delete, etc.) while editing.
              onKeyDown={(e) => e.stopPropagation()}
            />
            <textarea
              ref={bodyRef}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              onBlur={() => commit(draft)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") {
                  cancel();
                }
                // Cmd/Ctrl+Enter commits without losing focus.
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  commit(draft);
                }
              }}
              placeholder="Write a note…"
              className="mt-1 flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground placeholder:text-foreground/40 focus:outline-none"
            />
          </>
        ) : (
          <>
            {note.title ? (
              <div className="text-sm font-semibold text-foreground">
                {note.title}
              </div>
            ) : null}
            <div
              className={cn(
                "flex-1 overflow-hidden text-xs leading-relaxed whitespace-pre-wrap text-foreground",
                note.title ? "mt-1" : "",
                !note.body && "text-foreground/40 italic",
              )}
            >
              {note.body || "Double-click to edit"}
            </div>
          </>
        )}
      </div>
    </>
  );
}
