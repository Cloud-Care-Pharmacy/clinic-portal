"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Collapsible } from "./shared";
import type { StepFormProps } from "./types";

/* -----------------------------------------------------------------------------
 * Operation catalog — grouped + described in plain English.
 * -------------------------------------------------------------------------- */

interface OpMeta {
  value: ShopifyAdminOperation;
  label: string;
}

const OPERATION_GROUPS: { label: string; ops: OpMeta[] }[] = [
  {
    label: "Customers",
    ops: [
      { value: "create_customer", label: "Create a customer" },
      { value: "update_customer", label: "Update a customer" },
      { value: "set_customer_metafield", label: "Save custom data on a customer" },
    ],
  },
  {
    label: "Orders",
    ops: [
      { value: "create_order", label: "Create an order" },
      { value: "update_order", label: "Update an order" },
      { value: "create_draft_order", label: "Create a draft order" },
      { value: "cancel_order", label: "Cancel an order" },
      { value: "close_order", label: "Close an order" },
      { value: "create_transaction", label: "Record a transaction" },
    ],
  },
  {
    label: "Products",
    ops: [
      { value: "create_product", label: "Create a product" },
      { value: "update_product", label: "Update a product" },
    ],
  },
  {
    label: "Inventory",
    ops: [{ value: "adjust_inventory", label: "Adjust stock" }],
  },
];

/** Friendly one-liner shown under the operation dropdown. */
const OPERATION_DESCRIPTIONS: Record<ShopifyAdminOperation, string> = {
  create_customer: "Add a new customer record to your Shopify store.",
  update_customer:
    "Change details on an existing Shopify customer — tags, notes, email, phone, etc.",
  set_customer_metafield:
    "Save extra information against a customer (custom Shopify metadata). Use this for things like a patient ID — not for built-in fields like tags or notes.",
  create_order: "Create a new order in Shopify.",
  update_order: "Change details on an existing Shopify order.",
  create_draft_order: "Create a draft order that can be completed later.",
  cancel_order: "Cancel an existing order.",
  close_order: "Mark an order as closed.",
  create_transaction: "Record a transaction (capture, refund, etc.) on an order.",
  create_product: "Add a new product to your Shopify store.",
  update_product: "Change details on an existing Shopify product.",
  adjust_inventory:
    "Add stock to or remove stock from an inventory location.",
};

