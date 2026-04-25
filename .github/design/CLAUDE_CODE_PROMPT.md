# Claude Code Prompt — Implement the Quity Clinic Portal Design System

> **How to use:** open Claude Code at the root of the [`clinic-portal`](https://github.com/Cloud-Care-Pharmacy/clinic-portal) repo, then paste everything below the divider into the chat.

---

You are implementing the **Quity Clinic Portal Design System** in this repository.

## Inputs

The user will share a folder containing:
- `README.md` — handoff overview
- `IMPLEMENTATION_GUIDE.md` — phase-by-phase build order with file paths and acceptance criteria
- `NON_NEGOTIABLES.md` — 17 hard rules; violations get reverted
- `design_system.html` — the living visual spec; open it in a browser as your reference
- `globals.css.reference` — the canonical token block
- `tokens.json` — machine-readable tokens

Read **README.md and IMPLEMENTATION_GUIDE.md fully before writing any code.**

## Your job

1. **Run Phase 0** (audit). Produce `docs/design-audit-YYYY-MM-DD.md` listing every grep hit. **Do not fix anything in this PR.** Only enumerate. Open this as the first PR.

2. **Then work Phase 1 → Phase 10 in order.** One phase per PR. Do not start phase N+1 until phase N is merged. After each phase:
   - Take screenshots of every changed surface and put them in the PR description.
   - Self-check against `NON_NEGOTIABLES.md`. Cite the rule numbers your change relates to.
   - Run `pnpm lint` and `pnpm build` — both must pass.

3. **For every component you build:**
   - Match the spec section in `design_system.html` exactly (geometry, colors, type, motion).
   - Use existing shadcn / Base UI primitives where the inventory in `IMPLEMENTATION_GUIDE.md` says they exist.
   - Add a `__stories__/<Component>.stories.tsx` (or equivalent rendering route) showing all variants.
   - Wire it into at least one real screen — never ship a component that isn't used.

## Hard rules (memorize these)

These are extracted from `NON_NEGOTIABLES.md`. Violations fail review automatically:

1. **No hardcoded hexes** outside `src/app/globals.css`. Every color goes through a token.
2. **No Tailwind palette utilities.** No `bg-blue-500`, `text-slate-600`, `border-gray-200`. Use `bg-primary`, `text-foreground`, `border-border`, and the `--status-*` family.
3. **No alternating row fills** on record tables (patients, prescriptions, consultations). The `.zebra .dense .log` variant is opt-in for log-shaped tables only.
4. **No uppercase + tracking on table headers.** Sentence case. Zero letter-spacing.
5. **No per-page DataGrid `sx` blocks.** One shared theme in `src/lib/datagrid-theme.ts`.
6. **No emoji in product UI.** Use Lucide icons.
7. **No new tokens without sign-off.**
8. **No color-only status.** Color is the second channel, never the first.
9. **No clinical data in toasts.** "Saved" / "Sent" / "Deleted" only.
10. **No destructive actions without a verb** in the button label.
11. **No motion over 200ms** on UI feedback. 300ms cap on page transitions.
12. **No data loss on browser back.** Intercept unsaved changes.
13. **No truncation without a tooltip** showing the full value on hover.
14. **No focus rings stripped.**
15. **Empty states earn their keep** — explain why and offer the next action.
16. **Loading states match the shape** of what's loading (skeleton rows for tables, etc.).
17. **Numbers right-align, text left-aligns, dates left-align.** No center-aligned cells.

## Communication

- After **Phase 0**, summarize the audit findings.
- After each subsequent phase, link the PR and post screenshots.
- If you hit a decision point not covered by the guide (library choice, edge case), **ask the human** — do not invent a new pattern.
- If you want to add a new color, spacing value, or font weight, **stop and ask first.** Most "new" needs are an existing token misused.

## Start now

Begin by:
1. Reading `README.md` from the handoff folder.
2. Reading `IMPLEMENTATION_GUIDE.md` from the handoff folder.
3. Opening `design_system.html` and skimming the table of contents.
4. Running Phase 0 audit and producing the deliverable.

Report back when Phase 0 is complete with the audit summary.
