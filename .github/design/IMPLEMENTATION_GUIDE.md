# Implementation Guide — Quity Clinic Portal Design System

This document is the **build order**. Work top to bottom; each phase is a logical PR boundary.

> **Reference at all times:** `design_system.html`. Open it in a browser. Keep it open. Every component below has a section number — find it in the table of contents.

---

## Phase 0 — Audit (1 PR, no code)

Before writing anything new, audit current state. The repo's `globals.css` already aligns with the system, but verify there are no stragglers.

**Checklist** (run at repo root):

```bash
# 1. Hex color leaks outside globals.css — should return zero hits
grep -rE '#[0-9a-fA-F]{6}' src/ --include='*.tsx' --include='*.ts' --include='*.css' \
  | grep -v 'globals.css'

# 2. Tailwind palette colors — should return zero hits
grep -rE '\b(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+\b' src/

# 3. Per-page DataGrid sx blocks
grep -rln 'DataGrid' src/app/ | xargs grep -l 'sx=' || true

# 4. emoji in product UI
grep -rE '[\x{1F300}-\x{1F9FF}\x{2600}-\x{27BF}]' src/components/ src/app/
```

**Deliverable:** A short markdown file at `docs/design-audit-YYYY-MM-DD.md` listing every hit, with a remediation owner. Don't fix in this PR — just enumerate.

---

## Phase 1 — Status Badge family (§12)

**Goal:** One `<StatusBadge>` API for the six families, replacing every ad-hoc colored pill.

**Files to touch:**

- `src/components/shared/StatusBadge.tsx` — exists, refactor to expose explicit variants
- `src/components/ui/badge.tsx` — leave alone; this is the primitive

**Spec (from §12):**

| Variant   | When to use                      | Token family         |
| --------- | -------------------------------- | -------------------- |
| `success` | Linked / synced / completed      | `--status-success-*` |
| `warning` | Pending / awaiting / soft errors | `--status-warning-*` |
| `danger`  | Cancelled / failed / blocked     | `--status-danger-*`  |
| `info`    | In progress / informational      | `--status-info-*`    |
| `accent`  | Special / featured / highlighted | `--status-accent-*`  |
| `neutral` | Default / unspecified state      | `--status-neutral-*` |

**API:**

```tsx
<StatusBadge variant="success">Linked</StatusBadge>
<StatusBadge variant="warning" dot>Pending</StatusBadge>  // dot prefix optional
```

**Acceptance:**

- ✓ Pill geometry: 22px tall, 10px horizontal padding, 999px radius
- ✓ Pastel fill, dark ink, matched border — never a saturated fill
- ✓ Optional leading dot via `dot` prop (8px, same fg color)
- ✓ Sentence case content; no ALL CAPS
- ✓ A `<dl>`-style stories file in `__stories__/StatusBadge.stories.tsx` covering all six

**Replace usages in:**

- `PatientTable.tsx` — sync status column
- `ConsultationTable.tsx` — appointment state column
- `prescriptions/page.tsx` — Rx status column
- `admin/page.tsx` — user state column

---

## Phase 2 — Alert / Banner (§13)

**Goal:** Inline notice banners. Same six families as StatusBadge.

**Files:**

- `src/components/ui/alert.tsx` — new (or extend if exists)

**Spec (from §13):**

- 12px padding, 10px radius, 1px border
- Leading icon (Lucide, 16px, matched fg color) — `Info` / `CheckCircle2` / `AlertTriangle` / `AlertOctagon` / `Sparkles` / `Circle`
- Optional close-X (Lucide `X`, 14px, opacity 0.5 → 1 on hover)
- Title + body structure: title is 14px / weight 500, body is 13px / weight 400

**API:**

```tsx
<Alert variant="warning" onClose={() => …}>
  <AlertTitle>Profile incomplete</AlertTitle>
  <AlertBody>Some required fields are missing.</AlertBody>
</Alert>
```

**Where to use first:** the patient detail page red-flag alert strip at the top of patient screens (already mocked in `design_system.html` patient detail).

---

## Phase 3 — Toast / Snackbar (§30)

**Goal:** Transient confirmations, bottom-right, 4s auto-dismiss.

