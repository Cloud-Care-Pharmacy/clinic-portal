# Handoff: Quity Clinic Portal — UI Kit

## Overview

This bundle contains a high-fidelity HTML prototype of the **Quity Clinic Portal** — a web application used by doctors, pharmacists, and admin staff to manage patients, consultations, prescriptions, and practitioner profiles in a telehealth setting (Australian market, AHPRA/Medicare compliance).

The prototype demonstrates **5 full pages** (Dashboard, Patients, Patient Detail, Prescriptions, Consultations, Admin, Profile) plus a shared application shell (sidebar nav, top bar, search). It was built against the real `Cloud-Care-Pharmacy/clinic-portal` Next.js codebase — design tokens, component anatomy, data shapes, copy, and route structure all mirror production.

## About the Design Files

**The files in `ui_kit/` are design references, not production code to copy directly.** They are a single-file vanilla-JS mock that renders HTML via template literals — this format was chosen for fidelity and speed of iteration, not for shipping.

Your task is to **recreate these designs in the target codebase's existing environment** — which for this project is:

- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS** with CSS-variable-driven theme
- **shadcn/ui** components (Radix + Tailwind)
- **Clerk** for auth (readonly first/last name are managed by Clerk)
- **Lucide** for icons

Use the codebase's established patterns and libraries. Do **not** copy the inline template-literal rendering style from the prototype — port it to real React components.

## Fidelity

**High-fidelity (hifi).** Colors, typography, spacing, component anatomy, copy, data shapes, and interactions are all final. Match pixel-perfectly using your existing shadcn components + Tailwind tokens.

## Design System

The `design_system/` folder contains the full Quity Clinic Portal design system:

- `README.md` — **Start here.** Brand context, content fundamentals, visual foundations, iconography.
- `SKILL.md` — How to invoke the design system as an Agent Skill. If you're Claude running in Copilot/Code, read this first — it will orient you.
- `colors_and_type.css` — All CSS custom properties (colors, fonts, radii, shadows). Map these onto your Tailwind `theme.extend` or `globals.css`.
- `assets/` — Logo SVGs (`logo.svg`, `logo-wordmark.svg`).
- `fonts/` — Typeface files (Geist Sans, Geist Mono, Fraunces as the serif display face). You may already be loading these from Google Fonts.

**Font note:** The prototype uses Geist + Fraunces as near-matches for the real brand. If your codebase uses a different font stack, keep yours — just maintain the roles (sans body / mono tabular / serif display for hero numbers).

## The UI Kit — `ui_kit/index.html`

A single self-contained HTML file. Open it in a browser to see all pages. Navigate via the left sidebar. Key pages:

| Sidebar item       | What to look at                                                        |
| ------------------ | ---------------------------------------------------------------------- |
| **Dashboard**      | Stat cards (4-up), activity feed, quick actions, upcoming appointments |
| **Patients**       | Patient table with search, pagination, status chips                    |
| **Patient detail** | Tabbed view: Overview / Prescriptions / Consultations / Documents      |
| **Prescriptions**  | Rx table, status badges, expiry warnings                               |
| **Consultations**  | List + calendar toggle, status (scheduled/completed/cancelled/no-show) |
| **Admin**          | Staff management table (role assignment)                               |
| **Profile**        | **5 tabs** — see below for detail                                      |

### Profile Page — Focus Area

The Profile page is the most complex screen in this handoff and the one the team has actively iterated on. It has 5 tabs:

