# Quity Clinic Portal — Design System Handoff

**For:** the developer wiring this design system into the [`clinic-portal`](https://github.com/Cloud-Care-Pharmacy/clinic-portal) Next.js 16 app.

**You are not building HTML.** This bundle contains a design reference (`design_system.html`) — a single-file living spec of every token, component, and rule. Your job is to **make the existing Next.js codebase match it**, using the patterns that are already there (shadcn/ui base-nova, Tailwind v4, Lucide, MUI DataGrid).

---

## What's in this folder

| File | What it is | Read order |
|---|---|---|
| **`README.md`** | This file. Start here. | 1 |
| **`IMPLEMENTATION_GUIDE.md`** | Component-by-component build order, with file paths and acceptance criteria. | 2 |
| **`NON_NEGOTIABLES.md`** | The 17 rules that get enforced at PR review. Print this. Pin it. | 3 |
| **`CLAUDE_CODE_PROMPT.md`** | Paste-ready prompt for Claude Code to run the implementation against your local repo. | 4 (when ready to execute) |
| **`design_system.html`** | The full living spec. Open in browser. Single source of truth for every visual decision. | Reference, ongoing |
| **`globals.css.reference`** | The exact token block as it should land in `src/app/globals.css`. | Reference |
| **`tokens.json`** | Machine-readable tokens (for future Figma sync, Storybook, or design-token tooling). | Reference |

---

## The 60-second briefing

**Product:** Internal clinical portal for Cloud Care Pharmacy. Used by nurses, doctors, and admin staff for patient management, consultations, prescriptions.

**Aesthetic:** Warm paper, terracotta primary, restrained semantics. Not generic SaaS. Not medical-blue. Reads like a quality clinical document, not a dashboard.

**Stack** (already in place):
- Next.js 16 (App Router)
- Tailwind v4 with `@theme inline` token mapping
- shadcn/ui — `base-nova` style, **Base UI primitives** (not Radix)
- Lucide icons (1.5px stroke, three sizes only: 14 / 16 / 20)
- MUI X DataGrid for record tables
- Recharts for charts
- Outfit (sans) + Geist Mono (mono) — already wired in `layout.tsx`

**What's already correct in `main`:**
- Token palette in `globals.css` matches the design system
- Sidebar layout, header chrome, dashboard scaffolding
- Card / Button / Input / Badge primitives exist
- Basic table styling for DataGrid

**What needs to land** (the work this handoff is for):
1. Status badge component family (the six pastel/dark-ink pill variants — Success / Warning / Danger / Info / Accent / Neutral) standardised into one `<StatusBadge variant="...">` API
2. Alert / Banner component family (matching the same six families)
3. Toast / snackbar wired up app-wide (4s auto-dismiss, bottom-right stack)
4. Modal / Dialog wrapper standardised on the spec (440px max, destructive variant for the primary button when applicable)
5. Side sheet / drawer for row detail
6. Empty state component (icon + headline + body + CTA)
7. Skeleton loaders matched to the shape of what's loading (rows for tables, cards for cards)
8. Filter bar pattern for the patients / consultations / prescriptions list pages
9. The 17 non-negotiables enforced via lint rule + PR template (see `NON_NEGOTIABLES.md`)

---

## How to use this handoff with Claude Code

1. Clone or open the `clinic-portal` repo locally.
2. Drop this folder somewhere accessible (e.g. `~/handoffs/quity-design-system/`).
3. Open `CLAUDE_CODE_PROMPT.md`, copy its contents into a Claude Code session at the repo root.
4. Claude Code will read `IMPLEMENTATION_GUIDE.md` and `design_system.html`, plan the work, and implement components one PR at a time.
5. **Each PR must include a screenshot** of the new/changed surface — see non-negotiable #11.

---

## How to use this handoff with a human dev

Same flow, manually:
1. Skim `IMPLEMENTATION_GUIDE.md` end to end (~10 min).
2. Open `design_system.html` in a browser, leave it open in a second monitor.
3. Pick a component from the build order, ship one PR per component.
4. Reference `NON_NEGOTIABLES.md` during self-review before opening the PR.

---

## Questions / decisions that need a human

These came up while writing the system. Flag them to the design owner before implementation:

- **Dark mode coverage.** Tokens exist for `.dark` but the design system page is light-only. Decide: are we shipping dark mode in v1, or stripping the dark tokens until later?
- **Toast library choice.** The spec describes the visual; pick `sonner` (already shadcn-recommended) or write a small in-house wrapper.
- **DataGrid styling.** `prescriptions/page.tsx` and `admin/page.tsx` have separate `sx` blocks. The non-negotiables forbid this — extract to one shared `lib/datagrid-theme.ts`. Confirm the migration order with the team.
- **Mobile / tablet support.** The 44px hit-target rule implies tablet use. Confirm responsive breakpoints with stakeholders.

---

## Versioning

This is **v1.0** of the design system. Treat `design_system.html` as the contract. If a real-world need forces a divergence, the system updates first, the code follows. Never the reverse.

— Quity Clinic Portal Design System