/* -----------------------------------------------------------------------------
 * Per-operation field map — labels are user-facing copy.
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

interface IdFieldMeta {
  name: IdFieldName;
  label: string;
  hint: string;
  required: boolean;
}

interface ObjectFieldMeta {
  name: ObjectFieldName;
  label: string;
  hint: string;
  required: boolean;
}

interface OperationFields {
  ids: IdFieldMeta[];
  objects: ObjectFieldMeta[];
  metafield: boolean;
  inventory: boolean;
}

const CUSTOMER_ID: IdFieldMeta = {
  name: "customerId",
  label: "Customer",
  hint: "The Shopify customer this applies to. Paste their Shopify ID or use a value from the trigger, e.g. {{event.payload.customerId}}.",
  required: true,
};
const ORDER_ID: IdFieldMeta = {
  name: "orderId",
  label: "Order",
  hint: "The Shopify order this applies to.",
  required: true,
};
const PRODUCT_ID: IdFieldMeta = {
  name: "productId",
  label: "Product",
  hint: "The Shopify product this applies to.",
  required: true,
};
const INVENTORY_ITEM_ID: IdFieldMeta = {
  name: "inventoryItemId",
  label: "Inventory item",
  hint: "The Shopify inventory item to adjust.",
  required: true,
};
const LOCATION_ID: IdFieldMeta = {
  name: "locationId",
  label: "Location",
  hint: "The Shopify location where stock is being adjusted.",
  required: true,
};

function customerObject(label = "Customer details"): ObjectFieldMeta {
  return {
    name: "customer",
    label,
    hint: "What to set on the customer — tags, note, email, phone, addresses, etc. (Not for custom metadata — use the 'Save custom data on a customer' action for that.)",
    required: true,
  };
}
function orderObject(label = "Order details"): ObjectFieldMeta {
  return { name: "order", label, hint: "What to set on the order.", required: true };
}

function operationFields(op: ShopifyAdminOperation): OperationFields {
  switch (op) {
    case "create_customer":
      return {
        ids: [],
        objects: [customerObject("New customer details")],
        metafield: false,
        inventory: false,
      };
    case "update_customer":
      return {
        ids: [CUSTOMER_ID],
        objects: [customerObject("Changes to apply")],
        metafield: false,
        inventory: false,
      };
    case "set_customer_metafield":
      return {
        ids: [CUSTOMER_ID],
        objects: [],
        metafield: true,
        inventory: false,
      };
    case "create_order":
      return {
        ids: [],
        objects: [orderObject("New order details")],
        metafield: false,
        inventory: false,
      };
    case "update_order":
      return {
        ids: [ORDER_ID],
        objects: [orderObject("Changes to apply")],
        metafield: false,
        inventory: false,
      };
    case "create_draft_order":
      return {
        ids: [],
        objects: [
          {
            name: "draftOrder",
            label: "Draft order details",
            hint: "Line items, customer, discounts, etc.",
            required: true,
          },
        ],
        metafield: false,
        inventory: false,
      };
    case "cancel_order":
      return {
        ids: [ORDER_ID],
        objects: [
          {
            name: "options",
            label: "Cancel options (optional)",
            hint: "Reason for the cancellation, whether to refund, whether to restock, etc.",
            required: false,
          },
        ],
        metafield: false,
        inventory: false,
      };
    case "close_order":
      return {
        ids: [ORDER_ID],
        objects: [],
        metafield: false,
        inventory: false,
      };
    case "create_transaction":
      return {
        ids: [ORDER_ID],
        objects: [
          {
            name: "transaction",
            label: "Transaction details",
            hint: "Kind (sale / capture / refund), amount, currency, gateway, etc.",
            required: true,
          },
        ],
        metafield: false,
        inventory: false,
      };
    case "create_product":
      return {
        ids: [],
        objects: [
          {
            name: "product",
            label: "New product details",
            hint: "Title, body html, variants, options, etc.",
            required: true,
          },
        ],
        metafield: false,
        inventory: false,
      };
    case "update_product":
      return {
        ids: [PRODUCT_ID],
        objects: [
          {
            name: "product",
            label: "Changes to apply",
            hint: "What to set on the product.",
            required: true,
          },
        ],
        metafield: false,
        inventory: false,
      };
    case "adjust_inventory":
      return {
        ids: [INVENTORY_ITEM_ID, LOCATION_ID],
        objects: [],
        metafield: false,
        inventory: true,
      };
  }
}

/* -----------------------------------------------------------------------------
 * Example payloads — the "Insert example" button on JSON editors uses these
 * so non-technical users have a starting point.
 * -------------------------------------------------------------------------- */

const OBJECT_EXAMPLES: Partial<
  Record<ObjectFieldName, Record<ShopifyAdminOperation, Record<string, unknown> | undefined>>
