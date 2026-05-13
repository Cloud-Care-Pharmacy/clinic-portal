"use client";

import { useState } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Field } from "../Field";
import type { WorkflowEventTrigger } from "@/types";
import type { TriggerErrors, TriggerFormProps } from "./types";
import {
  EVENT_BY_TYPE,
  EVENT_ENTITIES,
  entityForEventType,
  type EventEntity,
} from "./event-catalog";

type Mode = "pick" | "custom";

export function EventTriggerForm({
  trigger,
  onChange,
  errors,
}: TriggerFormProps<WorkflowEventTrigger>) {
  const matched = EVENT_BY_TYPE[trigger.eventType];
  const initialEntity = entityForEventType(trigger.eventType) ?? null;

  // If the value is non-empty and not in the catalog, default to the custom
  // input so the existing free-text value remains editable.
  // (Read at the `if (mode === "custom")` early-return below.)
  const [mode, setMode] = useState<Mode>(
    trigger.eventType && !matched ? "custom" : "pick"
  );
  const [selectedEntity, setSelectedEntity] = useState<EventEntity | null>(
    initialEntity
  );

  // ----- Custom (free-text) mode ---------------------------------------------
  if (mode === "custom") {
    return (
      <>
        <Field
          label="Custom event type"
          hint="Dotted name like `consultation.scheduled`. Use this only for events not yet in the catalog."
          error={errors?.eventType}
        >
          <Input
            value={trigger.eventType}
            onChange={(e) => onChange({ ...trigger, eventType: e.target.value })}
            placeholder="consultation.scheduled"
            className="font-mono text-xs"
          />
        </Field>
        <button
          type="button"
          onClick={() => {
            setMode("pick");
            setSelectedEntity(entityForEventType(trigger.eventType) ?? null);
          }}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          ← Back to event catalog
        </button>
      </>
    );
  }

  // ----- Confirmed selection summary -----------------------------------------
  if (matched) {
    const EntityIcon = matched.entity.icon;
    return (
      <Field label="Event" error={errors?.eventType}>
        <div className="rounded-md border border-border bg-card p-3">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <EntityIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {matched.entity.label}
              </div>
              <div className="text-sm font-medium text-foreground">{matched.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {matched.description}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <button
              type="button"
              onClick={() => {
                onChange({ ...trigger, eventType: "" });
                setSelectedEntity(matched.entity);
              }}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Change event
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3" />
              Use custom event type
            </button>
          </div>
        </div>
      </Field>
    );
  }

  // ----- Step 2: pick an event within the chosen entity ----------------------
  if (selectedEntity) {
    const EntityIcon = selectedEntity.icon;
    return (
      <>
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedEntity(null)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-3" />
            All entities
          </button>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground">
            <EntityIcon className="size-3.5 text-muted-foreground" />
            {selectedEntity.label}
          </div>
        </div>
        <Field label="Choose an event" error={errors?.eventType}>
          <div className="flex flex-col gap-1.5">
            {selectedEntity.events.map((event) => (
              <button
                key={event.eventType}
                type="button"
                onClick={() => onChange({ ...trigger, eventType: event.eventType })}
                className={cn(
                  "rounded-md border border-border bg-card px-3 py-2 text-left transition-colors",
                  "hover:border-primary hover:bg-accent"
                )}
              >
                <div className="text-sm font-medium text-foreground">{event.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {event.description}
                </div>
              </button>
            ))}
          </div>
        </Field>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3" />
          Use a custom event type
        </button>
      </>
    );
  }

  // ----- Step 1: pick an entity ----------------------------------------------
  return (
    <>
      <Field
        label="Choose an entity"
        hint="Pick the part of the system you want to react to."
        error={errors?.eventType}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {EVENT_ENTITIES.map((entity) => {
            const Icon = entity.icon;
            return (
              <button
                key={entity.id}
                type="button"
                onClick={() => setSelectedEntity(entity)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors",
                  "hover:border-primary hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {entity.label}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {entity.events.length} event
                  {entity.events.length === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>
      </Field>
      <button
        type="button"
        onClick={() => setMode("custom")}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        <Pencil className="size-3" />
        Use a custom event type
      </button>
    </>
  );
}

export type { TriggerErrors };
