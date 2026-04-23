---
name: intake-form
description: "Patient intake form wizard. Use when modifying the 8-step intake form, adding form steps, changing validation, or updating submission flow."
---

# Patient Intake Form

## Location

`src/app/(dashboard)/patients/new/page.tsx` — ~730 lines, 8-step wizard

## Steps

1. Personal Details (name, DOB, contact, address)
2. Medicare / Insurance
3. Smoking History
4. Vaping History
5. Medical History
6. Current Medications
7. Consent & Signature
8. Review & Submit

## Architecture

- Single `useForm<IntakeFormData>()` holds all steps
- Per-step Zod schemas validated via manual `safeParse()` before advancing
- `IntakeFormData` type in `src/types/index.ts` must match backend's expected payload exactly
- Submits to `POST /api/proxy/submit` which forwards to `prescription-gateway`
- Uses `signature_pad` for the consent signature step

## Modification Checklist

When adding/changing a step:
1. Update `IntakeFormData` in `src/types/index.ts`
2. Add Zod schema for the new step
3. Add step component in the wizard
4. Update step navigation (prev/next logic)
5. Update the review step to display new fields
6. Verify backend `prescription-gateway` accepts the new shape
