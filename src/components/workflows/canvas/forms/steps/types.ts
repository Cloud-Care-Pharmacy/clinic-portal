import type { Workflow, WorkflowStep } from "@/types";

export type StepErrors = Record<string, string | undefined>;

export interface StepFormProps<T extends WorkflowStep> {
  step: T;
  onChange: (next: T) => void;
  errors?: StepErrors;
  /** Other steps (used for branch_if target picker). */
  otherSteps?: { id: string; label: string }[];
  /** Other workflows (used for call_workflow picker). */
  otherWorkflows?: Workflow[];
}
