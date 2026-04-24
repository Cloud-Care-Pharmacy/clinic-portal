# Quity Clinic Portal — Design System

A design system for **Quity Clinic Portal** (a.k.a. "Patient Portal"), the internal clinical-staff web app built by **Cloud Care Pharmacy** for managing patient intake, prescriptions, consultations, and staff administration across their telehealth practice.

## Sources

- **Codebase:** [`Cloud-Care-Pharmacy/clinic-portal`](https://github.com/Cloud-Care-Pharmacy/clinic-portal) — Next.js 16 + React 19 + Tailwind v4 + shadcn/ui (`base-nova` style) + `@base-ui/react` primitives + MUI DataGrid + Lucide icons.
- **Related (not pre-loaded, same org):** `prescription-gateway` (Cloudflare Worker API), `fastmed-admin`, `quity-shopify-theme`, `fastmed-backend` — the clinic-portal sits on top of prescription-gateway.
- **Fonts:** [Outfit](https://fonts.google.com/specimen/Outfit) (UI, via `next/font/google`) and [Geist Mono](https://fonts.google.com/specimen/Geist+Mono) (code). Both are served from Google Fonts in this design system.
- **Iconography:** [Lucide React](https://lucide.dev/) — stroke-based, 1.5px default, sized `h-4 w-4` / `h-5 w-5`.

## What the product does

Staff (admins, doctors, receptionists) sign in with Google and manage:

| Surface | Job |
|---|---|
| **Dashboard** | At-a-glance KPIs, intake chart, recent activity |
| **Patients** | List (MUI DataGrid) + 8-step intake wizard + detail tabs (Profile / Medical History / Notes / Prescriptions / Documents / Consultations) |
| **Prescriptions** | Per-patient prescription viewer (Parchment-backed) |
| **Consultations** | Table + calendar view, scheduling sheet, detail sheet |
| **Admin** | Staff CRUD, role management |
| **Profile** | Own account / signature pad |

It is **staff-facing, desk-bound, dense data UI** — not a patient-facing product. Think "clinical CRM".

---

## Content fundamentals

**Voice: clinical, direct, lowercase-comfortable.** Copy is written to busy practitioners, not end-customers. No marketing gloss, no exclamation points.

**Casing:**
- Page titles use **Title Case**: "Patients", "New Patient", "Administration".
- Buttons use **Title Case**: "Add Patient", "Schedule Consultation", "Add Staff".
- Section labels in the sidebar use `UPPERCASE` with wide tracking (e.g. `GENERAL`, `MANAGEMENT`) — rendered at `text-xs` with `tracking-wider`.
- Status badges are `lowercase` fed from the data model and then `capitalize`-ed in CSS ("active", "pending", "scheduled").
- Field labels are Title Case ("Date of Birth", "Generated Email", "PMS ID").

**Pronouns:** Neutral third-person by default ("This patient has no prescriptions on record"). Light second-person for CTAs in empty states ("Get started by adding your first patient intake"). Never "I".

**Empty states** are short, two-line: *title* + *description*, plus an optional action. Example:
> **No patients yet**
> Get started by adding your first patient intake.
> *[ Add Patient ]*

**Error copy** is literal and apologetic-free: *"Failed to load patients: {error.message}"*, *"Name and email are required"*.

**Toast style** (Sonner, `richColors`, top-right): `toast.success("Role updated to admin")`, `toast.error("Name and email are required")`. Short, past-tense confirmations.

**Dates** are localised to **`en-AU`** everywhere: `05 Oct 2025`, `05 Oct 2025, 14:30`.

**Clinical caution:** Red-flag alerts are explicit: *"Red Flag — Doctor Review"*. Placeholder-data warnings are explicit: *"This page shows placeholder data. Connect the staff management backend to persist changes."*

**No emoji.** Ever. Information is conveyed via Lucide icons + status-colour badges.

---

## Visual foundations

**Overall mood.** Warm paper, terracotta accent, restrained shadows, generous rounded corners. The whole UI reads as a *notebook on a wooden desk* rather than a cold SaaS dashboard. This is a deliberate "Claude-style" palette inspired by `claude.ai` (same hex family: `#faf9f5` background, `#c96442` / `#d97757` primary).

**Colour palette.**
- Canvas: `#faf9f5` (warm off-white). Cards sit on a slightly deeper `#f5f4ef`. Sidebar `#f5f4ee`.
- Brand: `#c96442` (terracotta) — used for primary buttons, active nav, rings, chart bars, focus states. In dark mode shifts to `#d97757`.
- Neutrals read *beige*, not grey: `--muted: #ede9de`, `--secondary: #e9e6dc`, `--border: #dad9d4`.
- Status colours are **soft tint + dark ink + matching border** (e.g. `bg-green-100 text-green-800 border-green-200`). Never fully-saturated fills.
- Destructive is a rendered-low-key red: base `#dc2626`, but in variant use it's `bg-destructive/10 text-destructive` (10% fill, full ink).

**Typography.**
- Single family for UI: **Outfit** (geometric sans, high legibility at small sizes).
- **Geist Mono** reserved for IDs, codes, generated emails.
- Serif is defined as fallback (`ui-serif, Georgia…`) but never used in the app.
- Scale: page title `1.5rem / 700`, card title `1rem / 500` (`.font-heading`), body `0.875rem`, caption `0.75rem`, overline `0.6875rem uppercase tracking-wider`. Stat values `1.875rem / 700 tracking-tight`.

**Spacing & layout.**
- Base spacing `0.25rem` (4px). Gaps in `2 / 4 / 6` (Tailwind). Page stacks use `space-y-6`.
- The app is a two-column shell: fixed sidebar (`w-64` open, `w-17` collapsed) on a `bg-sidebar` rail, main content in a **rounded panel** (`rounded-l-2xl border-t bg-background shadow-sm my-2 mr-2`) — a signature detail.
- Headers are 56px tall (`h-14`) with breadcrumb + search.
- Page content uses `px-4 py-6` with consistent `space-y-6` between sections.

**Corner radii.** Generous. Base `--radius: 1rem` (16px). Small elements (`rounded-md`) are ~14px, cards `rounded-xl` (16px), badges **fully pill-shaped** (`rounded-4xl`, ~32px). Sidebar nav links `rounded-lg` (~14px). Avatars are `rounded-lg` (not full circles), except the patient-detail header avatar which is `rounded-full`.

**Cards.** `bg-card` + `ring-1 ring-foreground/10` (hairline) + `rounded-xl` + `py-4`. No heavy drop shadows — the ring is the primary affordance. Footers get a top border + `bg-muted/50`.

**Shadows.** Extremely restrained — all shadows use black at 5–25% opacity, max `0 8px 10px`. The system avoids "floating SaaS card" shadows; most elevation is communicated by a 10% ring or subtle border instead.

**Backgrounds.** Solid flat colour only. No gradients, no imagery, no texture, no patterns. The warmth comes from colour temperature, not ornament. The only gradient-adjacent treatment is the `bg-primary/5` hint behind active filter chips.

**Borders.**
- Standard `border border-border` (1px, `#dad9d4`).
- **Dashed borders** are a filter-chip convention: inactive filters use `border-dashed border-border`, active use `border-primary/50 bg-primary/5`.
- Separators inside the header are `h-4 w-px bg-border`.

**Hover states.**
- Nav items: `hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground`.
- Buttons (ghost/outline): `hover:bg-muted hover:text-foreground`.
- Primary buttons: `[a]:hover:bg-primary/80` (80% opacity — subtle darken).
- DataGrid rows: `color-mix(in srgb, var(--muted) 80%, var(--primary) 8%)` — a warm hover tint, not a cool blue one.

**Press/active.** Buttons translate down 1px on active: `active:not(aria-haspopup):translate-y-px`. No colour flash, no ripple.

**Focus.** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` — a 3px terracotta halo at 50% opacity.

**Transparency / blur.** Used sparingly: `bg-primary/10`, `bg-muted/50`, `bg-destructive/20` for soft fills. No `backdrop-filter: blur` anywhere.

**Animation.** `transition-colors` and `transition-all` only; durations default (150ms). No bounces, no springs, no enter/exit choreography. The sidebar collapse uses a plain `duration-200` width tween.

**DataGrid.** All MUI DataGrids share the `dataGridSx` token set: zebra rows (`var(--muted)` on odd), warm hover tint, muted column headers, no column separators, Outfit font throughout, primary-coloured checkboxes.

**Iconography** (see below) is stroke-based Lucide, 16–20px, always inline with text at `gap-1.5` or `gap-2`.

---

## Iconography

**Primary icon library:** **[Lucide React](https://lucide.dev/)** — the project's default (confirmed in `components.json`: `"iconLibrary": "lucide"`).

- All icons are imported by name: `import { Users, FileText, Pill } from "lucide-react"`.
- Stroke style, 1.5px default stroke, 24×24 viewBox.
- Rendered at `h-4 w-4` (16px) inside buttons and badges, `h-5 w-5` (20px) inside sidebar nav and icon buttons, `h-3 w-3` (12px) inside tiny indicators (chevrons, trend arrows).
- Icons in buttons always use `mr-2` (left) or `ml-2` (right) for spacing.
- **Icon-only buttons** are marked via `data-icon="inline-start"` / `inline-end` + `size="icon"` to collapse padding.

**This design system uses Lucide via CDN** (`unpkg.com/lucide@latest`) so HTML recreations can mount them without a bundler. The icon set used by the portal includes, at minimum:

`LayoutDashboard, Users, FileText, Calendar, CalendarDays, Table2, Shield, LogOut, Menu, ChevronsUpDown, ChevronRight, Pill, User, Plus, Trash2, MoreHorizontal, Eye, Copy, Search, SlidersHorizontal, X, CirclePlus, TrendingUp, TrendingDown, Mail, Phone, MapPin, ShieldAlert, CalendarCheck, Stethoscope, PanelLeftOpen, PanelLeftClose`

**No emoji** appear in the product. No Unicode dingbats. Information density is carried by icons + status badges.

**SVGs shipped in repo `public/`:** only the Next.js starter SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — these are not used in product UI and are not copied here. There is **no custom logo file in the repo**; the brand mark is composed inline as a `<div>` holding a **Pill** Lucide icon on a `bg-sidebar-primary` (terracotta) rounded square — see `Sidebar.tsx`. We treat that pill-on-terracotta motif as the **product logomark** and recreate it as `assets/logo.svg` for reuse.

**Illustrations.** None. Empty states are text-only with an optional icon.

---

## Index

**Root**
- `README.md` — this file
- `colors_and_type.css` — all CSS variables (colors, fonts, radii, shadows, spacing, status colours, semantic type classes)
- `SKILL.md` — agent-invocable skill description

**`fonts/`** — `@import` references to Outfit + Geist Mono via Google Fonts. (No local TTFs; the codebase also pulls from Google via `next/font`.)

**`assets/`**
- `logo.svg` — the pill-on-terracotta brand mark (recreated from Sidebar.tsx composition)
- `logo-wordmark.svg` — mark + "Quity / Clinic Portal" lockup

**`preview/`** — design-system cards (registered for the Design System tab)

**`ui_kits/clinic-portal/`** — interactive HTML recreation of the clinic portal
- `index.html` — clickable prototype (Dashboard → Patients → Patient Detail → Prescriptions → Consultations → Admin)
- `components.jsx` — shared Button, Badge, Card, Sidebar, Header, StatusBadge, etc.
- `screens.jsx` — Dashboard, Patients, PatientDetail, Prescriptions, Consultations, Admin

---

## Caveats / known gaps

- **No custom logo** exists in the source repo; we've inferred the pill-on-terracotta mark from the sidebar composition. If Cloud Care Pharmacy has an official Quity logomark, please provide it.
- **Fonts are loaded from Google Fonts CDN**, not local TTFs — matching how the codebase uses `next/font/google`.
- The repo references Clerk (`@clerk/nextjs`) in code but NextAuth in the README — we treat sign-in as a sign-in page with OAuth providers, shown generically.
- No Figma link was provided; every visual decision is sourced from code.
