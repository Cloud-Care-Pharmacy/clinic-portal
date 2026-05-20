"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANCH_OPS, isUnaryBranchOp } from "@/types";
import type { RouterStep, WorkflowBranchOp, WorkflowRouterBranch } from "@/types";
import { Field, TemplatedField } from "../Field";
import type { StepFormProps } from "./types";

export function RouterForm(props: StepFormProps<RouterStep>) {
  const { step, onChange, errors } = props;
  const branches = step.branches ?? [];
  const fallback = step.fallback;

  const updateBranch = (idx: number, next: WorkflowRouterBranch) => {
    const copy = branches.slice();
    copy[idx] = next;
    onChange({ ...step, branches: copy });
  };

  const addBranch = () => {
    onChange({
      ...step,
      branches: [...branches, { name: `Branch ${branches.length + 1}` }],
    });
  };

  const removeBranch = (idx: number) => {
    onChange({
      ...step,
      branches: branches.filter((_, i) => i !== idx),
    });
  };

  const moveBranch = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= branches.length) return;
    const copy = branches.slice();
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    onChange({ ...step, branches: copy });
  };

  const setCondition = (idx: number, next: WorkflowRouterBranch["condition"]) =>
    updateBranch(idx, { ...branches[idx], condition: next });

  const enableCondition = (idx: number) => {
    setCondition(idx, { left: "", op: "eq", right: "" });
  };

  const disableCondition = (idx: number) => {
    setCondition(idx, undefined);
  };

  const toggleFallback = (enabled: boolean) => {
    onChange({
      ...step,
      fallback: enabled ? { name: "Otherwise" } : undefined,
    });
  };

  return (
    <>
      <Field
        label="Execution"
        hint="Whether all matching branches run, or only the first."
      >
        <Select
          value={step.executionType ?? "first_match"}
          onValueChange={(v) =>
            v &&
            onChange({
              ...step,
              executionType: v as RouterStep["executionType"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_match">First match wins</SelectItem>
            <SelectItem value="all_match">Run all matching</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Branches</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={addBranch}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Plus className="size-3.5" />
            Add branch
          </Button>
        </div>

        {branches.map((branch, idx) => (
          // WorkflowRouterBranch has no stable id; branches are addressed by
          // index throughout the editor (move/remove/condition handlers).
          <RouterBranchEditor
            key={idx}
            index={idx}
            total={branches.length}
            branch={branch}
            error={errors?.[`branches.${idx}.name`]}
            onChange={(next) => updateBranch(idx, next)}
            onRemove={() => removeBranch(idx)}
            onMove={(dir) => moveBranch(idx, dir)}
            onEnableCondition={() => enableCondition(idx)}
            onDisableCondition={() => disableCondition(idx)}
          />
        ))}

        <FallbackEditor
          fallback={fallback}
          onToggle={toggleFallback}
          onRename={(name) => onChange({ ...step, fallback: { ...fallback, name } })}
        />
      </div>
    </>
  );
}

interface RouterBranchEditorProps {
  index: number;
  total: number;
  branch: WorkflowRouterBranch;
  error?: string;
  onChange: (next: WorkflowRouterBranch) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onEnableCondition: () => void;
  onDisableCondition: () => void;
}

function RouterBranchEditor({
  index,
  total,
  branch,
  error,
  onChange,
  onRemove,
  onMove,
  onEnableCondition,
  onDisableCondition,
}: RouterBranchEditorProps) {
  const condition = branch.condition;
  const isUnary = condition ? isUnaryBranchOp(condition.op) : false;

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-border/60 bg-muted/30 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Field label={`Branch ${index + 1} name`} error={error}>
            <Input
              value={branch.name}
              onChange={(e) => onChange({ ...branch, name: e.target.value })}
              placeholder="Branch name"
            />
          </Field>
        </div>
        <div className="mt-6 flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move branch up"
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move branch down"
          >
            <ChevronDown className="size-3.5" />
          </Button>
          {total > 1 && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground"
              onClick={onRemove}
              aria-label="Remove branch"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!condition ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-fit gap-1 px-2 text-xs"
          onClick={onEnableCondition}
        >
          <Plus className="size-3.5" />
          Add condition
        </Button>
      ) : (
        <Field label="Condition">
          <div className="flex flex-col gap-2">
            <TemplatedField
              label=""
              value={condition.left}
              onChange={(v) =>
                onChange({ ...branch, condition: { ...condition, left: v } })
              }
              placeholder="{{vars.outreach.outcome}}"
            />
            <div className="flex gap-2">
              <Select
                value={condition.op}
                onValueChange={(v) =>
                  v &&
                  onChange({
                    ...branch,
                    condition: { ...condition, op: v as WorkflowBranchOp },
                  })
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_OPS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isUnary && (
                <Input
                  value={condition.right ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...branch,
                      condition: { ...condition, right: e.target.value },
                    })
                  }
                  placeholder='"reached"'
                  className="flex-1 font-mono text-xs"
                />
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-fit gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={onDisableCondition}
            >
              <Trash2 className="size-3" />
              Remove condition
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}

interface FallbackEditorProps {
  fallback: { name?: string } | undefined;
  onToggle: (enabled: boolean) => void;
  onRename: (name: string) => void;
}

function FallbackEditor({ fallback, onToggle, onRename }: FallbackEditorProps) {
  if (!fallback) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-fit gap-1 px-2 text-xs"
        onClick={() => onToggle(true)}
      >
        <Plus className="size-3.5" />
        Add fallback branch
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-dashed border-border/60 bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Field label="Fallback branch" hint="Runs when no branch condition matches.">
            <Input
              value={fallback.name ?? ""}
              onChange={(e) => onRename(e.target.value)}
              placeholder="Otherwise"
            />
          </Field>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="mt-6 size-7 text-muted-foreground"
          onClick={() => onToggle(false)}
          aria-label="Remove fallback branch"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