1. **Contact** — Personal contact details (first/last name readonly from Clerk, DOB, gender, phone)
2. **Availability** — Working hours per day (7-row toggle grid with start/end time pickers), consultation types (Telehealth / In-person / Home visits cards), Leave & unavailability section
3. **Prescriber Details** — Credentials form (title, qualifications\*, specialty\*, prescriber #\*, AHPRA #, hospital provider #, provider #, HPI-I number)
4. **Business Details** — Business phone\* + email, then address (search placeholder, street number/name, suburb, state, postcode)
5. **Security** — Change password, 2FA management, active sessions, delete account (destructive actions use outline-destructive button variant)

Non-tab elements on the profile page:

- **Compact header card** with avatar (initials fallback), full name, role badge (admin/doctor/staff), expandable email & phone icon buttons (widen on hover to show value), meta row (specialty · prescriber # · joined date), and a **profile completeness bar** (computes % from filled required fields, shows "Review" link when missing fields exist)
- **Sticky save bar** at the bottom of each form-bearing tab ("• Unsaved changes · Discard · Save Changes")

**Role-based tab visibility:**

- Admin & Staff see: Contact, Availability, Security
- Doctors also see: Prescriber Details, Business Details

## Screens

### Application Shell

- **Sidebar**: 240px fixed left, collapsible to ~60px. Logo mark (terracotta pill icon) + wordmark ("Quity" / "Clinic Portal"). Two sections — GENERAL (Dashboard, Patients, Prescriptions, Consultations) and MANAGEMENT (Admin, Profile). User card at bottom with avatar + name + email truncated, caret for menu.
- **Top bar**: breadcrumbs on the left, global search input on the right. Height 64px. Subtle bottom border.
- **Content area**: max-width ~1100px, `padding: 24px 32px`, centered within remaining viewport.

### Dashboard

- H1 page title "Dashboard" + subtitle copy
- **4 stat cards** in a grid: "Active patients", "Consults this week", "Pending scripts", "No-shows (30d)" — each with a label, a large serif number (Fraunces, `var(--font-serif)`), a delta vs previous period in muted text, and a subtle tinted icon slug
- **Activity feed** (left, 2/3 width): recent consults + prescription events with timestamps
- **Upcoming appointments** (right, 1/3 width): next 5 consultations as stacked rows

### Patients (table)

- Sticky header, search input top-right, "Add patient" primary button
- Columns: Checkbox, Name, DOB, Email, Mobile, Location, Status, Actions
- Status chip uses semantic color (active=success, inactive=neutral, etc.)
- Pagination footer with range + page buttons
- Row click → Patient detail

### Patient Detail

- Page header with patient name (H1, serif) + back link + action buttons (Edit, New consultation)
- Patient summary card: avatar, demographics, contact, PMS ID
- Tabbed body: Overview (vitals snapshot + recent activity), Prescriptions (rx table), Consultations (history), Documents (file list with upload target)

### Prescriptions

- Table-first page. Columns: Product, Dosage, Prescriber, Issued, Expires, Status
- Status chip: active=success, expired=danger
- Filter pills at top: All / Active / Expired / Pending

### Consultations

- Tab toggle between **Table view** and **Calendar view**
- Table columns: Patient, Doctor, Type (initial/follow-up/renewal with tinted badge), Status (scheduled/completed/cancelled/no-show), When, Outcome
- Calendar is a simple month grid with colored dots per day

### Admin

- Staff table: Name, Email, Role (editable dropdown), Added date, Delete action
- Role dropdown styled as outline button with double-caret icon
- "Add Staff" primary button in the header
- Alert banner at the top noting placeholder data state

### Profile (detailed above)

5-tab layout. See "Profile Page — Focus Area" above.

## Interactions & Behavior

- **Sidebar toggle**: icon button in the top bar; collapsed state persists (use localStorage)
- **Page routing**: prototype uses a single `state.page` variable; in production, use Next.js App Router routes like `/dashboard`, `/patients`, `/patients/[id]`, `/profile/[tab]`
- **Tabs (Profile, Patient Detail)**: selected tab highlighted with terracotta underline/background; `role="tablist"` / `role="tab"`; keyboard arrow navigation
- **Expandable icon buttons** (email/phone chips in profile header): 32×32 icon-only at rest; on hover, width animates to reveal the text label (see `.expandable-icon` in the prototype CSS)
- **Working hours toggle (Availability)**: each row has a day name, switch, start time, dash, end time. Off rows dim the time inputs and are unclickable.
- **Consultation type cards**: clicking toggles the `.on` state — terracotta border + 5%-tinted background + filled checkmark circle.
- **Day pills** (older variant, still in the codebase): 4-column grid of day labels with checkbox-like boxes.
- **Sticky save bar**: should appear only when the form is dirty. Use `react-hook-form`'s `formState.isDirty`.
- **Profile completeness**: compute `filled / totalRequired` from form values; update live as the user fills fields. Clicking "Review" should scroll to the first empty required field.
- **Danger zone** (Security tab): "Delete account" + "Sign out other devices" use destructive outline buttons and open confirmation dialogs.

## State Management

- **Form state**: use `react-hook-form` per tab, with `zod` schemas for validation. Required fields marked with red asterisk (`var(--destructive)`).
- **Server state**: Tanstack Query for fetching user profile, patients, consultations, prescriptions.
- **UI state** (sidebar collapsed, active tab): local component state or URL search params (`?tab=availability`).
- **Auth**: Clerk's `useUser()`; `firstName` and `lastName` come from Clerk and are readonly in the UI — the prototype marks these with a small lock icon in the field label.

## Design Tokens

All tokens defined in `design_system/colors_and_type.css`. Key values:

### Colors (light mode)

| Token                      | Value                | Role                              |
| -------------------------- | -------------------- | --------------------------------- |
| `--background`             | `oklch(1 0 0)`       | Page background                   |
| `--foreground`             | `oklch(0.22 0 0)`    | Body text                         |
| `--primary`                | `oklch(0.62 0.14 39)` | Terracotta — CTAs, active states |
| `--primary-foreground`     | `oklch(1 0 0)`       | Text on primary                   |
| `--muted`                  | `oklch(0.97 0 0)`    | Muted bg (field hover, row hover) |
| `--muted-foreground`       | `oklch(0.52 0 0)`    | Muted text                        |
| `--border`                 | `oklch(0.92 0 0)`    | Borders                           |
| `--input`                  | `oklch(0.9 0 0)`     | Input borders                     |
| `--destructive`            | `oklch(0.58 0.22 27)` | Destructive actions              |
| `--card`                   | `oklch(1 0 0)`       | Card bg                           |
| `--ring`                   | `oklch(0.62 0.14 39)` | Focus ring (primary)             |

Status chip colors (derive using `color-mix`):

- Success: `#16a34a` base, `10%` bg / `700` text
- Warning: `#d97706` base
- Info: blue
- Danger: uses `--destructive`
- Neutral: uses muted

### Typography

- **Sans body**: `Geist`, 14px base, 1.5 line-height
- **Mono**: `Geist Mono`, used for numeric IDs (prescriber #, HPI-I, PMS ID)
- **Serif display**: `Fraunces`, used for large stat numbers only (letter-spacing: -0.01em)

Font sizes: 11px (uppercase labels), 12px (hints), 13px (small), 14px (body), 16px (card title), 18px (profile name), 20px (stat numbers), 24px+ (page title — use serif for warmth)

### Spacing / Radii / Shadows

- Radii: `--radius: 0.625rem` (10px) for cards, 8px for buttons, 999px for badges/pills
- Card shadow: subtle — `box-shadow: 0 1px 2px rgba(0,0,0,0.04)` (or Tailwind `shadow-sm`)
- Sticky save shadow: `0 10px 30px -10px rgba(0,0,0,.15)`

### Motion

- Transitions: 120–150ms for color/border changes, 300ms ease for layout (completeness bar fill, sidebar collapse)
- No large motion pieces. Page feels calm.

## Assets

- `design_system/assets/logo.svg` — Terracotta pill mark (icon only). Used in sidebar header and favicon.
- `design_system/assets/logo-wordmark.svg` — Full "Quity Clinic Portal" lockup (if horizontal layout needed).
- `design_system/fonts/` — Geist + Fraunces font files. If your repo already loads these from Google Fonts / next/font, use that instead.

Icons are all **Lucide** — same library the codebase already uses. Key icons used:

- Navigation: `house`, `users`, `pill`, `stethoscope`, `file-text`, `calendar`, `shield`, `user`
- Actions: `plus`, `search`, `settings`, `log-out`, `trash-2`, `chevrons-up-down`, `chevron-right`
- Profile: `mail`, `phone`, `lock`, `video`, `building-2`

## Files in this handoff

```
design_handoff_clinic_portal/
├── README.md                         ← You are here
├── ui_kit/
│   └── index.html                    ← The single-file HTML prototype (open in a browser)
└── design_system/
    ├── README.md                     ← Brand + content + visual foundations (read second)
    ├── SKILL.md                      ← Agent skill entry point
    ├── colors_and_type.css           ← CSS custom properties
    ├── assets/
    │   ├── logo.svg
    │   └── logo-wordmark.svg
    └── fonts/                        ← Geist + Fraunces files
```

## Recommended implementation order

1. **Read** `design_system/SKILL.md` then `design_system/README.md` to absorb the brand context.
2. **Open** `ui_kit/index.html` in your browser and click through every page. Take notes on what's reusable.
3. **Align design tokens**: reconcile `colors_and_type.css` with your existing `tailwind.config.ts` / `globals.css`. If tokens already exist with different names, create a mapping table rather than renaming wholesale.
4. **Port app shell** (sidebar + topbar) as a layout in `app/(portal)/layout.tsx`.
5. **Port pages** in dependency order: Dashboard → Patients → Patient Detail → Prescriptions → Consultations → Admin → Profile.
6. **Profile tabs** last — they're the most form-heavy. Use `react-hook-form` + `zod` per tab. Wire the completeness bar to form state.
7. **Wire real data** via Tanstack Query once the UI matches. Replace hardcoded `PATIENTS`, `CONSULTATIONS`, `PRESCRIPTIONS`, `STAFF`, `PROFILE_USER` arrays from the prototype with API calls.

## Notes & caveats

- The prototype uses `showJs()` / `render()` / template literals because it's a **throwaway mock**. Do not port this pattern — use real React components and hooks.
- All data in the prototype is placeholder. Match the **shapes**, not the values.
- Copy tone is concise, British/Australian English ("specialty" not "speciality" is fine — the codebase uses US spelling already), no emoji, no exclamation points.
- The terracotta primary is intentionally warm — avoid swapping it for blue/indigo even if "that's what medical apps usually use".
