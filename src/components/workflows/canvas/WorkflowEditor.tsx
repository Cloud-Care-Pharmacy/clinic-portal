"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { WorkflowGraph } from "./WorkflowGraph";
import { EmptyCanvas } from "./EmptyCanvas";
import { NodePalette } from "./NodePalette";
import { NodeInspector, type Selection } from "./NodeInspector";
import { blankTrigger } from "./forms/triggers";
import { blankStep } from "./forms/steps";
import {
  insertStep,
  removeStepAndDescendants,
  renameStepId,
  stepNodeName,
} from "./lib/step-tree";
import type { InsertionRequest } from "./lib/canvas-context";
import { NoteCallbacksProvider, type NoteCallbacks } from "./lib/note-context";
import {
  NOTE_DEFAULT_COLOR,
  NOTE_DEFAULT_HEIGHT,
  NOTE_DEFAULT_WIDTH,
} from "./lib/canvas-consts";
import type {
  Workflow,
  WorkflowNote,
  WorkflowStep,
  WorkflowStepKind,
  WorkflowTrigger,
  WorkflowTriggerKind,
} from "@/types";

interface WorkflowEditorProps {
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  notes: WorkflowNote[];
  onChange: (next: {
    triggers: WorkflowTrigger[];
    steps: WorkflowStep[];
    notes: WorkflowNote[];
  }) => void;
  webhookBaseUrl?: string;
  otherWorkflows?: Workflow[];
  serverError?: { path?: string; message: string } | null;
  /**
   * Increment to programmatically open the node palette. Used by parent
   * action bars / shortcuts.
   */
  openPaletteSignal?: number;
  /**
   * Increment to programmatically add a new sticky note at the current
   * viewport center.
   */
  addNoteSignal?: number;
  panningMode: "grab" | "select";
}

