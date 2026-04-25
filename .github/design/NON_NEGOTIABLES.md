# The 17 Non-Negotiables

These are the rules that get enforced at PR review. They are not preferences — they are the rails that keep the system intact. If a diff violates any of these, it gets reverted.

Source: `design_system.html` § 36.

---

## Don'ts (×)

### 1. No hardcoded hexes outside `globals.css`
Every color reference goes through a token.

```bash
# Should return zero hits in any PR diff
grep -rE '#[0-9a-fA-F]{6}' src/ --include='*.tsx' --include='*.ts' --include='*.css' \
  | grep -v 'globals.css'
```

### 2. No Tailwind palette colors
No `bg-blue-500`, `text-slate-600`, `border-gray-200`. Use semantic tokens — `bg-primary`, `text-foreground`, `border-border` — and the `--status-*` family.

### 3. No alternating row fills on record tables
No `nth-child(even)`, no zebra on the patients / prescriptions / consultations grids. Tables are quiet. The opt-in `.zebra .dense .log` variant is only for log-shaped reference tables (audit history, sync logs).

### 4. No uppercase + tracking on table headers
Sentence case. Zero letter-spacing. Always.

### 5. No per-page DataGrid styling
One shared style object in `src/lib/datagrid-theme.ts`, used by every grid. If a screen genuinely needs to differ, it gets a documented variant in the shared file.

### 6. No emoji in product UI
Use Lucide icons. (Internal tools like docs, this page, changelogs are fine.)

### 7. No new tokens without sign-off
If you find yourself wanting a new color, ask first. Most "new" needs are an existing token misused.

### 8. No color-only status
A green dot or red pill is never the only signal. Every status has a label, every destructive button has a verb, every error has text. Color is the second channel — never the first.

### 9. No clinical data in toasts
Toasts dismiss in 4s. If the user needs to read a name, dose, MRN, or appointment time to verify their action — use a modal or inline confirmation. "Saved" is fine. "Sent prescription for amoxicillin 500mg to John Doe" is not.

### 10. No destructive actions without a verb
"Delete patient", "Cancel consultation", "Revoke access" — never "Confirm" or "OK" on a destructive modal. The button label is the last thing the user reads before committing.

### 11. No motion over 200ms on UI feedback
Hover, focus, dropdown open, toast slide — all under 200ms. Page-level transitions can go to 300ms. Anything longer feels broken in a clinical workflow where users are clicking through dozens of records.

### 12. No data loss on browser back
If a form has unsaved changes, intercept navigation and confirm. Clinical staff lose work to accidental back-button hits more than any other cause.

### 13. No truncation without a tooltip
If text is cut with ellipsis, the full value must be available on hover. This is non-negotiable for names, MRNs, medication names, and dates.

### 14. No focus rings stripped
Never `outline: none` without a replacement. The terracotta focus ring is the system's accessibility contract.

---

## Dos (✓)

### 15. Every UI claim ships with a screenshot
Especially for AI-generated PRs. "Implementation matches spec" is not verification — pixels are.

### 16. Use the right surface
Page background for tables and the canvas. Card surface for things that sit on top. Popover surface for things that float. When in doubt, look at section 07 of `design_system.html`.

### 17. One primary action per screen
Multiple terracotta buttons in the same view = pick the most important and demote the rest to secondary or outline.

### 18. Empty states earn their keep
Every empty state explains *why* it's empty and offers the next action. "No consultations yet" is a placeholder; "No consultations yet — book the first one" is a design.

### 19. Loading states match the shape
Skeleton rows for tables. Skeleton cards for cards. Spinners only for buttons and small inline waits. Never a full-page spinner if the layout is knowable.

### 20. Numbers right-align. Text left-aligns. Dates left-align.
Numerical columns (counts, amounts, IDs) are right-aligned with tabular numerals. Everything else is left-aligned. No center-aligned table cells, ever.

### 21. Single date format per surface
Tables get `14 Jan 2025`. Timestamps get `14 Jan 2025, 09:42`. Relative times (`2h ago`) only in activity feeds. Never mix formats in one column.

### 22. 44px minimum hit target on touch surfaces
Even though we're desktop-first, clinicians use tablets at point of care. Icon buttons, row actions, and checkboxes all hit 44×44 minimum.

### 23. Read the screen aloud
Before merging a new screen, read the headline, primary action, and first row aloud as if to a busy GP. If it doesn't make sense in 5 seconds, the design isn't done.

---

## PR template snippet

Add this to `.github/pull_request_template.md`:

```markdown
## Design system compliance

- [ ] Screenshot of every changed surface attached
- [ ] No new hardcoded hexes (`grep -rE '#[0-9a-fA-F]{6}' src/` clean)
- [ ] No Tailwind palette utilities
- [ ] Relevant non-negotiables checked against `docs/non-negotiables.md`

**Non-negotiables this PR relates to:** #_, #_

**Design spec section(s):** §__
```
