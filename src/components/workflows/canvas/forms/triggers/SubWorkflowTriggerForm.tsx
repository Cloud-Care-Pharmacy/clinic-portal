"use client";

export function SubWorkflowTriggerForm() {
  return (
    <p className="text-sm text-muted-foreground">
      This workflow is invokable from another workflow&apos;s{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
        call_workflow
      </code>{" "}
      step. It must also be active.
    </p>
  );
}
