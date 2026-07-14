# Backend Handoff — Products, Orders & Inventory

**From:** clinic-portal frontend · **To:** backend team · **Date:** 14 Jul 2026
**Purpose:** the portal needs backend support for three features: product catalog, orders, and inventory. This document describes **what the frontend needs as a consumer** — the data the UI displays, the operations it performs, the rules it expects enforced, and the integration conventions it already uses. **How** it's built — storage, schema, framework, internal architecture — is entirely the backend team's decision. Where we propose vocabularies (statuses, reasons), they're suggestions from the built UI; we just need a final agreed list.

---

## 1. Where the frontend stands

| Feature | Frontend state | What it needs from backend |
|---|---|---|
| **Products** | UI is **fully built and shipped behind a mock**: list with stat tiles/search/filters, 5-tab detail (incl. stock adjustment + activity), 4-tab create/edit form. Swapping the mock for real hooks is ~1–2 days once endpoints exist | CRUD + stock operations + list/filter/aggregates |
| **Orders** | Empty placeholder page only — greenfield. We build the UI to whatever contract we agree | List/detail/create + Rx verification + fulfilment lifecycle |
| **Inventory** | No page yet; the product detail UI already has Stock/Activity tabs designed around adjustments with reasons and a movement history | Stock movement history + alerts (low stock / expiring) |

Relevant frontend code, for reference: `src/components/products/mock-products.ts` (the working data model), `src/components/products/ProductForm.tsx` (what create/edit submits), `src/app/(dashboard)/products/*`, `src/app/(dashboard)/orders/*`.

---

## 2. How the frontend will call you (existing conventions)

These are observations about what integrates with **zero frontend plumbing** — deviations are fine, they just cost us a small adapter; please just decide once, up front.

- **Transport:** browser → portal's `/api/proxy/[...path]` → gateway. The proxy forwards any `/api/<path>` verbatim and injects `X-API-Key` and `X-Clerk-User-Id` (the acting user) on every request. Endpoints under `/api/...` require no frontend server changes; a new root-level path group would need a one-line proxy tweak — either works, tell us the paths.
- **Envelope:** `{ "success": true, "data": { ... } }`; lists as `{ <items>: [...], "pagination": { "limit", "offset", "total", "truncated"? } }` with `limit`/`offset` query params (this mirrors `/api/tasks` — see `TasksListResponse`, `src/types/index.ts:796`).
- **Errors:** non-2xx with `{ "error": "<human-readable message>", "details"? }` — our client surfaces `error` directly in toasts. For rule violations the UI must distinguish (see §5), a stable machine-readable `code` field alongside the message would be appreciated but isn't mandatory if status codes are distinct.
- **Formats:** dates as ISO-8601 strings; IDs as opaque strings (we URL-encode them); money currently handled as plain AUD numbers in the UI — if you prefer cents or string decimals, fine, just say so and we'll adapt the mapper.

---

## 3. Capabilities the UI needs — Products

The UI's working shape is in **Appendix A** (the exact TypeScript the pages render today). Field *names* are negotiable — we'll rename to match your contract in one mapping layer — but the *semantics and optionality* reflect what the built UI displays and edits.

1. **List** with server-side: free-text search (name / SKU / brand / generic name / active ingredient), filters by category, schedule, status (multi-select), low-stock and expiring-soon quick filters, sort (name, SKU, stock, price, updated), pagination.
2. **Aggregates for the stat tiles**: total, active, low-stock count, expiring-soon count, S8 count. One cheap call preferred; if the catalog stays small we can compute client-side from the list — your call, tell us which.
3. **Get one / create / update.** Create and update receive the payload shown in Appendix B (what the form emits today). Lifecycle status changes (`active | inactive | discontinued | recalled`) can be part of update or a dedicated operation — your choice.
4. **Stock adjustment as an explicit operation** — *not* a writable stock field on update. The UI sends a signed quantity change with a **reason** and optional note; it needs back the new stock level. Suggested reason vocabulary (drives a picker; amend freely, we need the final list): `received, dispensed, adjusted, damaged, expired, stocktake, returned`.
5. **Movement history per product** for the detail page's Activity tab: when, who (user id — we'll resolve display names), delta, reason, note, and ideally the resulting balance, newest-first, paginated.

