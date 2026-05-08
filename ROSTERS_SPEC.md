# Doctor Rosters — Component Spec

**Source of truth:** `design_system.html` (tokens + patterns)
**Reference build:** `ui_kits/clinic-portal/rosters.html`
**Audience:** Devs implementing this in the Next.js clinic-portal codebase

> **Rule #0 — Use design tokens. Never hardcode hex.**
> Every color must reference a CSS variable (`var(--token)`) or Tailwind utility that maps to one. If a value isn't in `globals.css`, raise it before shipping.

---

## 1 · Purpose & scope

A staff-facing screen for viewing **doctor availability across the practice**. Read-mostly in v1; edit interactions (assign / drag shifts) are out of scope.

**User goals**
- See who is **on shift** today, this week, this month — at a glance.
- See who is **available right now** for a new booking, who is **in consultation**, and who is **on leave**.
- See **my own** roster pinned at the top of the list.
- Drill into any doctor for their full week + today's appointment list.

**Out of scope (v1):** drag-to-reschedule, bulk shift creation, shift-swap requests, time-off approval workflow.

---

## 2 · Routing & sidebar

| Property | Value |
|---|---|
| Route | `/rosters` |
| Sidebar group | `General` |
| Sidebar order | After `Consultations`, before `Admin` |
| Icon | `calendar-clock` (Lucide) |
| Active state | Standard sidebar active style — `bg-primary text-primary-foreground` |

Header breadcrumb: `Dashboard › Rosters`.

---

## 3 · Page anatomy

```
┌────────────────────────────────────────────────────────────────────┐
│  PAGE HEADER     Title + sub  ·  [+ New Shift] (primary)           │
│                                                                    │
│  TABS (segmented)                                                  │
│  ┌ All doctors · Available now · On leave ┐  Legend (right)        │
│                                                                    │
│  ROSTER CARD                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Card head:   "Weekly roster" / range  ·  [Week|Month] tabs │    │
│  │              [Today]  ◀ Week of 04 May 2026 ▶              │    │
│  │ ─────────────────────────────────────────────────────────  │    │
│  │ Body: <WeekGrid> OR <MonthGrid>  (toggle)                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  DOCTOR DRAWER  (right-side, opens on row click)                   │
└────────────────────────────────────────────────────────────────────┘
```

**Page padding:** `px-6 py-6` (24 px). **Vertical rhythm:** `space-y-6` (24 px).

---

## 4 · Page header

| Element | Spec | Token |
|---|---|---|
| Title | `Doctor Rosters` — `24 px / 700 / -0.01em` | `var(--foreground)` |
| Subtitle | `Weekly availability across the practice. Click a doctor to view their full week.` — `14 px / 400` | `var(--muted-foreground)` |
| Primary action | `+ New Shift` button (icon `calendar-plus`) | `bg-primary text-primary-foreground` — system `Button` `variant="default"` |

No "Export" button in v1.

---

## 5 · Filter / tab bar

A `flex` row with the segmented tabs on the left and a status legend on the right.

### 5.1 Tabs (segmented)

Use shadcn `Tabs` styled per system `tabs-list` pattern (rounded `--muted` track, active pill = `--background` + `shadow-xs`).

| Tab | Filter |
|---|---|
| `All doctors` (default) | no filter, show all |
| `Available now` | `current_status === 'available'` |
| `On leave` | `current_status === 'leave'` |

Each tab has a count chip after the label (`12 px / 500 / muted-foreground`).

### 5.2 Legend (right-aligned)

Inline, `12 px / muted-foreground`. 4 swatches with labels:

| Swatch | Background | Border | Label |
|---|---|---|---|
| Available | `var(--status-success-bg)` | `var(--status-success-border)` | Available |
| In consultation | `var(--status-warning-bg)` | `var(--status-warning-border)` | In consultation |
| On leave | `var(--status-danger-bg)` | `var(--status-danger-border)` | On leave |
| Off | `var(--background)` | `var(--border)` | Off duty |

Swatches are `10 × 10 px / radius 3 px / 1px solid border`.

