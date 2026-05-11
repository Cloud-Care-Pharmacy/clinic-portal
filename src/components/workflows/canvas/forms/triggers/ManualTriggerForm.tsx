"use client";

export function ManualTriggerForm() {
  return (
    <p className="text-sm text-muted-foreground">
      Manual triggers fire only when the <strong>Test run</strong> button or the{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
        /workflows/trigger
      </code>{" "}
      API is invoked.
    </p>
  );
}
