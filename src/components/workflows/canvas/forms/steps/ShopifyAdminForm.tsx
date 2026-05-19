"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  SHOPIFY_METAFIELD_TYPES,
  type ShopifyAdminOperation,
  type ShopifyAdminStep,
} from "@/types";
import { Field, TemplatedField } from "../Field";
import type { StepFormProps } from "./types";

/* -----------------------------------------------------------------------------
 * Operation catalog (grouped for the Select dropdown).
 * -------------------------------------------------------------------------- */

interface OpMeta {
  value: ShopifyAdminOperation;
  label: string;
}

const OPERATION_GROUPS: { label: string; ops: OpMeta[] }[] = [
  {
    label: "Customers",
    ops: [
      { value: "create_customer", label: "Create customer" },
      { value: "update_customer", label: "Update customer" },
      { value: "set_customer_metafield", label: "Set customer metafield" },
    ],
  },
  {
    label: "Orders",
    ops: [
      { value: "create_order", label: "Create order" },
      { value: "update_order", label: "Update order" },
      { value: "create_draft_order", label: "Create draft order" },
      { value: "cancel_order", label: "Cancel order" },
      { value: "close_order", label: "Close order" },
      { value: "create_transaction", label: "Create transaction" },
    ],
  },
  {
    label: "Products",
    ops: [
      { value: "create_product", label: "Create product" },
      { value: "update_product", label: "Update product" },
    ],
  },
  {
    label: "Inventory",
    ops: [{ value: "adjust_inventory", label: "Adjust inventory" }],
  },
];

/* -----------------------------------------------------------------------------
 * Field name helpers — keep operation→field wiring in one place.
 * -------------------------------------------------------------------------- */

type IdFieldName =
  | "customerId"
  | "orderId"
  | "productId"
  | "inventoryItemId"
  | "locationId";

type ObjectFieldName =
  | "customer"
  | "order"
  | "draftOrder"
  | "options"
  | "transaction"
  | "product";

interface OperationFields {
  ids: { name: IdFieldName; label: string; required: boolean }[];
  objects: {
    name: ObjectFieldName;
    label: string;
    required: boolean;
    hint?: string;
  }[];
  metafield: boolean;
  inventory: boolean;
}

function operationFields(op: ShopifyAdminOperation): OperationFields {
  switch (op) {
    case "create_customer":
      return {
        ids: [],
        objects: [{ name: "customer", label: "Customer", required: true }],
        metafield: false,
        inventory: false,
      };
    case "update_customer":
      return {
        ids: [{ name: "customerId", label: "Customer ID", required: true }],
        objects: [{ name: "customer", label: "Customer", required: true }],
        metafield: false,
        inventory: false,
      };
    case "set_customer_metafield":
      return {
        ids: [{ name: "customerId", label: "Customer ID", required: true }],
        objects: [],
        metafield: true,
        inventory: false,
      };
    case "create_order":
      return {
        ids: [],
        objects: [{ name: "order", label: "Order", required: true }],
        metafield: false,
        inventory: false,
      };
    case "update_order":
      return {
        ids: [{ name: "orderId", label: "Order ID", required: true }],
        objects: [{ name: "order", label: "Order", required: true }],
        metafield: false,
        inventory: false,
      };
    case "create_draft_order":
      return {
        ids: [],
        objects: [{ name: "draftOrder", label: "Draft order", required: true }],
        metafield: false,
        inventory: false,
      };
    case "cancel_order":
      return {
        ids: [{ name: "orderId", label: "Order ID", required: true }],
        objects: [
          {
            name: "options",
            label: "Options",
            required: false,
            hint: "Optional Shopify cancel options (reason, refund, restock, …).",
          },
        ],
        metafield: false,
        inventory: false,
      };
    case "close_order":
      return {
        ids: [{ name: "orderId", label: "Order ID", required: true }],
        objects: [],
        metafield: false,
        inventory: false,
      };
    case "create_transaction":
      return {
        ids: [{ name: "orderId", label: "Order ID", required: true }],
        objects: [
          { name: "transaction", label: "Transaction", required: true },
        ],
        metafield: false,
        inventory: false,
      };
    case "create_product":
      return {
        ids: [],
        objects: [{ name: "product", label: "Product", required: true }],
        metafield: false,
        inventory: false,
      };
    case "update_product":
      return {
        ids: [{ name: "productId", label: "Product ID", required: true }],
        objects: [{ name: "product", label: "Product", required: true }],
        metafield: false,
        inventory: false,
      };
    case "adjust_inventory":
      return {
        ids: [
          { name: "inventoryItemId", label: "Inventory item ID", required: true },
          { name: "locationId", label: "Location ID", required: true },
        ],
        objects: [],
        metafield: false,
        inventory: true,
      };
  }
}

/** Fields that may be present on a `ShopifyAdminStep` but are not used by
 * the selected operation. Cleared when the operation changes so saved JSON
 * stays tidy. */
