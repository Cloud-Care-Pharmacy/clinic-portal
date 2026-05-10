"use client";

import { useCallback, useState } from "react";
import { WorkflowGraph } from "./WorkflowGraph";
import { EmptyCanvas } from "./EmptyCanvas";
import { NodePalette } from "./NodePalette";
import { NodeInspector, type Selection } from "./NodeInspector";
import { blankTrigger } from "./forms/TriggerForms";
import { blankStep } from "./forms/StepForms";
import { insertStep, stepNodeName } from "./lib/step-tree";
import type { InsertionRequest } from "./lib/canvas-context";
import type {
  Workflow,
  WorkflowStep,
  WorkflowStepKind,
  WorkflowTrigger,
  WorkflowTriggerKind,
} from "@/types";

interface WorkflowEditorProps {
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  onChange: (next: { triggers: WorkflowTrigger[]; steps: WorkflowStep[] }) => void;
  webhookBaseUrl?: string;
  otherWorkflows?: Workflow[];
  serverError?: { path?: string; message: string } | null;
  /**
   * Increment to programmatically open the node palette. Used by parent
   * action bars / shortcuts.
   */
  openPaletteSignal?: number;
}

export function WorkflowEditor({
  triggers,
  steps,
  onChange,
  webhookBaseUrl,
  otherWorkflows,
  serverError,
  openPaletteSignal,
}: WorkflowEditorProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTab, setPaletteTab] = useState<"triggers" | "actions">("actions");
  const [pendingInsertion, setPendingInsertion] = useState<InsertionRequest | null>(
    null,
  );

  const isEmpty = triggers.length === 0 && steps.length === 0;

  const openPalette = useCallback((tab: "triggers" | "actions") => {
    setPaletteTab(tab);
    setPaletteOpen(true);
    setPendingInsertion(null);
    setSelection(null);
  }, []);

  const handleSelectNodeId = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelection(null);
        return;
      }
      setPaletteOpen(false);
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
    setSelection(null);
  }, []);

  const addTrigger = (kind: WorkflowTriggerKind) => {
    const next = [...triggers, blankTrigger(kind)];
    onChange({ triggers: next, steps });
    setPaletteOpen(false);
    setPendingInsertion(null);
    setSelection({ kind: "trigger", index: next.length - 1 });
  };

  const addStep = (kind: WorkflowStepKind) => {
    const newStep = blankStep(kind);
    let nextSteps: WorkflowStep[];
    let newIndex: number;
    if (pendingInsertion) {
      nextSteps = insertStep(steps, newStep, pendingInsertion);
      newIndex = nextSteps.findIndex((s, i) => steps[i] !== s);
      if (newIndex < 0) newIndex = nextSteps.length - 1;
    } else {
      nextSteps = [...steps, newStep];
      newIndex = nextSteps.length - 1;
    }
    onChange({ triggers, steps: nextSteps });
    setPaletteOpen(false);
    setPendingInsertion(null);
    setSelection({ kind: "step", index: newIndex });
  };

  const updateTrigger = (index: number, t: WorkflowTrigger) => {
    const next = [...triggers];
    next[index] = t;
    onChange({ triggers: next, steps });
  };

  const updateTriggerKind = (index: number, kind: WorkflowTriggerKind) => {
    const next = [...triggers];
    next[index] = blankTrigger(kind);
    onChange({ triggers: next, steps });
  };

  const updateStep = (index: number, s: WorkflowStep) => {
    const next = [...steps];
    next[index] = s;
    onChange({ triggers, steps: next });
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    onChange({ triggers, steps: next });
    setSelection({ kind: "step", index: target });
  };

  const deleteTrigger = (index: number) => {
    const next = triggers.filter((_, i) => i !== index);
    onChange({ triggers: next, steps });
    setSelection(null);
  };

  const deleteStep = (index: number) => {
    const next = steps.filter((_, i) => i !== index);
    onChange({ triggers, steps: next });
    setSelection(null);
  };

  const showInspector = selection !== null && !paletteOpen;

  const selectedId =
    selection?.kind === "trigger"
      ? `trigger-${selection.index}`
      : selection?.kind === "step" && steps[selection.index]
        ? stepNodeName(steps[selection.index], selection.index)
        : null;

  // Open palette in response to an external signal (e.g. bottom action bar).
  // Uses the "store previous prop" render-time pattern
  // (https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  const [lastSignal, setLastSignal] = useState(openPaletteSignal ?? 0);
  if ((openPaletteSignal ?? 0) !== lastSignal) {
    setLastSignal(openPaletteSignal ?? 0);
    openPalette(triggers.length === 0 ? "triggers" : "actions");
  }

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="relative flex-1">
        {isEmpty ? (
          <EmptyCanvas onAddTrigger={() => openPalette("triggers")} />
        ) : (
          <WorkflowGraph
            triggers={triggers}
            steps={steps}
            selectedId={selectedId}
            onSelect={handleSelectNodeId}
            onRequestInsert={handleRequestInsert}
          />
        )}
      </div>

      {paletteOpen && (
        <NodePalette
          initialTab={paletteTab}
          onAddTrigger={addTrigger}
          onAddStep={addStep}
          onClose={() => {
            setPaletteOpen(false);
            setPendingInsertion(null);
          }}
        />
      )}

      {showInspector && selection && (
        <NodeInspector
          selection={selection}
          triggers={triggers}
          steps={steps}
          onChangeTrigger={updateTrigger}
          onChangeStep={updateStep}
          onChangeTriggerKind={updateTriggerKind}
          onMoveStep={moveStep}
          onDeleteTrigger={deleteTrigger}
          onDeleteStep={deleteStep}
          onClose={() => setSelection(null)}
          webhookBaseUrl={webhookBaseUrl}
          otherWorkflows={otherWorkflows}
          serverError={serverError}
        />
      )}
    </div>
  );
}
