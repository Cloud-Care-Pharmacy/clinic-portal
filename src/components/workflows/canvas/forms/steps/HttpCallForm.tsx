"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HttpCallAuth, HttpCallStep, WorkflowStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import { KeyValueEditor, StepIdField } from "./shared";
import type { StepFormProps } from "./types";

export function HttpCallForm(props: StepFormProps<HttpCallStep>) {
  const { step, onChange, errors } = props;
  const auth: HttpCallAuth = step.auth ?? { type: "none" };
  return (
    <>
      <Field label="Method" error={errors?.method}>
        <Select
          value={step.method ?? "GET"}
          onValueChange={(v) =>
            v && onChange({ ...step, method: v as HttpCallStep["method"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <TemplatedField
        label="URL"
        value={step.url ?? ""}
        onChange={(v) => onChange({ ...step, url: v })}
        placeholder="https://example.com/hook"
        hint="Only public https:// URLs are allowed. Cloud metadata and private IP ranges (e.g. 169.254.169.254, 10.0.0.0/8) are blocked."
        monospace
        error={errors?.url}
      />
      <Field
        label="Query params (optional)"
        hint="Templated values appended to the URL after template resolution."
        error={errors?.queryParams}
      >
        <KeyValueEditor
          values={step.queryParams}
          onChange={(queryParams) => onChange({ ...step, queryParams })}
          keyPlaceholder="patientId"
          valuePlaceholder="{{event.payload.patientId}}"
          addLabel="Add param"
        />
      </Field>
      <Field label="Headers (optional)" error={errors?.headers}>
        <KeyValueEditor
          values={step.headers}
          onChange={(headers) => onChange({ ...step, headers })}
          keyPlaceholder="X-Tenant-Id"
          valuePlaceholder="{{vars.tenant.id}}"
          addLabel="Add header"
        />
      </Field>
      <Field label="Auth (optional)">
        <Select
          value={auth.type}
          onValueChange={(v) => {
            if (!v) return;
            if (v === "none") {
              onChange({ ...step, auth: undefined });
            } else if (v === "basic") {
              onChange({
                ...step,
                auth: { type: "basic", username: "", password: "" },
              });
            } else if (v === "bearer") {
              onChange({ ...step, auth: { type: "bearer", token: "" } });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="bearer">Bearer</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {auth.type === "basic" && (
        <>
          <TemplatedField
            label="Basic — username"
            value={auth.username}
            onChange={(v) => onChange({ ...step, auth: { ...auth, username: v } })}
            placeholder="{{vars.creds.user}}"
            monospace
          />
          <TemplatedField
            label="Basic — password"
            value={auth.password}
            onChange={(v) => onChange({ ...step, auth: { ...auth, password: v } })}
            placeholder="{{vars.creds.password}}"
            monospace
          />
        </>
      )}
      {auth.type === "bearer" && (
        <TemplatedField
          label="Bearer — token"
          value={auth.token}
          onChange={(v) => onChange({ ...step, auth: { ...auth, token: v } })}
          placeholder="{{vars.token}}"
          monospace
        />
      )}
      <TemplatedField
        label="Body (optional)"
        value={
          typeof step.body === "string"
            ? step.body
            : step.body
              ? JSON.stringify(step.body, null, 2)
              : ""
        }
        onChange={(v) => onChange({ ...step, body: v })}
        multiline
        rows={5}
        monospace
        error={errors?.body}
      />
      <Field
        label="Timeout (ms, optional)"
        hint="100 to 60,000."
        error={errors?.timeoutMs}
      >
        <Input
          type="number"
          min={100}
          max={60_000}
          value={step.timeoutMs ?? ""}
          onChange={(e) =>
            onChange({
              ...step,
              timeoutMs: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="30000"
          className="font-mono text-xs"
        />
      </Field>
      <Field label="Follow redirects" hint="Defaults to true.">
        <Select
          value={step.followRedirects === false ? "false" : "true"}
          onValueChange={(v) => {
            if (!v) return;
            onChange({
              ...step,
              followRedirects: v === "false" ? false : undefined,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Follow (default)</SelectItem>
            <SelectItem value="false">Manual (do not follow)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field
        label="Failure mode"
        hint="Default 'return' stores non-2xx responses; 'throw' fails the run."
      >
        <Select
          value={step.failureMode ?? "return"}
          onValueChange={(v) => {
            if (!v) return;
            onChange({
              ...step,
              failureMode: v === "return" ? undefined : "throw",
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="return">Return (default)</SelectItem>
            <SelectItem value="throw">Throw on non-2xx</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Store response as (optional)" error={errors?.storeAs}>
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value || undefined })}
          placeholder="response"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="Max response bytes (optional)"
        hint="1 to 65,536. Defaults to 16,384."
        error={errors?.maxResponseBytes}
      >
        <Input
          type="number"
          min={1}
          max={65_536}
          value={step.maxResponseBytes ?? ""}
          onChange={(e) =>
            onChange({
              ...step,
              maxResponseBytes: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="16384"
          className="font-mono text-xs"
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}