const ALL_OP_FIELDS: (IdFieldName | ObjectFieldName | "availableAdjustment" | "namespace" | "key" | "type" | "value")[] = [
  "customerId",
  "orderId",
  "productId",
  "inventoryItemId",
  "locationId",
  "availableAdjustment",
  "namespace",
  "key",
  "type",
  "value",
  "customer",
  "order",
  "draftOrder",
  "options",
  "transaction",
  "product",
];

function fieldsForOperation(op: ShopifyAdminOperation): Set<string> {
  const meta = operationFields(op);
  const used = new Set<string>();
  for (const id of meta.ids) used.add(id.name);
  for (const obj of meta.objects) used.add(obj.name);
  if (meta.metafield) {
    used.add("namespace");
    used.add("key");
    used.add("type");
    used.add("value");
  }
  if (meta.inventory) used.add("availableAdjustment");
  return used;
}

/* -----------------------------------------------------------------------------
 * Form
 * -------------------------------------------------------------------------- */

export function ShopifyAdminForm(props: StepFormProps<ShopifyAdminStep>) {
  const { step, onChange, errors } = props;
  const op = step.operation;
  const meta = useMemo(() => operationFields(op), [op]);

  function handleOperationChange(next: ShopifyAdminOperation) {
    if (next === op) return;
    // Drop fields the new operation doesn't use, so saved JSON stays clean
    // and backend validation isn't confused by stale wrappers.
    const keep = fieldsForOperation(next);
    const cleaned: ShopifyAdminStep = { ...step, operation: next };
    for (const f of ALL_OP_FIELDS) {
      if (!keep.has(f)) {
        delete (cleaned as unknown as Record<string, unknown>)[f];
      }
    }
    onChange(cleaned);
  }

  return (
    <>
      <Field label="Operation" error={errors?.operation}>
        <Select
          value={op}
          onValueChange={(v) => {
            if (v) handleOperationChange(v as ShopifyAdminOperation);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            {OPERATION_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.ops.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <TemplatedField
        label="Shop domain"
        value={step.shopDomain ?? ""}
        onChange={(v) => onChange({ ...step, shopDomain: v })}
        placeholder="test-store.myshopify.com"
        hint="Accepts `test-store`, `test-store.myshopify.com`, or a templated value. Backend normalizes to *.myshopify.com. The Admin API token is resolved server-side; do not enter it here."
        monospace
        error={errors?.shopDomain}
      />

      {meta.ids.map((id) => (
        <IdField
          key={id.name}
          label={id.label + (id.required ? "" : " (optional)")}
          value={step[id.name]}
          onChange={(v) => onChange({ ...step, [id.name]: v } as ShopifyAdminStep)}
          error={errors?.[id.name]}
        />
      ))}

      {meta.inventory && (
        <IdField
          label="Available adjustment"
          allowNegative
          value={step.availableAdjustment}
          onChange={(v) =>
            onChange({ ...step, availableAdjustment: v } as ShopifyAdminStep)
          }
          hint="Positive to add stock, negative to remove. Template values allowed."
          error={errors?.availableAdjustment}
        />
      )}

      {meta.metafield && (
        <MetafieldFields step={step} onChange={onChange} errors={errors} />
      )}

      {meta.objects.map((obj) => (
        <JsonObjectField
          key={obj.name}
          label={obj.label + (obj.required ? "" : " (optional)")}
          value={step[obj.name]}
          onChange={(v) =>
            onChange({ ...step, [obj.name]: v } as ShopifyAdminStep)
          }
          hint={
            obj.hint ??
            "JSON object sent through to Shopify after template interpolation. Nested string values may use {{event.*}} / {{vars.*}}."
          }
          error={errors?.[obj.name]}
        />
      ))}

      <Field label="Store result as (optional)" error={errors?.storeAs}>
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) =>
            onChange({ ...step, storeAs: e.target.value || undefined })
          }
          placeholder="shopifyResource"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}

/* -----------------------------------------------------------------------------
 * Sub-fields
 * -------------------------------------------------------------------------- */

function MetafieldFields({
  step,
  onChange,
  errors,
}: {
  step: ShopifyAdminStep;
  onChange: (next: ShopifyAdminStep) => void;
  errors?: StepFormProps<ShopifyAdminStep>["errors"];
}) {
  // Free-text fallback for the `type` field — Shopify can add new types.
  const isKnownType =
    !step.type || (SHOPIFY_METAFIELD_TYPES as readonly string[]).includes(step.type);
  const [customType, setCustomType] = useState(!isKnownType);

  return (
    <>
      <TemplatedField
        label="Namespace"
        value={step.namespace ?? ""}
        onChange={(v) => onChange({ ...step, namespace: v })}
        placeholder="quity"
        hint="Shopify metafield namespace. Required."
        monospace
        error={errors?.namespace}
      />
      <TemplatedField
        label="Key"
        value={step.key ?? ""}
        onChange={(v) => onChange({ ...step, key: v })}
        placeholder="patient_id"
        hint="Shopify metafield key. Required."
        monospace
        error={errors?.key}
      />
      <Field
        label="Type"
        hint="Shopify metafield type. Choose 'Custom…' to enter a value Shopify added recently."
        error={errors?.type}
      >
        <div className="flex flex-col gap-1.5">
          {!customType ? (
            <Select
              value={step.type ?? ""}
              onValueChange={(v) => {
                if (!v) return;
                if (v === "__custom__") {
                  setCustomType(true);
                  return;
                }
                onChange({ ...step, type: v });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select metafield type" />
              </SelectTrigger>
              <SelectContent>
                {SHOPIFY_METAFIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom…</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                value={step.type ?? ""}
                onChange={(e) => onChange({ ...step, type: e.target.value })}
                placeholder="single_line_text_field"
                className="font-mono text-xs"
              />
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCustomType(false);
                  onChange({ ...step, type: undefined });
                }}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </Field>
      <TemplatedField
        label="Value"
        value={step.value ?? ""}
        onChange={(v) => onChange({ ...step, value: v })}
        placeholder="{{event.payload.patientId}}"
        hint="Required. Max 131,072 characters. Templating allowed."
        multiline
        rows={3}
        monospace
        error={errors?.value}
      />
    </>
  );
}

interface IdFieldProps {
  label: string;
  value: string | number | undefined;
  onChange: (next: string | number | undefined) => void;
  hint?: string;
  error?: string;
  allowNegative?: boolean;
}

/**
 * Input for Shopify ID / integer fields. Accepts either a literal number
 * or a templated string; we treat anything containing `{{` as a template,
 * otherwise try to coerce to a number so the persisted JSON keeps the
 * `number` shape the backend expects.
 */
function IdField({
  label,
  value,
  onChange,
  hint,
  error,
  allowNegative,
}: IdFieldProps) {
  const text = value === undefined || value === null ? "" : String(value);
  return (
    <TemplatedField
      label={label}
      value={text}
      onChange={(v) => {
        const trimmed = v.trim();
        if (trimmed === "") {
          onChange(undefined);
          return;
        }
        if (trimmed.includes("{{")) {
          onChange(v);
          return;
        }
        const re = allowNegative ? /^-?\d+$/ : /^\d+$/;
        if (re.test(trimmed)) {
          onChange(Number(trimmed));
          return;
        }
        // Not a clean number and not a template — keep as string so the
        // author can keep typing; backend will surface a final error.
        onChange(v);
      }}
      placeholder={allowNegative ? "1 or -2 or {{vars.delta}}" : "12345 or {{event.payload.id}}"}
      hint={
        hint ?? "Positive integer, or a template that resolves to one."
      }
      monospace
      error={error}
    />
  );
}

interface JsonObjectFieldProps {
  label: string;
  value: Record<string, unknown> | undefined;
  onChange: (next: Record<string, unknown> | undefined) => void;
  hint?: string;
  error?: string;
}

/**
 * Inline JSON object editor. Backend expects a real object (not a string),
 * so we keep a local draft string for editing and only commit a parsed
 * object to the step when JSON.parse succeeds and produces an object.
 * Parse errors are shown inline; they do not overwrite the saved value.
 */
function JsonObjectField({
  label,
  value,
  onChange,
  hint,
  error,
}: JsonObjectFieldProps) {
  const [draft, setDraft] = useState(() =>
    value ? JSON.stringify(value, null, 2) : "",
  );
  const [parseError, setParseError] = useState<string | undefined>();

  // Sync draft when upstream value changes from outside (e.g. switching
  // nodes or operation reset).
  const lastValueRef = useRef(value);
  useEffect(() => {
    if (lastValueRef.current === value) return;
    lastValueRef.current = value;
    setDraft(value ? JSON.stringify(value, null, 2) : "");
    setParseError(undefined);
  }, [value]);

  function handleChange(next: string) {
    setDraft(next);
    const trimmed = next.trim();
    if (trimmed === "") {
      setParseError(undefined);
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setParseError("Must be a JSON object (use `{ … }`).");
        return;
      }
      setParseError(undefined);
      onChange(parsed as Record<string, unknown>);
    } catch (e) {
      setParseError(
        e instanceof Error ? `Invalid JSON: ${e.message}` : "Invalid JSON.",
      );
    }
  }

  const showError = parseError ?? error;
  return (
    <Field label={label} hint={!showError ? hint : undefined} error={showError}>
      <Textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        rows={8}
        spellCheck={false}
        className={cn(
          "font-mono text-xs",
          showError && "border-destructive",
        )}
        placeholder={'{\n  "tags": "workflow",\n  "note": "Updated by {{run.id}}"\n}'}
      />
    </Field>
  );
}
