---
name: quity-clinic-portal-design
description: Use this skill to generate well-branded interfaces and assets for Quity Clinic Portal (Cloud Care Pharmacy's clinical-staff telehealth CRM), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

- **Product:** Quity Clinic Portal — staff-facing clinical CRM (Dashboard, Patients, Prescriptions, Consultations, Admin). Dense data UI, desk-bound, not patient-facing.
- **Tone:** Clinical, direct, no marketing gloss, no exclamation points, no emoji. Title Case for titles/buttons; lowercase for status badges; `en-AU` dates.
- **Palette:** Warm paper (`#faf9f5`), terracotta primary (`#c96442`), beige neutrals. No gradients, no imagery, no texture. Warmth comes from colour temperature.
- **Type:** Outfit (UI) + Geist Mono (IDs, emails, codes). Fallback serif declared but never used.
- **Radii:** Generous — 12–16px base, full pill for badges.
- **Cards:** `ring-1 ring-foreground/10` hairline, no drop shadow.
- **Icons:** Lucide only, 1.5–1.75 stroke, 16–20px. Never emoji, never Unicode dingbats.
- **Animation:** transition-colors only. No bounces, no springs, no choreography.

## Files

- `README.md` — full brand + visual + content + iconography guidelines
- `colors_and_type.css` — drop into any HTML file for all tokens (colors, type, radii, shadows, status palette, semantic classes)
- `fonts/fonts.css` — Google Fonts imports for Outfit + Geist Mono
- `assets/` — `logo.svg`, `logo-wordmark.svg`
- `preview/` — reference cards showing each token group
- `ui_kits/clinic-portal/index.html` — full clickable prototype; copy whole file and adapt, or lift individual component chunks (Sidebar, DataGrid, StatusBadge, StatCard, PatientHeader)

## When designing

1. Start from `colors_and_type.css` — do not invent colours.
2. Use Lucide icons via `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>` and `<i data-lucide="pill"></i>` + `lucide.createIcons()`.
3. Status is always lowercase in data, `capitalize`-ed in CSS; fills are soft-tint + dark-ink + matching border.
4. When in doubt, open `ui_kits/clinic-portal/index.html` and copy the pattern verbatim — this is the production look.