**Decision needed:** Use [sonner](https://sonner.emilkowal.ski/) (recommended — minimal, headless, customisable to match) or write a thin wrapper around Base UI's `Toast`. Default recommendation: **sonner**, themed via tokens.

**Files:**

- `src/components/ui/toast.tsx` — new (sonner re-export with token-themed defaults)
- `src/app/layout.tsx` — mount `<Toaster />` once at the root

**Spec (from §30):**

- Bottom-right anchor, 8px gap between stacked toasts
- 4s auto-dismiss (configurable)
- 3 visual variants: `default` (dark bg, light text), `success` (green), `danger` (red)
- 8px radius, soft shadow
- **Never put clinical data in a toast.** Reinforce this in the Toast wrapper's TSDoc — "saved" / "deleted" / "sent" only.

**Replace any existing alert(), confirm(), or one-off feedback patterns.**

---

## Phase 4 — Modal / Dialog wrapper (§19)

**Goal:** Standardise the existing shadcn dialog into the spec.

**Files:**

- `src/components/ui/dialog.tsx` — extend with the `<DialogShell>` opinionated wrapper

**Spec (from §19):**

- 440px max-width
- Title + body + footer bar layout
- Primary action right-most in the footer
- Backdrop is 40% black
- For destructive actions: primary button uses the `destructive` variant + the verb in the label ("Delete patient", never "Confirm")

**API:**

```tsx
<DialogShell
  open={open}
  onOpenChange={setOpen}
  title="Delete patient?"
  body="This permanently removes their record and cannot be undone."
  primaryAction={{
    label: "Delete patient",
    variant: "destructive",
    onClick: handleDelete,
  }}
  secondaryAction={{ label: "Cancel", onClick: () => setOpen(false) }}
/>
```

**Reinforces non-negotiable #3:** No destructive actions without a verb.

---

## Phase 5 — Side sheet / Drawer (§20)

**Goal:** Right-anchored panel for row detail without losing the list behind.

**Files:**

- `src/components/ui/sheet.tsx` — exists in shadcn base-nova, theme to match

**Spec (from §20):**

- 380–520px wide (responsive within range)
- Header: title + close-X
- Body scrolls, footer pinned (when applicable)
- Slide from right, 200ms ease-out

**Use cases:**

- Consultation row → sheet with full notes + linked Rx
- Document row → sheet with file preview + metadata
- Audit log row → sheet with full diff

**Rule:** Use side sheet, not modal, when the user needs to see the list context behind it.

---

## Phase 6 — Empty state (§21)

**Goal:** A reusable component for first-use, zero-results, post-clear states.

**Files:**

- `src/components/shared/EmptyState.tsx` — new

**Spec (from §21):**

- Centered: icon (40px, muted), headline (16px / 500), body (14px / muted), CTA button
- Card surface, dashed border optional for "drop something here" cases

**API:**

```tsx
<EmptyState
  icon={CalendarDays}
  title="No consultations yet"
  body="Book the first one to get started."
  action={{ label: "Book consultation", onClick: handleBook }}
/>
```

**Reinforces non-negotiable #12:** Empty states earn their keep — always offer the next action.

---

## Phase 7 — Skeleton loaders (§22)

**Goal:** Loading states that match the shape of what's loading.

**Files:**

- `src/components/ui/skeleton.tsx` — exists, extend with shape primitives
- `src/components/skeletons/TableSkeleton.tsx` — new
- `src/components/skeletons/CardSkeleton.tsx` — new

**Spec (from §22):**

- Skeletons for tables and cards
- Inline spinner for buttons (use Lucide `Loader2` with `animate-spin`)
- Determinate progress bar for long jobs (uploads, exports)
- **Never a full-page spinner if the layout is knowable.**

**Replace** every `if (loading) return <Spinner />` in:

- `usePatients` consumer
- `useConsultations` consumer
- `usePrescriptions` consumer

---

## Phase 8 — Filter bar (§29)

**Goal:** Consistent filter UI above every paginated table.

**Files:**

- `src/components/shared/FilterBar.tsx` — new

**Spec (from §29):**

- Active filters render as pills with value + remove-X
- "+ Filter" pill opens menu of fields to filter by
- Right side shows result count ("247 patients")
- Sits above the table, below the page header

**Pages to wire:**

- `patients/page.tsx`
- `consultations/page.tsx`
- `prescriptions/page.tsx`
- `admin/page.tsx`

---

## Phase 9 — Shared DataGrid theme (§09)

**Goal:** Kill per-page `sx` blocks. One shared theme.

**Files:**

- `src/lib/datagrid-theme.ts` — new
- `src/app/(dashboard)/prescriptions/page.tsx` — remove inline sx, use shared
- `src/app/(dashboard)/admin/page.tsx` — same
- `PatientTable.tsx`, `ConsultationTable.tsx` — same

**Spec (from §09):**

- Header: `--table-header` bg, 14px, sentence case, no letter-spacing, weight 600
- Row: `--background` surface, **no zebra**, hover-tint via `--accent`
- Borders: 1px `--border` between rows; no vertical column dividers
- Cell padding: 12px vertical, 16px horizontal
- Numbers right-align with tabular numerals; everything else left-align

**Reinforces non-negotiables #3, #4, #5, #13.**

---

## Phase 10 — Lint + PR template

**Goal:** Make the rules enforceable.

**Files:**

- `.eslintrc.cjs` — add custom rule banning Tailwind palette utilities (regex match)
- `.github/pull_request_template.md` — add screenshot requirement + non-negotiables checklist
- `docs/non-negotiables.md` — copy from this bundle's `NON_NEGOTIABLES.md`

**Acceptance:**

- ✓ Lint fails on any `bg-blue-500` / `text-slate-600` / etc.
- ✓ PR template requires "Screenshot attached" check before merge
- ✓ Link to `docs/non-negotiables.md` in the PR template

---

## Component inventory (status check)

| Section           | Component                         | Repo state                                | Action                                      |
| ----------------- | --------------------------------- | ----------------------------------------- | ------------------------------------------- |
| §10 Buttons       | `Button`                          | ✅ Already shadcn base-nova, matches spec | None                                        |
| §11 Inputs        | `Input`                           | ✅ Already shadcn base-nova, matches spec | None                                        |
| §12 Status badges | `StatusBadge`                     | ⚠️ Exists, needs API refactor             | **Phase 1**                                 |
| §13 Alerts        | `Alert`                           | ❌ Missing                                | **Phase 2**                                 |
| §14 Dropdowns     | `DropdownMenu`                    | ✅ Already shadcn                         | None                                        |
| §15 Checkboxes    | `Checkbox`, `Switch`              | ✅ Already shadcn                         | None                                        |
| §17 Tabs          | `Tabs`                            | ✅ Already shadcn                         | Verify both pill + underline variants exist |
| §18 Tooltips      | `Tooltip`, `Popover`              | ✅ Already shadcn                         | None                                        |
| §19 Modal         | `Dialog`                          | ⚠️ Primitive exists, no shell wrapper     | **Phase 4**                                 |
| §20 Side sheet    | `Sheet`                           | ⚠️ Primitive exists, no opinionated usage | **Phase 5**                                 |
| §21 Empty states  | `EmptyState`                      | ❌ Missing                                | **Phase 6**                                 |
| §22 Loading       | `Skeleton`, `TableSkeleton`, etc. | ⚠️ Primitive only                         | **Phase 7**                                 |
| §23 Avatars       | `Avatar`                          | ✅ Already shadcn                         | Add hash-to-color helper                    |
| §24 Date picker   | `Calendar`, `DatePicker`          | ⚠️ Verify                                 | Confirm in Phase 0                          |
| §25 Search        | `SearchInput`                     | ❌ Missing as a wrapper                   | Bundle into Phase 8                         |
| §26 Pagination    | `Pagination`                      | ⚠️ Verify                                 | Confirm in Phase 0                          |
| §27 Breadcrumbs   | `Breadcrumb`                      | ⚠️ Verify                                 | Confirm in Phase 0                          |
| §29 Filter bar    | `FilterBar`                       | ❌ Missing                                | **Phase 8**                                 |
| §30 Toast         | `Toast`, `Toaster`                | ❌ Missing                                | **Phase 3**                                 |
| §31 File upload   | `FileUpload`                      | ❌ Missing                                | Defer (no current consumer)                 |
| §32 Stepper       | `Stepper`                         | ❌ Missing                                | Defer (no current consumer)                 |
| §33 Tags / chips  | `Tag`                             | ❌ Missing                                | Defer (no current consumer)                 |
| §34 Kbd           | `Kbd`                             | ❌ Missing                                | Defer (no current consumer)                 |

---

## Definition of done (per PR)

- ✓ Component matches the spec section visually (verified against `design_system.html`)
- ✓ TypeScript types exported
- ✓ Storybook story (or at minimum, a `__stories__/Component.tsx` page rendering all variants)
- ✓ Used in at least one real screen, not just storied
- ✓ Screenshot attached to the PR
- ✓ No new hardcoded hexes introduced
- ✓ No Tailwind palette utilities introduced
- ✓ Passes the relevant non-negotiables (link the section)

---

— Quity Clinic Portal Design System v1.0
