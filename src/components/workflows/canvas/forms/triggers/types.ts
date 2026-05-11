import type { WorkflowTrigger } from "@/types";

export type TriggerErrors = Record<string, string | undefined>;

export interface TriggerFormProps<T extends WorkflowTrigger> {
  trigger: T;
  onChange: (next: T) => void;
  errors?: TriggerErrors;
}