UI threshold semantics you should know (currently client-side; keep or centralise as you prefer): *low stock* = `stock ≤ reorderLevel`; *expiring soon* = earliest expiry within **90 days** (`EXPIRY_WARNING_DAYS`, `mock-products.ts:204`).

## 4. Capabilities the UI needs — Orders & Inventory

Orders are greenfield on our side, so this is a requirements list rather than an existing shape — we'll freeze our types from your contract.

**Order list page:** columns order number, created date, patient/customer name, item count, total, payment state, order status, Rx state badge. Server-side filters: status, payment state, Rx state, patient, free-text search (order number / patient name), date range; pagination + sort. Plus summary counts for stat tiles (e.g. open, awaiting Rx, ready to ship, shipped today).

**Order detail page needs:**
- Header: order number, status, payment state, timestamps, patient link (`patientId` — orders should be linkable to an existing patient record; whether it's required is a product decision, §7).
- Line items: product reference + display snapshot (name, SKU), quantity, unit price, line total, and the pharmacy flags the UI badges — **schedule** and **requires-prescription** — as they were at order time.
- Rx verification state **per line**: does this line require a prescription; which prescription record is linked (id from the existing prescriptions API); verified by whom/when.
- Totals: subtotal, GST, shipping, total — **computed by the backend**; the UI displays money, it never calculates it.

**Operations:**
1. **Create order** (staff-initiated v1): patient, lines (product id + quantity, optional price override), shipping details, note.
2. **Verify Rx** on a line: attach a `prescriptionId` (from the patient's existing prescriptions). We'd expect the backend to validate the prescription belongs to the order's patient.
3. **Fulfil / ship**: with optional tracking number + carrier. We expect this to decrement stock (see §5) — the UI will not issue separate stock calls.
4. **Cancel**: with reason; whether stock is restocked is your call — expose the behaviour so the UI can say it.
5. **Mark paid / refunded** (manual v1 — see §7 on payments).

**Status vocabulary** — proposal from the planned UI (badges + filters); collapse or extend as you see fit, we just need the final enum and which transitions are legal so the UI can show the right actions: `pending → awaiting_rx → processing → ready_to_ship → shipped → completed`, with `cancelled`, and `draft` if you want creation-in-progress. Payment as an independent axis: `unpaid | paid | refunded`.

**Inventory page:**
1. **Alerts**: lists of low-stock, out-of-stock, and expiring-soon products (bounded, e.g. top N by severity).
2. **Movement listing across all products** with filters: reason, product, actor, date range — and by **schedule = S8**, which is how the UI renders a **controlled-drug register view** (actor, timestamp, delta, running balance, reference to the originating order where applicable). If a running balance per movement isn't feasible, say so — we'll compute within the loaded window and note the limitation.

## 5. Rules the frontend expects the backend to own

The UI will mirror these as affordances (disabled buttons, warnings — several are already built), but treats the backend as authoritative. What we need is **defined error behaviour** we can render: distinct status codes (or stable `code`s) + a human message.

| # | Rule | UI expectation on violation |
|---|---|---|
| 1 | SKU unique per entity | create/update rejected; message names the conflict |
| 2 | Stock can never go negative | adjustment/fulfilment rejected; message says available qty |
| 3 | S4/S8 products ⇒ requires-prescription forced true | server corrects or rejects (form already auto-ticks — `ProductForm.tsx:295`) |
| 4 | A line requiring a prescription cannot be fulfilled without a linked, valid prescription | fulfil rejected; response identifies the offending line(s) |
| 5 | `recalled` products: not orderable; block fulfilment of open orders containing them | create/fulfil rejected; the order list/detail can flag affected orders |
| 6 | Money (GST, totals) computed server-side | UI displays only |
| 7 | Every mutation attributed to the acting user (`X-Clerk-User-Id` is on every proxied request) and auditable | movement history / order events show who did what |

Anything beyond these (e.g. S3 handling, expiry blocking dispense) is a product decision — see §7.

---

## 6. What we need from you (the actual asks)

1. **A contract** for the capabilities in §3–§4: endpoint paths + request/response examples. Format is your choice — OpenAPI, or simply one example JSON request/response per endpoint is enough. We freeze our TypeScript types from it, so it's the one thing we need *fixed* before we wire pages.
2. **The final enums**: order statuses (+ legal transitions), payment states, stock-movement reasons, and error codes/status codes for the §5 rules.
3. **Decisions** on the §7 product questions that shape the UI.
4. **A staging deployment** we can point the portal at, with seed data. We can hand you **10 realistic AU-pharmacy seed products** ready to import — the current mock data (`mock-products.ts:240–514`) covers S2/S3/S4/S8, cold-chain, controlled storage, PBS/ARTG codes, low-stock and expiring cases.
5. **Sequencing info**: if you ship products before orders (natural split), tell us — we'll swap the Products pages live first and stage the rest.
6. **A contact/channel** for contract questions while we build in parallel.

Nothing else: the UI polls via React Query, so **no webhooks or push events are needed** for v1.

## 7. Open product questions (need product/backend input — they change the UI)

1. **Roles:** portal roles are only `admin | practitioner | staff` (`src/types/index.ts:1655`). Who may edit products, adjust stock, verify Rx, fulfil? Is a `pharmacist` role being added?
2. **Patient linkage:** is a patient required on every order, or are walk-in/no-patient sales allowed?
3. **Payments v1:** is manual mark-paid acceptable, with gateway-integrated payments later?
4. **Order numbering:** any required format (for labels/receipts), or backend-generated opaque numbers?
5. **S3 (pharmacist-only) items:** any recorded intervention step required before fulfilment, beyond the acting user on the fulfil action?
6. **Batch/lot tracking:** the shipped UI models a single `earliestExpiry` per product. Is per-batch tracking in scope now (bigger contract) or later (our assumption)?

## 8. Our side, once the contract lands (for visibility)

Freeze types from your contract → build `use-products` / `use-orders` / `use-inventory` hooks → swap the Products pages off the mock (~1–2 d) → build Orders list/detail/create + Rx panel (~2–3 d) → Inventory page (~1–2 d). We can start hooks and page scaffolding against your example payloads before staging is even up. **Frontend total ≈ 4–6 days after contract freeze**, phases shippable independently.

---

## Appendix A — the shape the Products UI renders today

Verbatim from `src/components/products/mock-products.ts` (field names negotiable; semantics are what the UI displays/edits):

```ts
type ProductCategory = "prescription" | "otc" | "supplement" | "device"
                     | "consumable" | "compounded" | "accessory";
type ProductForm     = "tablet" | "capsule" | "liquid" | "cream" | "ointment" | "injection"
                     | "inhaler" | "drops" | "patch" | "spray" | "device" | "other";
type ProductSchedule = "unscheduled" | "S2" | "S3" | "S4" | "S8";   // AU Poisons Standard
type ProductStorage  = "room" | "refrigerated" | "frozen" | "controlled";
type ProductStatus   = "active" | "inactive" | "discontinued" | "recalled";

interface Product {
  id: string;
  // identification
  name: string; brand?: string; genericName?: string;
  sku: string; barcode?: string;                       // barcode = GTIN
  // pharmaceutical
  category: ProductCategory; form: ProductForm;
  strength?: string; packSize?: string; activeIngredient?: string;
  // regulatory (AU)
  schedule: ProductSchedule; requiresPrescription: boolean;
  artgNumber?: string; pbsCode?: string;
  // inventory
  stock: number; reorderLevel: number; supplier?: string;
  storage: ProductStorage; earliestExpiry?: string;    // ISO date
  // pricing (AUD)
  costPrice?: number; price: number; gstApplicable: boolean;
  // lifecycle
  status: ProductStatus; description?: string;
  createdAt: string; updatedAt: string;                // ISO datetime
}
```

## Appendix B — what the create/edit form submits today

`ProductInput` = `Product` minus `id`/`createdAt`/`updatedAt` (see `formDataToProductInput`, `ProductForm.tsx:157`): trimmed strings, SKU upper-cased, numbers parsed, optional fields omitted when empty. This is the JSON we'd naturally `POST`/`PATCH`; happy to reshape to your contract.

## Appendix C — envelope examples we consume elsewhere (for symmetry)

```jsonc
// list (mirrors GET /api/tasks)
{ "success": true, "data": {
    "products": [ /* ... */ ],
    "pagination": { "limit": 50, "offset": 0, "total": 132 }
} }

// single
{ "success": true, "data": { "product": { /* ... */ } } }

// error (any non-2xx)
{ "error": "SKU RX-AMX-500 already exists", "details": "…", "code": "sku_conflict" /* optional */ }
```