export function WorkflowEditor({
  triggers,
  steps,
  notes,
  onChange,
  webhookBaseUrl,
  otherWorkflows,
  serverError,
  openPaletteSignal,
  addNoteSignal,
  panningMode,
}: WorkflowEditorProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTab, setPaletteTab] = useState<"triggers" | "actions">("actions");
  const [pendingInsertion, setPendingInsertion] = useState<InsertionRequest | null>(
    null,
  );
  /**
   * When set, the palette is in "replace trigger" mode: picking a trigger
   * kind will overwrite the trigger at this index instead of appending a new
   * one. Reset whenever the palette closes.
   */
  const [replaceTriggerIndex, setReplaceTriggerIndex] = useState<number | null>(
    null,
  );

  const reactFlow = useReactFlow();

  const isEmpty = triggers.length === 0 && steps.length === 0;

  const openPalette = useCallback((tab: "triggers" | "actions") => {
    setPaletteTab(tab);
    setPaletteOpen(true);
    setPendingInsertion(null);
    setReplaceTriggerIndex(null);
    setSelection(null);
    setSelectedNoteId(null);
  }, []);

  const handleSelectNodeId = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelection(null);
        setSelectedNoteId(null);
        return;
      }
      setPaletteOpen(false);
      // Note selection lives separately from inspector selection — notes
      // edit inline and never open the right-hand inspector sheet.
      if (id.startsWith("note-")) {
        setSelectedNoteId(id.slice("note-".length));
        setSelection(null);
        return;
      }
      setSelectedNoteId(null);
      const triggerMatch = id.match(/^trigger-(\d+)$/);
      if (triggerMatch) {
        setSelection({ kind: "trigger", index: Number(triggerMatch[1]) });
        return;
      }
      const flatIndex = steps.findIndex((s, i) => stepNodeName(s, i) === id);
      if (flatIndex >= 0) setSelection({ kind: "step", index: flatIndex });
    },
    [steps],
  );

  const handleRequestInsert = useCallback((req: InsertionRequest) => {
    setPendingInsertion(req);
    setPaletteTab("actions");
    setPaletteOpen(true);
    setReplaceTriggerIndex(null);
    setSelection(null);
    setSelectedNoteId(null);
  }, []);

  const handleReplaceTrigger = useCallback((index: number) => {
    setReplaceTriggerIndex(index);
    setPaletteTab("triggers");
    setPaletteOpen(true);
    setPendingInsertion(null);
    setSelection(null);
    setSelectedNoteId(null);
  }, []);

  const addTrigger = (kind: WorkflowTriggerKind) => {
    if (replaceTriggerIndex !== null) {
      const next = [...triggers];
      next[replaceTriggerIndex] = blankTrigger(kind);
      onChange({ triggers: next, steps, notes });
      setPaletteOpen(false);
      setSelection({ kind: "trigger", index: replaceTriggerIndex });
      setReplaceTriggerIndex(null);
      return;
    }
    const next = [...triggers, blankTrigger(kind)];
    onChange({ triggers: next, steps, notes });
    setPaletteOpen(false);
    setPendingInsertion(null);
    setSelection({ kind: "trigger", index: next.length - 1 });
  };

  const addStep = (kind: WorkflowStepKind) => {
    const newStep = blankStep(kind);
    let nextSteps: WorkflowStep[];
    let newIndex: number;
    if (pendingInsertion) {
      const result = insertStep(steps, newStep, pendingInsertion);
      nextSteps = result.steps;
      newIndex = result.insertedAt;
    } else {
      nextSteps = [...steps, newStep];
      newIndex = nextSteps.length - 1;
    }
    onChange({ triggers, steps: nextSteps, notes });
    setPaletteOpen(false);
    setPendingInsertion(null);
    setSelection({ kind: "step", index: newIndex });
  };

  const updateTrigger = (index: number, t: WorkflowTrigger) => {
    const next = [...triggers];
    next[index] = t;
    onChange({ triggers: next, steps, notes });
  };

  const updateStep = (index: number, s: WorkflowStep) => {
    const current = steps[index];
    const idChanged =
      current && (current.id ?? undefined) !== (s.id ?? undefined);
    let next: WorkflowStep[];
    if (idChanged) {
      // Apply the non-id changes, then propagate the id rename to children.
      const intermediate = [...steps];
      intermediate[index] = { ...s, id: current.id };
      next = renameStepId(intermediate, index, s.id);
    } else {
      next = [...steps];
      next[index] = s;
    }
    onChange({ triggers, steps: next, notes });
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    onChange({ triggers, steps: next, notes });
    setSelection({ kind: "step", index: target });
  };

  const deleteTrigger = (index: number) => {
    const next = triggers.filter((_, i) => i !== index);
    onChange({ triggers: next, steps, notes });
    setSelection(null);
  };

  const deleteStep = (index: number) => {
    const next = removeStepAndDescendants(steps, index);
    onChange({ triggers, steps: next, notes });
    setSelection(null);
  };

  // ─── Notes ───────────────────────────────────────────────────────────
  // Notes round-trip through the same `onChange` so the parent sees one
  // unified draft state. We compute the next `z` by max+1 so newly added
  // notes always render on top.

  const addNoteAtViewportCenter = useCallback(() => {
    // Project the screen-center pixel into flow coords so the note lands
    // wherever the user is currently looking, regardless of pan/zoom.
    const viewport = reactFlow.getViewport();
    // Fallback when called before the canvas has mounted dimensions.
    const screenCenter = reactFlow.screenToFlowPosition?.({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }) ?? { x: -viewport.x / viewport.zoom, y: -viewport.y / viewport.zoom };
    const id =
      (globalThis.crypto && "randomUUID" in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(36).slice(2, 10));
    const maxZ = notes.reduce((m, n) => (n.z > m ? n.z : m), 0);
    const note: WorkflowNote = {
      id,
      body: "",
      x: screenCenter.x - NOTE_DEFAULT_WIDTH / 2,
      y: screenCenter.y - NOTE_DEFAULT_HEIGHT / 2,
      width: NOTE_DEFAULT_WIDTH,
      height: NOTE_DEFAULT_HEIGHT,
      color: NOTE_DEFAULT_COLOR,
      z: maxZ + 1,
    };
    onChange({ triggers, steps, notes: [...notes, note] });
    setSelection(null);
    setSelectedNoteId(id);
  }, [reactFlow, notes, triggers, steps, onChange]);

  const updateNote = useCallback(
    (id: string, patch: Partial<Omit<WorkflowNote, "id">>) => {
      const next = notes.map((n) => (n.id === id ? { ...n, ...patch } : n));
      onChange({ triggers, steps, notes: next });
    },
    [notes, triggers, steps, onChange],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const next = notes.filter((n) => n.id !== id);
      onChange({ triggers, steps, notes: next });
      setSelectedNoteId((cur) => (cur === id ? null : cur));
    },
    [notes, triggers, steps, onChange],
  );

  const bringNoteToFront = useCallback(
    (id: string) => {
      const maxZ = notes.reduce((m, n) => (n.z > m ? n.z : m), 0);
      updateNote(id, { z: maxZ + 1 });
    },
    [notes, updateNote],
  );

  const sendNoteToBack = useCallback(
    (id: string) => {
      const minZ = notes.reduce((m, n) => (n.z < m ? n.z : m), 0);
      updateNote(id, { z: minZ - 1 });
    },
    [notes, updateNote],
  );

  const handleNoteGeometryChange = useCallback(
    (
      id: string,
      patch: { x?: number; y?: number; width?: number; height?: number },
    ) => {
      updateNote(id, patch);
    },
    [updateNote],
  );

  const noteCallbacks: NoteCallbacks = {
    onUpdate: updateNote,
    onDelete: deleteNote,
    onBringToFront: bringNoteToFront,
    onSendToBack: sendNoteToBack,
  };

  const showInspector = selection !== null && !paletteOpen;

  const selectedId =
    selectedNoteId !== null
      ? `note-${selectedNoteId}`
      : selection?.kind === "trigger"
        ? `trigger-${selection.index}`
        : selection?.kind === "step" && steps[selection.index]
          ? stepNodeName(steps[selection.index], selection.index)
          : null;

  // Open palette in response to an external signal (e.g. bottom action bar).
  // Skip the initial mount so the palette only opens on actual signal changes.
  const lastPaletteSignal = useRef(openPaletteSignal);
  useEffect(() => {
    if (openPaletteSignal === undefined) return;
    if (lastPaletteSignal.current === openPaletteSignal) return;
    lastPaletteSignal.current = openPaletteSignal;
    openPalette(triggers.length === 0 ? "triggers" : "actions");
  }, [openPaletteSignal, openPalette, triggers.length]);

  // Add-note signal — same pattern as the palette signal.
  const lastAddNoteSignal = useRef(addNoteSignal);
  useEffect(() => {
    if (addNoteSignal === undefined) return;
    if (lastAddNoteSignal.current === addNoteSignal) return;
    lastAddNoteSignal.current = addNoteSignal;
    addNoteAtViewportCenter();
  }, [addNoteSignal, addNoteAtViewportCenter]);

  return (
    <NoteCallbacksProvider value={noteCallbacks}>
      <div className="flex h-full min-h-0 w-full">
        <div className="relative flex-1">
          {isEmpty && notes.length === 0 ? (
            <EmptyCanvas onAddTrigger={() => openPalette("triggers")} />
          ) : (
            <WorkflowGraph
              triggers={triggers}
              steps={steps}
              notes={notes}
              selectedId={selectedId}
              onSelect={handleSelectNodeId}
              onRequestInsert={handleRequestInsert}
              onNoteGeometryChange={handleNoteGeometryChange}
              panningMode={panningMode}
            />
          )}
        </div>

        <NodePalette
          open={paletteOpen}
          initialTab={paletteTab}
          lockTab={
            replaceTriggerIndex !== null || triggers.length === 0
              ? "triggers"
              : "actions"
          }
          title={replaceTriggerIndex !== null ? "Replace trigger" : "Add node"}
          onAddTrigger={addTrigger}
          onAddStep={addStep}
          onClose={() => {
            setPaletteOpen(false);
            setPendingInsertion(null);
            setReplaceTriggerIndex(null);
          }}
        />

        <NodeInspector
          open={showInspector}
          selection={selection}
          triggers={triggers}
          steps={steps}
          onChangeTrigger={updateTrigger}
          onChangeStep={updateStep}
          onReplaceTrigger={handleReplaceTrigger}
          onMoveStep={moveStep}
          onDeleteTrigger={deleteTrigger}
          onDeleteStep={deleteStep}
          onClose={() => setSelection(null)}
          webhookBaseUrl={webhookBaseUrl}
          otherWorkflows={otherWorkflows}
          serverError={serverError}
        />
      </div>
    </NoteCallbacksProvider>
  );
}