---

## 6 · Roster card shell

Standard system card.

| Property | Value | Token |
|---|---|---|
| Background | `#f5f4ef` | `var(--card)` |
| Border | `1px solid color-mix(in srgb, var(--foreground) 10%, transparent)` (hairline ring) | — |
| Radius | `16 px` | `--radius-lg` |
| Shadow | none | — |

### 6.1 Card head

```
[Title]                                              [Today] [◀ Week label ▶] [Week|Month]
```

| Element | Spec |
|---|---|
| Container | `flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border)` |
| Title | `Weekly roster` — `16 px / 600` |
| Sub | Range string e.g. `Mon 04 May – Sun 10 May 2026` — `13 px / muted-foreground / margin-top 2px` |
| Right cluster | `margin-left: auto; flex; gap: 8px` |
| `Today` button | Outline button, `32 px tall`, `border var(--border)`, `radius 10 px` |
| Week stepper | See §6.2 |
| View toggle | Segmented tabs `Week | Month` (same `tabs-list` style as §5.1, height 32 px) |

### 6.2 Week stepper (week view only)

| Property | Value |
|---|---|
| Container | `inline-flex; border 1px solid var(--border); radius 10px; padding 2px; background var(--background)` |
| Step button | `28 × 28 px / radius 8px / icon 14 × 14` (`chevron-left` / `chevron-right`); `hover bg var(--muted)` |
| Label | `13 px / 500 / min-width 152 px / center` — e.g. `Week of 04 May 2026` |

In month view: replace stepper label with `Month of May 2026`; same chevrons step ±1 month.

---

## 7 · Week grid (primary view)

### 7.1 Layout

```
              Mon 04   Tue 05   Wed 06   Thu 07   Fri 08   Sat 09   Sun 10
              ─────    ─────    TODAY    ─────    ─────    weekend  weekend
┌──────────┐ ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
│ Dr A. C. │ │08–16│  │09–17│  │busy │  │09–17│  │08–13│  │ off │  │ off │
│ YOU      │ │8/12 │  │6/12 │  │14:00│  │4/12 │  │5/7  │  │     │  │     │
└──────────┘ └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘
... 9 more rows
```

CSS grid, `grid-template-columns: var(--col-doc) repeat(7, minmax(var(--col-day), 1fr))`.

| Variable | Default |
|---|---|
| `--col-doc` | `220 px` |
| `--col-day` | `110 px` |
| `--row-h` | `84 px` (comfy) / `72 px` (cozy) / `56 px` (compact) |

Wrap the grid in a container with `overflow-x: auto`. The grid declares `min-width: max-content`, so on narrow viewports it scrolls horizontally rather than crushing the day cells.

### 7.2 Header row

| Cell | Spec |
|---|---|
| Doc-col header | Label `Doctor`, `11 px / 500 / uppercase / tracking 0.06em / muted-foreground` |
| Day cell | Two-line: `dow` (`Mon`, `11 px / muted-foreground / uppercase / tracking 0.06em`) and `date` (`04 May`, `14 px / 600`) |
| Today header | `background: color-mix(in srgb, var(--primary) 6%, var(--table-header))`; `date` color = `var(--primary)` |
| Weekend header | `background: color-mix(in srgb, var(--muted) 60%, var(--table-header))` |
| All headers | `background var(--table-header)` (default), `border-bottom 1px solid var(--table-separator)`, `padding 10px 14px`, `position: sticky; top: 0; z-index: 3` |

The doc-col header is also `position: sticky; left: 0; z-index: 4` so it stays pinned during horizontal scroll.

### 7.3 Doctor cell (left, sticky)

| Property | Value |
|---|---|
| Layout | `display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-right 1px solid var(--table-separator); border-bottom 1px solid var(--table-separator)` |
| Background | `var(--card)` |
| Position | `sticky; left: 0; z-index: 2` |
| Cursor | `pointer` (opens drawer) |
| Hover | `background: var(--accent)` |