> = {
  customer: {
    create_customer: {
      email: "{{event.payload.email}}",
      first_name: "{{event.payload.firstName}}",
      last_name: "{{event.payload.lastName}}",
      tags: "patient",
    },
    update_customer: {
      tags: "workflow, reviewed",
      note: "Updated by workflow {{run.id}}",
    },
    set_customer_metafield: undefined,
    create_order: undefined,
    update_order: undefined,
    create_draft_order: undefined,
    cancel_order: undefined,
    close_order: undefined,
    create_transaction: undefined,
    create_product: undefined,
    update_product: undefined,
    adjust_inventory: undefined,
  },
  order: {
    create_order: {
      line_items: [{ variant_id: 0, quantity: 1 }],
      customer: { id: "{{event.payload.customerId}}" },
      financial_status: "paid",
    },
    update_order: { tags: "fulfilled" },
    create_customer: undefined,
    update_customer: undefined,
    set_customer_metafield: undefined,
    create_draft_order: undefined,
    cancel_order: undefined,
    close_order: undefined,
    create_transaction: undefined,
    create_product: undefined,
    update_product: undefined,
    adjust_inventory: undefined,
  },
  draftOrder: {
    create_draft_order: {
      line_items: [{ variant_id: 0, quantity: 1 }],
      customer: { id: "{{event.payload.customerId}}" },
    },
    create_customer: undefined,
    update_customer: undefined,
    set_customer_metafield: undefined,
    create_order: undefined,
    update_order: undefined,
    cancel_order: undefined,
    close_order: undefined,
    create_transaction: undefined,
    create_product: undefined,
    update_product: undefined,
    adjust_inventory: undefined,
  },
  options: {
    cancel_order: {
      reason: "customer",
      email: true,
      refund: false,
      restock: true,
    },
    create_customer: undefined,
    update_customer: undefined,
    set_customer_metafield: undefined,
    create_order: undefined,
    update_order: undefined,
    create_draft_order: undefined,
    close_order: undefined,
    create_transaction: undefined,
    create_product: undefined,
    update_product: undefined,
    adjust_inventory: undefined,
  },
  transaction: {
    create_transaction: {
      kind: "capture",
      amount: "10.00",
      currency: "AUD",
    },
    create_customer: undefined,
    update_customer: undefined,
    set_customer_metafield: undefined,
    create_order: undefined,
    update_order: undefined,
    create_draft_order: undefined,
    cancel_order: undefined,
    close_order: undefined,
    create_product: undefined,
    update_product: undefined,
    adjust_inventory: undefined,
  },
  product: {
    create_product: {
      title: "{{event.payload.productTitle}}",
      body_html: "<p>Description</p>",
      vendor: "Cloud Care",
      product_type: "Prescription",
    },
    update_product: { tags: "in-stock" },
    create_customer: undefined,
    update_customer: undefined,
    set_customer_metafield: undefined,
    create_order: undefined,
    update_order: undefined,
    create_draft_order: undefined,
    cancel_order: undefined,
    close_order: undefined,
    create_transaction: undefined,
    adjust_inventory: undefined,
  },
};

/* -----------------------------------------------------------------------------
 * Field-clearing helpers — keep saved JSON tidy when operation changes.
 * -------------------------------------------------------------------------- */

const ALL_OP_FIELDS = [
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
] as const;

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

/** Seed sensible defaults so non-technical users don't have to know
 * Shopify metafield terminology. */
