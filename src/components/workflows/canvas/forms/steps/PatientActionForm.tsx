"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PATIENT_ACTION_FIELD_KEYS,
  PATIENT_ACTION_OPERATIONS,
  PATIENT_ACTION_PROFILE_TYPES,
  PATIENT_ACTION_STATUSES,
  WORKFLOW_STEP_ACTOR_ROLES,
  type PatientActionFieldKey,
  type PatientActionOperation,
  type PatientActionProfileType,
  type PatientActionStatus,
  type PatientActionStep,
  type WorkflowStepActor,
  type WorkflowStepActorRole,
} from "@/types";
import { Field, TemplatedField } from "../Field";
import { Collapsible } from "./shared";
import type { StepFormProps } from "./types";

/** Templated demographic fields, grouped the way the patient record reads. */
const FIELD_GROUPS: {
  label: string;
  fields: { key: PatientActionFieldKey; label: string; placeholder?: string }[];
}[] = [
  {
    label: "Name & contact",
    fields: [
      { key: "namePrefix", label: "Title", placeholder: "Ms" },
      { key: "firstName", label: "First name", placeholder: "{{event.payload.firstName}}" },
      { key: "lastName", label: "Last name", placeholder: "{{event.payload.lastName}}" },
      { key: "dateOfBirth", label: "Date of birth", placeholder: "1990-04-20" },
      { key: "gender", label: "Gender" },
      { key: "mobile", label: "Mobile", placeholder: "{{event.payload.phone}}" },
      { key: "forwardEmail", label: "Forward email" },
    ],
  },
  {
    label: "Address",
    fields: [
      { key: "streetAddress", label: "Street address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "postcode", label: "Postcode" },
      { key: "country", label: "Country" },
    ],
  },
  {
    label: "Medicare & PBS",
    fields: [
      { key: "medicareNumber", label: "Medicare number" },
      { key: "medicareIrn", label: "Medicare IRN" },
      { key: "medicareExpiry", label: "Medicare expiry", placeholder: "2030-06" },
      { key: "pbsPatientId", label: "PBS patient id" },
    ],
  },
  {
    label: "Intro source",
    fields: [
      { key: "introSourceDate", label: "Intro date", placeholder: "2026-08-04" },
      { key: "introSourceComments", label: "Intro comments" },
    ],
  },
];

/** Keys handled by dedicated pickers rather than a templated text input. */
const LITERAL_KEYS = new Set<PatientActionFieldKey>([
  "patientStatus",
  "deceased",
  "profileType",
]);

const CLEARABLE_KEYS = PATIENT_ACTION_FIELD_KEYS.filter(
  (k) => !LITERAL_KEYS.has(k)
);

export function PatientActionForm(props: StepFormProps<PatientActionStep>) {
  const { step, onChange, errors } = props;
  const isCreate = step.operation === "create";
  const isUpdate = step.operation === "update";
  const isArchive = step.operation === "archive";

  /** Strip the key entirely when cleared, so we never send `""`. */
  function patchField(key: PatientActionFieldKey, value: string) {
    onChange({ ...step, [key]: value ? value : undefined });
  }

  function patchActor(patch: Partial<WorkflowStepActor>) {
    const next: WorkflowStepActor = { ...(step.actor ?? {}), ...patch };
    const cleaned: WorkflowStepActor = {};
    if (next.actorId) cleaned.actorId = next.actorId;
    if (next.actorName) cleaned.actorName = next.actorName;
    if (next.actorRole) cleaned.actorRole = next.actorRole;
    onChange({ ...step, actor: Object.keys(cleaned).length ? cleaned : undefined });
  }

  function toggleClearField(key: PatientActionFieldKey, on: boolean) {
    const current = step.clearFields ?? [];
    const next = on ? [...current, key] : current.filter((k) => k !== key);
    onChange({ ...step, clearFields: next.length ? next : undefined });
  }

  return (
    <>
      <Field label="Operation" error={errors?.operation}>
        <Select
          value={step.operation ?? ""}
          onValueChange={(v) => {
            if (v) onChange({ ...step, operation: v as PatientActionOperation });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            {PATIENT_ACTION_OPERATIONS.map((op) => (
              <SelectItem key={op} value={op}>
                {op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isCreate ? (
        <>
          <TemplatedField
            label="Patient email"
            value={step.originalEmail ?? ""}
            onChange={(v) => onChange({ ...step, originalEmail: v })}
            placeholder="{{event.payload.email}}"
            hint="The patient's real email — used as the natural key. A duplicate inside the same entity is rejected."
            error={errors?.originalEmail}
          />
          <TemplatedField
            label="Entity id (optional)"
            value={step.entityId ?? ""}
            onChange={(v) => onChange({ ...step, entityId: v ? v : undefined })}
            placeholder="{{event.entityId}}"
            hint="Patients without an entity receive no workflow dispatch — set this if the new patient should be able to trigger flows."
            error={errors?.entityId}
          />
        </>
      ) : (
        <TemplatedField
          label="Patient id"
          value={step.patientId ?? ""}
          onChange={(v) => onChange({ ...step, patientId: v })}
          placeholder="{{event.payload.patientId}}"
          error={errors?.patientId}
        />
      )}

      {isArchive && (
        <Field
          label="Direction"
          hint="Archiving is reversible and keeps clinical history. Re-running against an already-archived patient is a no-op, not an error."
        >
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!step.restore}
              onChange={(e) =>
                onChange({ ...step, restore: e.target.checked ? true : undefined })
              }
            />
            Restore (un-archive) instead of archiving
          </label>
        </Field>
      )}

      {(isCreate || isUpdate) && (
        <>
          <Field label="Status (optional)" error={errors?.patientStatus}>
            <Select
              value={step.patientStatus ?? ""}
              onValueChange={(v) =>
                v && onChange({ ...step, patientStatus: v as PatientActionStatus })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Leave unchanged" />
              </SelectTrigger>
              <SelectContent>
                {PATIENT_ACTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Profile type (optional)" error={errors?.profileType}>
            <Select
              value={step.profileType ?? ""}
              onValueChange={(v) =>
                v && onChange({ ...step, profileType: v as PatientActionProfileType })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Leave unchanged" />
              </SelectTrigger>
              <SelectContent>
                {PATIENT_ACTION_PROFILE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {FIELD_GROUPS.map((group) => (
            <Collapsible
              key={group.label}
              label={group.label}
              defaultOpen={group.fields.some((f) => step[f.key] !== undefined)}
            >
              {group.fields.map((f) => (
                <TemplatedField
                  key={f.key}
                  label={f.label}
                  value={(step[f.key] as string | undefined) ?? ""}
                  onChange={(v) => patchField(f.key, v)}
                  placeholder={f.placeholder}
                  error={errors?.[f.key]}
                />
              ))}
            </Collapsible>
          ))}

          <Collapsible label="Deceased flag">
            <Field label="Deceased">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!!step.deceased}
                  onChange={(e) =>
                    onChange({
                      ...step,
                      deceased: e.target.checked ? true : undefined,
                    })
                  }
                />
                Mark the patient as deceased
              </label>
            </Field>
          </Collapsible>
        </>
      )}

      {isUpdate && (
        <Collapsible
          label="Clear fields"
          defaultOpen={!!step.clearFields?.length}
        >
          <p className="mb-3 text-[11px] text-muted-foreground">
            A field above whose template resolves to nothing is left untouched, so
            a missing variable can never blank patient data. Tick a column here to
            null it on purpose.
          </p>
          <div className="mb-4 flex flex-col gap-1.5">
            {CLEARABLE_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!!step.clearFields?.includes(key)}
                  onChange={(e) => toggleClearField(key, e.target.checked)}
                />
                <span className="font-mono">{key}</span>
              </label>
            ))}
          </div>
        </Collapsible>
      )}

      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="patientResult"
          className="font-mono text-xs"
        />
      </Field>

      <Collapsible label="Actor & source (optional)">
        <p className="mb-3 text-[11px] text-muted-foreground">
          Stamped on the activity / audit records for this change. When omitted,
          the backend records this as “System”.
        </p>
        <TemplatedField
          label="Actor id"
          value={step.actor?.actorId ?? ""}
          onChange={(v) => patchActor({ actorId: v })}
          placeholder="{{event.payload.userId}}"
        />
        <TemplatedField
          label="Actor name"
          value={step.actor?.actorName ?? ""}
          onChange={(v) => patchActor({ actorName: v })}
          placeholder="Dr Smith"
        />
        <Field label="Actor role">
          <Select
            value={step.actor?.actorRole ?? ""}
            onValueChange={(v) =>
              v && patchActor({ actorRole: v as WorkflowStepActorRole })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {WORKFLOW_STEP_ACTOR_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Source"
          hint="Provenance recorded on the audit row and event payload. Defaults to “workflow”."
          error={errors?.source}
        >
          <Input
            value={step.source ?? ""}
            onChange={(e) =>
              onChange({ ...step, source: e.target.value ? e.target.value : undefined })
            }
            placeholder="workflow"
            className="font-mono text-xs"
          />
        </Field>
      </Collapsible>
    </>
  );
}