**Avatar:** `36 × 36 px / radius 10px / grid place-items center / 13 px / 600 / color #fff`. Background = doctor's tint (warm palette of 10 colors derived from primary — see §11). Compact density: `28 × 28 px`.

**Name + spec block:**
- Name: `14 px / 600 / var(--foreground)`
- Spec line: `12 px / muted-foreground` — `${specialty} · ${clinic}` (e.g. `GP · Surry Hills`)
- Compact density: hide spec line.

**`YOU` tag** (only on the signed-in user's row):
- Inline pill after name: `10 px / 600 / padding 1px 6px / radius 999px / bg var(--primary) / color var(--primary-foreground) / letter-spacing 0.04em`
- The whole row gets a tinted background: `background: color-mix(in srgb, var(--primary) 5%, var(--card))`. Hover: 9%.

**Selected row** (when drawer is open): `background: color-mix(in srgb, var(--primary) 10%, var(--card))`.

### 7.4 Day cell

```
┌─────────────────┐
│  09:00–17:00    │  hours      12.5 px / 600 / tabular-nums
│  ▢▢ 6/12        │  meta       11 px / users icon + booked/capacity
└─────────────────┘
```

| Property | Value |
|---|---|
| Layout | `display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; height var(--row-h)` |
| Background | `var(--background)` |
| Today | `background: color-mix(in srgb, var(--primary) 3%, var(--background))` |
| Weekend | `background: color-mix(in srgb, var(--muted) 35%, var(--background))` |
| Border | `border-right 1px solid var(--table-separator)` (last column omits); `border-bottom 1px solid var(--table-separator)` |
| Row hover | `background: color-mix(in srgb, var(--accent) 60%, var(--background))` (today's hover stays primary-tinted) |

### 7.5 Shift block (inside day cell)

The cell holds a single `.shift` block that fills it. Three states use the system's status palette:

| Kind | Class | Background | Foreground | Border |
|---|---|---|---|---|
| Available | `s-available` | `var(--status-success-bg)` | `var(--status-success-fg)` | `var(--status-success-border)` |
| In consultation | `s-busy` | `var(--status-warning-bg)` | `var(--status-warning-fg)` | `var(--status-warning-border)` |
| On leave | `s-leave` | `var(--status-danger-bg)` | `var(--status-danger-fg)` | `var(--status-danger-border)` |

Shape: `flex 1; padding 8px 10px; radius 10px; border 1px solid; gap 2px; cursor pointer; overflow hidden`.

**Hours line:** `${start}–${end}` (24h, en dash, e.g. `09:00–17:00`), `12.5 px / 600 / tabular-nums / line-height 1.15`.

**Meta row:** below hours, `font-size 11px`, items `flex / gap 5px`:
- `users` icon (`11 × 11`) + `${booked}/${capacity}` (e.g. `6/12`)
- For `s-busy`: additionally show `${currentSlot.start}–${currentSlot.end}` and `${currentSlot.patientShortName}` (e.g. `14:00–14:30  A. Patel`) — first patient with `status === 'in_progress'`.

**Pulse dot** (busy only): a `6 × 6 px` dot at `top: 8px; right: 8px`, `background currentColor`, with a CSS keyframe `pulse 1.6s ease-out infinite` expanding box-shadow ring. Reserved for the row whose current consultation is `in_progress` _right now_.

**Leave block:** hours line shows `On leave`; meta line italic, shows the leave note (`Annual leave`, `Sick leave`).

**Off-duty cell:** no `.shift` block. Render a centered `18 × 1 px` bar (`var(--border)`) as an off-mark. No "Off" text in compact density.

### 7.6 Density modes (Tweaks)

Apply via class on the grid root: `density-compact | density-cozy | density-comfy`.

| Mode | `--row-h` | Avatar | Spec line | Meta |
|---|---|---|---|---|
| Compact | `56 px` | `28 px` | hidden | hidden |
| Cozy | `72 px` | `36 px` | shown | shown |
| Comfortable (default) | `84 px` | `36 px` | shown | shown |

---

## 8 · Month grid (alternate view)

Standard 7-column calendar, 5–6 rows.

### 8.1 Day cell

| Property | Value |
|---|---|
| Min height | `120 px` |
| Padding | `8 px 10 px` |
| Background | `var(--background)` (default), `color-mix(in srgb, var(--primary) 3%, ...)` (today), `color-mix(in srgb, var(--muted) 35%, ...)` (weekend), `color-mix(in srgb, var(--muted) 50%, ...)` + `opacity 0.55` (other-month spill) |
| Border | `1px solid var(--table-separator)` between cells |

### 8.2 Header

- Date number top-left: `13 px / 600 / tabular-nums`. Today is `var(--primary)`.
- Top-right pills: small stat chips, `10 px / 600 / padding 0 6px / height 16 px / radius 999px`:
  - On-shift count: `bg var(--status-success-bg) / color var(--status-success-fg)`
  - On-leave count: `bg var(--status-danger-bg) / color var(--status-danger-fg)`

### 8.3 Doctor chips

Below the header, a vertical stack of up to **5 chips** (one per doctor with a shift that day). Sort order:
1. Leave (red)
2. In consultation (yellow)
3. Available (green)

Each chip: `flex / gap 6px / height 18 px / padding 0 6px / radius 6 px / border 1px solid / 10.5 px / 500`, content `${initials} · ${start}–${end}` (or `${initials} · leave`). Truncate with ellipsis.

If more than 5 doctors have a shift: render a `+N more` chip at the bottom (`bg var(--muted) / muted-foreground`).

Click any day cell → opens that day's full doctor list in the drawer (future v2 — v1 just routes back to week view for that date).

---

## 9 · Doctor drawer

A right-side drawer, opens on doctor row click. Closes on overlay click, `Esc`, or X button.

### 9.1 Shell

| Property | Value |
|---|---|
| Width | `520 px` (desktop); `100%` on `< 640 px` |
| Position | `fixed; top 0; right 0; bottom 0` |
| Background | `var(--background)` |
| Shadow | `-8px 0 24px rgba(0,0,0,0.08)` |
| Animation | `transform 200ms ease` (slide in from right) |
| Overlay | `rgba(20,20,19,0.32)`, fades in over `150ms` |
| z-index | overlay `40`, drawer `41` |

### 9.2 Drawer head

`padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; gap: 14px`.

| Element | Spec |
|---|---|
| Avatar | `44 × 44 px / radius 10px / 15 px / 600 / #fff` — same tint as grid row |
| Name | `17 px / 700` + optional `YOU` pill |
| Sub | `13 px / muted-foreground` — `${specialty} · ${clinic} clinic` |
| Close button | `icon-btn` (32×32, `x` icon), pushed right with `margin-left: auto` |

### 9.3 Drawer body — sections

Vertical stack, `padding: 18px 20px`, `section + section { margin-top: 22px }`. Each section starts with an h4: `12 px / 600 / uppercase / tracking 0.08em / muted-foreground / margin-bottom 10px`.

#### 9.3.1 `THIS WEEK`

7-row table, 3 columns: `[Day name + date] [Shift status] [Capacity text]`.

| Property | Value |
|---|---|
| Container | `display: grid; grid-template-columns: 80px 1fr 110px; border 1px solid var(--border); radius 12px; overflow hidden` |
| Cell padding | `10px 12px / font-size 13px / background var(--card) / border-bottom 1px solid var(--border)` |
| Today row | `background: color-mix(in srgb, var(--primary) 6%, var(--card))` |

- Day cell: `${dow}` (600) on top, `${date}` (`11 px / muted-foreground`) below.
- Shift cell:
  - Working: hours (`tabular-nums / 600`) + status pill (`status-success` for available, `status-warning` for in consult).
  - Leave: `status-danger` pill with leave note.
  - Off: `<span class="off-text">Off duty</span>` in `muted-foreground`.
- Cap cell: `${booked}/${cap} booked`, right-aligned, `12 px / muted-foreground / tabular-nums`. Off/leave: `—`.

#### 9.3.2 `WEEK TOTALS`

`<dl>` with three rows:

| Term | Value |
|---|---|
| Scheduled hours | `${hours.toFixed(1)} h` |
| Booked / capacity | `${booked} / ${cap} (${pct}%)` |
| Working days | `${workingDays} of 7` |

Style: `grid-template-columns: 130px 1fr; gap: 8px 14px; font-size 13px`. `dt` is `muted-foreground`, `dd` is `foreground / 500`.

#### 9.3.3 `TODAY'S CONSULTATIONS` (only when shift exists today)

A vertical list, one row per appointment.

| Element | Spec |
|---|---|
| Row | `flex; gap 10px; padding 10px 12px; radius 10px; border 1px solid var(--border)` |
| Time block | Left side, `60 px wide / mono / 13 px / 600 / tabular-nums` — `14:00`. Below: duration `11 px / muted-foreground` (e.g. `30 min`). |
| Patient | Name `13 px / 600`, type `11 px / muted-foreground` (e.g. `Follow-up · Asthma plan`). |
| Status pill | Right side, system `status-*`: `done` → success, `in_progress` → warning, `upcoming` → info. |

**Now line:** if any appointment is `in_progress`, that row gets `border: 1px solid var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)`.

#### 9.3.4 `PROFILE`

`<dl>` like §9.3.2 with: Specialty, Primary clinic, Phone (mono), Joined.

#### 9.3.5 Action row

`flex; gap 8px; margin-top 22px`.

- `Add shift` (outline, `calendar-plus` icon)
- `Message` (outline, `mail` icon)
- `View profile` (primary, `user` icon, `margin-left: auto`)

---

## 10 · Data model

```ts
type ShiftKind = 'available' | 'busy' | 'leave' | 'off';

type Consultation = {
  id: string;
  start: string;           // "14:00"
  end: string;             // "14:30"
  patientName: string;     // "Anika Patel"
  patientShortName: string;// "A. Patel"  (used in inline cell display)
  type: string;            // "Follow-up", "Initial", etc.
  status: 'done' | 'in_progress' | 'upcoming';
};

type Shift = {
  kind: ShiftKind;
  start?: string;          // "08:00"  (omit when off/leave)
  end?: string;            // "16:00"
  booked?: number;
  capacity?: number;
  note?: string;           // leave reason: "Annual leave"
  consultations?: Consultation[];  // ordered by start; only for current day
};

type Doctor = {
  id: string;
  name: string;            // "Dr Amelia Choi"
  specialty: 'GP' | 'Psychiatry' | 'Dermatology' | 'Cardiology' | 'Paediatrics' | 'Endocrinology';
  clinic: 'Surry Hills' | 'Newtown' | 'Telehealth';
  phone?: string;          // E.164 or display formatted
  joined?: string;         // "Mar 2023"
  isMe?: boolean;          // true on the signed-in user's row
  week: Shift[];           // length 7, Mon..Sun for the displayed week
};
```

API expectations (raise with backend before build):
- `GET /api/rosters/week?start=YYYY-MM-DD` → `{ doctors: Doctor[], weekStart, weekEnd }`
- `GET /api/rosters/month?month=YYYY-MM` → `{ days: { date, shifts: Shift[] }[] }`
- The signed-in user is identified via the existing session; backend marks `isMe: true` on their row.

**Time format:** `HH:mm` 24h on the wire. Display unchanged (the design uses 24h).
**Timezone:** all times are `Australia/Sydney`. Render with `en-AU` locale.

---

## 11 · Avatar tints

Doctors get a deterministic warm tint based on their list index (or a hash of `id`). Palette:

```
#c96442  #9a7b56  #7a8a6b  #a36a4d  #6f7d92
#b48a4d  #8e6f9a  #5e8077  #a85f5f  #7e7a55
```

All 10 are warm and harmonise with `var(--primary)`. Avatar text is always `#fff / 600`.

---

## 12 · Tweaks (in-design controls)

The page exposes a single in-design tweak so designers/PMs can preview density. **Not** part of production unless a "Density" preference lands in user settings.

| Tweak | Type | Options | Default |
|---|---|---|---|
| Density | segmented | `compact / cozy / comfy` | `comfy` |

Density is a class on the grid root (see §7.6). If you ship density to production, persist it in the `users.preferences` JSONB column.

---

## 13 · Accessibility

- Doctor row → drawer: row is `role="button"`, `tabindex="0"`, `aria-haspopup="dialog"`. Enter/Space opens the drawer.
- Drawer is a `role="dialog"` with `aria-modal="true"` and `aria-labelledby` pointing at the doctor name. Focus moves into the drawer on open and returns to the row on close.
- Esc closes the drawer.
- Status colours never carry meaning alone — every state has a label or icon (chevrons in stepper, pulse dot accompanies `In consultation`, off-mark for off-duty).
- The legend in §5.2 is the canonical key; verify text alternatives match in screen-reader output.
- Sticky doc column must remain reachable via keyboard — do not trap focus inside the scroll region.

---

## 14 · Empty / edge states

| Condition | Render |
|---|---|
| No doctors | Card body shows centered empty state: title `No doctors yet`, sub `Add your first doctor in Admin → Staff.`, button `Go to Admin` (outline). |
| Doctor has 0 shifts in the displayed week | Render 7 off-cells. |
| Doctor on leave for the entire week | Render `On leave` block on each working day; weekend stays as off-cell. |
| Drawer opened on a doctor with no shift today | Hide the `TODAY'S CONSULTATIONS` section entirely. |
| Network error loading week | Card body shows `Failed to load roster: ${error.message}` with a `Retry` button (outline). |

---

## 15 · Acceptance checklist

A PR shipping this page should satisfy:

- [ ] Sidebar item `Rosters` (icon `calendar-clock`) routes to `/rosters` and shows active state.
- [ ] Page header matches §4 (title, sub, single primary CTA).
- [ ] Tabs from §5.1 with live counts; legend on the right.
- [ ] Roster card shell matches system card spec (§6).
- [ ] Week stepper steps ±1 week; `Today` button returns to current week.
- [ ] `Week | Month` toggle swaps body without re-fetching when data is already cached.
- [ ] Week grid: doc column sticky-left, header row sticky-top; doctor's own row pinned at top with `YOU` tag and tinted background.
- [ ] Day cells render the four kinds with the exact colors from `--status-*` tokens — no hex.
- [ ] In-consultation cells show the live patient slot (`14:00–14:30 A. Patel`) and pulsing dot.
- [ ] Today column highlighted with `--primary` tint.
- [ ] Density tweak switches `--row-h` and avatar size live (compact / cozy / comfy).
- [ ] Month view renders day chips sorted leave → busy → available, capped at 5 with `+N more`.
- [ ] Doctor row click opens drawer; Esc and overlay close it; selected row gets `--primary 10%` background.
- [ ] Drawer sections render in the order in §9.3 with the spacing in this doc.
- [ ] Whole grid scrolls horizontally when narrower than 220 + 7 × 110 = 990 px content area; nothing crushes.
- [ ] No hardcoded hex outside `globals.css`. Lint enforces.
- [ ] Lucide icons used; no emoji.
- [ ] All times rendered in `Australia/Sydney`; dates in `en-AU` (`04 May 2026`).

---

## 16 · Open questions for product

1. **Multi-segment shifts** — does a doctor ever work two blocks in one day (`09:00–12:00` then `14:00–18:00`)? The current data model is one segment per day. If yes, change `Shift.start/end` to `Shift.segments[]`.
2. **Capacity bar** — currently removed. Reinstate when a clear use-case lands.
3. **Time-off requests** — do staff submit leave through this screen, or only through Admin? If here, add a `Request leave` button to the page header and a workflow drawer.
4. **Locations / clinics** — confirm the canonical list (`Surry Hills / Newtown / Telehealth`) and whether the filter pill is needed in v1.
5. **Cross-week visibility for "On leave"** — should the leave block also span weekends visually, or stay off as it currently does?