function applyOperationDefaults(
  step: ShopifyAdminStep,
  op: ShopifyAdminOperation,
): ShopifyAdminStep {
  if (op === "set_customer_metafield") {
    return {
      ...step,
      namespace: step.namespace ?? "quity",
      type: step.type ?? "single_line_text_field",
    };
  }
  return step;
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
    const keep = fieldsForOperation(next);
    let cleaned: ShopifyAdminStep = { ...step, operation: next };
    for (const f of ALL_OP_FIELDS) {
      if (!keep.has(f)) {
        delete (cleaned as unknown as Record<string, unknown>)[f];
      }
    }
    cleaned = applyOperationDefaults(cleaned, next);
    onChange(cleaned);
  }

  return (
    <>
      <Field label="Action" error={errors?.operation}>
        <Select
          value={op}
          onValueChange={(v) => {
            if (v) handleOperationChange(v as ShopifyAdminOperation);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose what to do in Shopify" />
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

      <OperationDescription text={OPERATION_DESCRIPTIONS[op]} />

      {meta.ids.map((id) => (
        <IdField
          key={id.name}
          label={id.label}
          value={step[id.name]}
          onChange={(v) =>
            onChange({ ...step, [id.name]: v } as ShopifyAdminStep)
          }
          hint={id.hint}
          error={errors?.[id.name]}
        />
      ))}

      {meta.inventory && (
        <IdField
          label="Quantity change"
          allowNegative
          value={step.availableAdjustment}
          onChange={(v) =>
            onChange({
              ...step,
              availableAdjustment: v,
            } as ShopifyAdminStep)
          }
          hint="Use a positive number to add stock (e.g. 5) or a negative number to remove stock (e.g. -3)."
          error={errors?.availableAdjustment}
        />
      )}

      {meta.metafield && (
        <MetafieldBasics step={step} onChange={onChange} errors={errors} />
      )}

      {meta.objects.map((obj) => (
        <JsonObjectField
          key={obj.name}
          label={obj.label}
          value={step[obj.name]}
          onChange={(v) =>
            onChange({ ...step, [obj.name]: v } as ShopifyAdminStep)
          }
          hint={obj.hint}
          example={OBJECT_EXAMPLES[obj.name]?.[op]}
          error={errors?.[obj.name]}
        />
      ))}

      <Collapsible label="Advanced settings">
        {/*
          shopDomain is required by the backend (it's the KV lookup key for the
          Admin API token). Long-term this should be auto-filled from a
          "Shopify connection" entity setting and the field removed entirely;
          until that exists, we keep it editable but tucked away so single-store
          tenants don't have to think about it.
        */}
        <TemplatedField
          label="Shopify store (multi-store only)"
          value={step.shopDomain ?? ""}
          onChange={(v) => onChange({ ...step, shopDomain: v })}
          placeholder="my-store"
          hint="Normally set up once with your Shopify connection — only change this if you have more than one Shopify store connected and need to target a specific one. Accepts a store handle (my-store) or the full *.myshopify.com address."
          error={errors?.shopDomain}
        />
        {meta.metafield && (
          <MetafieldAdvanced step={step} onChange={onChange} errors={errors} />
        )}
        <Field
          label="Save the result as (optional)"
          hint="If set, later steps in this workflow can read the result back using this name, e.g. {{vars.customer.id}}."
          error={errors?.storeAs}
        >
          <Input
            value={step.storeAs ?? ""}
            onChange={(e) =>
              onChange({ ...step, storeAs: e.target.value || undefined })
            }
            placeholder="customer"
            className="font-mono text-xs"
          />
        </Field>
      </Collapsible>
    </>
  );
}

/* -----------------------------------------------------------------------------
 * UI bits
 * -------------------------------------------------------------------------- */

function OperationDescription({ text }: { text: string }) {
  return (
    <div className="mb-4 flex gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <p>{text}</p>
    </div>
  );
}

/* Metafield UX split: "basics" (Value) above the fold, the Shopify-jargon
 * fields (Namespace / Key / Type) tucked into Advanced with smart defaults
 * pre-filled so most users never need to touch them. */

function MetafieldBasics({
  step,
  onChange,
  errors,
}: {
  step: ShopifyAdminStep;
  onChange: (next: ShopifyAdminStep) => void;
  errors?: StepFormProps<ShopifyAdminStep>["errors"];
}) {
  return (
    <TemplatedField
      label="Value to save"
      value={step.value ?? ""}
      onChange={(v) => onChange({ ...step, value: v })}
      placeholder="{{event.payload.patientId}}"
      hint="The value you want to store on the customer. Use {{event.…}} or {{vars.…}} to pull from earlier steps."
      multiline
      rows={3}
      error={errors?.value}
    />
  );
}

function MetafieldAdvanced({
  step,
  onChange,
  errors,
}: {
  step: ShopifyAdminStep;
  onChange: (next: ShopifyAdminStep) => void;
  errors?: StepFormProps<ShopifyAdminStep>["errors"];
}) {
  const isKnownType =
    !step.type || (SHOPIFY_METAFIELD_TYPES as readonly string[]).includes(step.type);
  const [customType, setCustomType] = useState(!isKnownType);

  return (
    <>
      <div className="mb-3 text-[11px] text-muted-foreground">
        These control how Shopify groups and reads the custom data. The defaults
        work for most cases — only change them if you know you need to.
      </div>
      <Field
        label="Group (namespace)"
        hint="Like a folder name for your custom data in Shopify."
        error={errors?.namespace}
      >
        <Input
          value={step.namespace ?? ""}
          onChange={(e) =>
            onChange({ ...step, namespace: e.target.value || undefined })
          }
          placeholder="quity"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="Field name (key)"
        hint="The name of this specific piece of data, e.g. patient_id."
        error={errors?.key}
      >
        <Input
          value={step.key ?? ""}
          onChange={(e) =>
            onChange({ ...step, key: e.target.value || undefined })
          }
          placeholder="patient_id"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="Data type"
        hint="Tells Shopify what kind of value you're saving. 'Single-line text' works for IDs and short strings."
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
                <SelectValue placeholder="Pick a data type" />
              </SelectTrigger>
              <SelectContent>
                {SHOPIFY_METAFIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {METAFIELD_TYPE_LABELS[t] ?? t}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Other (type a value)…</SelectItem>
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
                Back to list
              </button>
            </div>
          )}
        </div>
      </Field>
    </>
  );
}

