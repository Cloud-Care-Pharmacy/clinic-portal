"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowGraph } from "./WorkflowGraph";
import { EmptyCanvas } from "./EmptyCanvas";
import { NodePalette } from "./NodePalette";
import { NodeInspector, type Selection } from "./NodeInspector";
import { blankTrigger } from "./forms/TriggerForms";
import { blankStep } from "./forms/StepForms";
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
}

export function WorkflowEditor({
  triggers,
  steps,
  onChange,
  webhookBaseUrl,
  otherWorkflows,
  serverError,
}: WorkflowEditorProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTab, setPaletteTab] = useState<"triggers" | "actions">(
    "actions"
  );

  const isEmpty = triggers.length === 0 && steps.length === 0;

  const openPalette = useCallback(
    (tab: "triggers" | "actions") => {
      setPaletteTab(tab);
      setPaletteOpen(true);
      setSelection(null);
    },
    []
  );

  const handleSelectNodeId = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelection(null);
        return;
      }
      setPaletteOpen(false);
      const m = id.match(/^(trigger|step)-(\d+)$/);
      if (!m) return;
      setSelection({
        kind: m[1] as "trigger" | "step",
        index: Number(m[2]),
      });
    },
    []
  );

  const addTrigger = (kind: WorkflowTriggerKind) => {
    const next = [...triggers, blankTrigger(kind)];
    onChange({ triggers: next, steps });
    setPaletteOpen(false);
    setSelection({ kind: "trigger", index: next.length - 1 });
  };

  const addStep = (kind: WorkflowStepKind) => {
    const next = [...steps, blankStep(kind)];
    onChange({ triggers, steps: next });
    setPaletteOpen(false);
    setSelection({ kind: "step", index: next.length - 1 });
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
  const rightOpen = showInspector || paletteOpen;

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="relative flex-1">
        {/* Top-right controls */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-border bg-popover p-1 shadow-sm">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              openPalette(triggers.length === 0 ? "triggers" : "actions")
            }
            className="h-7 gap-1 px-2 text-xs font-semibold"
          >
            <Plus className="size-3" />
            Add
          </Button>
        </div>

        {isEmpty ? (
          <EmptyCanvas onAddTrigger={() => openPalette("triggers")} />
        ) : (
          <WorkflowGraph
            triggers={triggers}
            steps={steps}
            selectedId={
              selection
                ? selection.kind === "trigger"
                  ? `trigger-${selection.index}`
                  : `step-${selection.index}`
                : null
            }
            onSelect={handleSelectNodeId}
          />
        )}
      </div>

      {paletteOpen && (
        <NodePalette
          initialTab={paletteTab}
          onAddTrigger={addTrigger}
          onAddStep={addStep}
          onClose={() => setPaletteOpen(false)}
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

      {/* Hidden marker to keep React happy when right panel toggles */}
      {!rightOpen && null}
    </div>
  );
}
