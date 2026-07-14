# Catalog dev plan — Products, Inventory & Orders (portal)

Frontend plan for the three catalog sections. The pixel-level spec is the
design handoff (`design_handoff_catalog_pages/README.md` + `Catalog.dc.html`
prototype); this doc maps it onto this repo's patterns and onto the backend
plan in `backend-gateway/COMMERCE_PLAN.md` (same branch).

Two tracks, deliberately decoupled:

- **Track A — UI on mock stores.** Unblocked today. Inventory and Orders are
  built exactly like Products was: local pub/sub store, optimistic mutations.
- **Track B — wire to the gateway.** As each backend phase ships, swap the
  store for TanStack Query hooks. The handoff was written for this swap.

## 1. Shared groundwork (do first)

1. `src/components/layout/Sidebar.tsx` — insert into `catalogNav` between
   Products and Orders (import `Boxes` from `lucide-react`):
   ```tsx
   { label: "Inventory", href: "/inventory", icon: <Boxes className="size-5" /> },
   ```
2. `src/components/layout/Header.tsx` — add `"/inventory": "Inventory"` to
   `routeTitles`.
3. Reuse as-is (no new primitives): `PageHeader`, `FilterBar`
   (`FilterDefinition[]` pills), `StatusBadge` (+`dot`), `EmptyState`, and the
   mandatory `dataGridSx` from `src/lib/datagrid-theme.ts` on every grid
   (non-negotiable #5). Detail pages set dynamic crumbs via
   `useBreadcrumbOverrides()`.

## 2. Section 1 — Products (parity + Track B swap)

Already implemented on `productStore`. Work items:

- **Parity check** against the handoff §1 checklist (stat-card tints, column
  tone/icon rules, S8 pill, date/currency formats). Fix drift only.
- **Track B:** replace `useSyncExternalStore(productStore…)` in
  `ProductsClient`, `ProductDetailClient`, `NewProductClient` with
  `use-products` hooks (§5). Stat cards move to `GET /api/products/summary`
  once the list paginates server-side.

## 3. Section 2 — Inventory (new)

Create:

```
src/app/(dashboard)/inventory/{page,layout,loading}.tsx + InventoryClient.tsx
src/app/(dashboard)/inventory/[id]/{page,loading}.tsx + InventoryDetailClient.tsx
src/components/inventory/InventoryTable.tsx (+ small utils)
```

- `page.tsx` = `await requireAuth(); return <InventoryClient />` (house shell
  pattern); `layout.tsx` metadata title `"Inventory — Cloud Care Pharmacy"`.
- Track A data source: **reuse `productStore`** (inventory is a view over
  products) + a small local map for `bin` / `lastCounted`, per handoff §2.
  Derived helpers `invStatus` / `reorderQty` / `stockValue` as specced.
- List: 6 stat cards (SKUs, stock value, low, out, expiring, to-reorder),
  quick chips (`Low stock · Out of stock · Expiring soon · To reorder · Cold
  chain`), pills (Supplier / Storage / Status), DataGrid columns per handoff.
- Detail: warning banners, 4 summary cards, movements list + "Record a count"
  card (adjust via `productStore.adjustStock` in Track A), purchasing card
  with suggested reorder, storage & compliance grid, S8 CD-register note.
- Empty/loading states: `EmptyState` ("Nothing to count yet") + skeletons
  matching the grid shape (non-negotiable #19).

## 4. Section 3 — Orders (replace stub)

Create:

```
src/components/orders/mock-orders.ts        ← Track A store (mirrors productStore API:
                                              getSnapshot/getServerSnapshot/subscribe/add/update + advance/cancel)
src/app/(dashboard)/orders/OrdersClient.tsx ← replace EmptyState stub with full list
src/app/(dashboard)/orders/[id]/{page,loading}.tsx + OrderDetailClient.tsx
src/components/orders/OrderTable.tsx
```

- `Order` type per handoff §3 (`OrderStatus`, `PaymentStatus`, `Channel`,
  lines resolved against `productStore` for price/Rx/schedule in Track A).
- Derived totals: GST **included** (`lineAmount / 11` when applicable),
  shipping `8.95` for online, free otherwise.
- Badge maps: status `received→info, picking→warning, fulfilled→accent,
  shipped→success, cancelled→neutral`; payment `paid→success, unpaid→warning,
  refunded→neutral` (backend may also send `partially_refunded` → `warning`).
- List: 6 stat cards, chips (`Received · Picking · Fulfilled · Shipped ·
  Unpaid · Prescription`), pills (Status/Channel/Payment), columns per handoff.
- Detail: fulfilment stepper (4 nodes, terracotta progress), items table
  (plain table, not DataGrid) + totals block, customer + payment cards,
  "Mark as {next}" primary action, Print outline action, cancelled banner.

## 5. Track B — data layer contract

Backend mounts everything under `/api/*`, so client calls go through the
existing proxy: `fetch('/api/proxy/products?...')` → gateway `/api/products`
(Clerk check + `X-API-Key` + `X-Clerk-User-Id` attached server-side; snake→
camel normalization automatic). **Do not use `/v1/...` paths** — the mock
file's `/v1/products` comment predates the proxy convention.

Add per section:

1. **DTOs** — hand-written in `src/types/index.ts` (house style, `{ success,
   data }` envelope + `{ limit, offset, total }` pagination). Money arrives as
   integer cents (`priceCents`, `totalCents`): keep cents in the DTO, format
   with the shared `Intl.NumberFormat('en-AU', { style: 'currency', currency:
   'AUD' })` helper at render time.
2. **Hooks** — `src/lib/hooks/use-products.ts`, `use-inventory.ts`,
   `use-orders.ts`, copying `use-patients.ts` end-to-end: fetcher →
   `useQuery` with fully-spread query key + `enabled: !!entityId` (entityId
   comes from Clerk `publicMetadata`), mutations via `useMutation` +
   `invalidateQueries` — **mandatory**, the app default is `staleTime:
   Infinity`, nothing refetches on its own.
   - Suggested keys: `["products", entityId, …filters]`,
     `["products-summary", entityId]`, `["inventory", entityId, …]`,
     `["inventory-movements", productId]`, `["orders", entityId, …filters]`,
     `["order", orderId]`, `["orders-summary", entityId]`.
   - Mutations to cover: create/update/archive product; `adjustInventory`
     (invalidate inventory + movements + summaries); create order; `advance`;
     `cancel`; `recordPayment` (invalidate order + list + summary).
3. **Store retirement** — delete `mock-products.ts` / `mock-orders.ts` usages
   section-by-section as its phase wires up; keep enum unions + label maps and
   helpers (`isLowStock`, `isExpiringSoon`, `EXPIRY_WARNING_DAYS`,
   `scheduleRequiresPrescription`) by moving them to a non-mock module, e.g.
   `src/lib/catalog.ts` — the backend uses the same thresholds/semantics.

## 6. Order of work & acceptance

| Step | Depends on | Accept when |
| --- | --- | --- |
| Groundwork (nav/header) | — | `/inventory` reachable, breadcrumbs correct |
| Inventory UI (Track A) | groundwork | Handoff §2 states all reproduced: ready/loading/empty, filters AND/OR semantics, adjust prepends movement |
| Orders UI (Track A) | groundwork | Handoff §3 reproduced: stepper, totals math (GST÷11, shipping), advance/cancel flows |
| Products Track B | backend phase 1 | Products page fully server-backed; no `productStore` reads left on the page |
| Inventory Track B | backend phase 2 | Adjust round-trips to a `stock_movements` row and refreshed level |
| Orders Track B | backend phase 3 | Create→advance→ship against staging moves real stock; payment badges live |

Per-step verification: `npm run lint`, `npx tsc --noEmit`, and a manual pass
of the three pages in ready/loading/empty states. Respect the non-negotiables
(no zebra rows, one `dataGridSx`, labels on status badges, ≤200 ms motion,
skeletons match shape, tabular right-aligned numbers, one date format).