const METAFIELD_TYPE_LABELS: Record<string, string> = {
  single_line_text_field: "Single-line text",
  multi_line_text_field: "Multi-line text",
  number_integer: "Whole number",
  number_decimal: "Decimal number",
  boolean: "Yes / no",
  date: "Date",
  date_time: "Date and time",
  json: "JSON",
  url: "URL",
};

/* -----------------------------------------------------------------------------
 * ID field — number-or-template, hidden coercion.
 * -------------------------------------------------------------------------- */

interface IdFieldProps {
  label: string;
  value: string | number | undefined;
  onChange: (next: string | number | undefined) => void;
  hint: string;
  error?: string;
  allowNegative?: boolean;
}

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
      placeholder={
        allowNegative
          ? "e.g. 5  or  -3  or  {{event.payload.delta}}"
          : "e.g. 12345  or  {{event.payload.customerId}}"
      }
      hint={hint}
      error={error}
    />
  );
}

/* -----------------------------------------------------------------------------
 * JSON object field — with "Insert example" helper.
 * -------------------------------------------------------------------------- */

interface JsonObjectFieldProps {
  label: string;
  value: Record<string, unknown> | undefined;
  onChange: (next: Record<string, unknown> | undefined) => void;
  hint: string;
  example?: Record<string, unknown>;
  error?: string;
}

function JsonObjectField({
  label,
  value,
  onChange,
  hint,
  example,
  error,
}: JsonObjectFieldProps) {
  const [draft, setDraft] = useState(() =>
    value ? JSON.stringify(value, null, 2) : "",
  );
  const [parseError, setParseError] = useState<string | undefined>();

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
        setParseError("This needs to be a JSON object — wrap it in { … }.");
        return;
      }
      setParseError(undefined);
      onChange(parsed as Record<string, unknown>);
    } catch (e) {
      setParseError(
        e instanceof Error
          ? `That's not valid JSON: ${e.message}`
          : "That's not valid JSON.",
      );
    }
  }

  const showError = parseError ?? error;
  const showInsertExample = !!example && draft.trim() === "";

  return (
    <Field label={label} hint={!showError ? hint : undefined} error={showError}>
      <Textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        rows={8}
        spellCheck={false}
        className={cn("font-mono text-xs", showError && "border-destructive")}
        placeholder={'{\n  "tags": "workflow",\n  "note": "Updated by {{run.id}}"\n}'}
      />
      {showInsertExample && (
        <div className="mt-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => handleChange(JSON.stringify(example, null, 2))}
          >
            Insert example
          </Button>
        </div>
      )}
    </Field>
  );
}
