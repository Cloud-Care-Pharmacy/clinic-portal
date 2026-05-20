/**
 * Cessation formulary + SIG quick-fill templates.
 *
 * Source: `Nicotine_Custom_Drug_Prescribing_Upload.xlsx` (6 SKUs).
 */

import type { MedForm, MedSchedule, Medication } from "./types";
import { newRxId } from "./types";

export interface FormularyItem {
  /** Stable key per SKU (used as React key in the quick-pick row). */
  key: string;
  name: string;
  strength: string;
  schedule: MedSchedule;
  form: MedForm;
  qty: string;
  repeats: string;
  authority: boolean;
  /** Default PBS flag. Vape SKUs are not PBS subsidised. */
  pbs: boolean;
}

/** Default SIG copy for a given strength, per the spreadsheet template. */
export function defaultSigForStrength(strengthMgMl: number): string {
  if (strengthMgMl <= 0) {
    return "Use approved therapeutic vaping product by inhalation via vaporisation as directed. Contains 0 mg/mL nicotine. Review with your practitioner as scheduled. Keep out of reach of children and pets.";
  }
  const maxMlPerDay = (80 / strengthMgMl).toFixed(2);
  return `Inhale by vaporisation using a TGA-notified therapeutic vaping product PRN to relieve cravings. Start 30-50 mg nominal nicotine daily. Max 80 mg/day. For a ${strengthMgMl} mg/mL product, max ${maxMlPerDay} mL/day. Review in 7 days.`;
}

export const CESSATION_FORMULARY: readonly FormularyItem[] = [
  {
    key: "nicotine-0",
    name: "Nicotine",
    strength: "0 mg/mL",
    schedule: "S3",
    form: "Solution",
    qty: "4",
    repeats: "12",
    authority: false,
    pbs: false,
  },
  {
    key: "nicotine-10",
    name: "Nicotine",
    strength: "10 mg/mL",
    schedule: "S3",
    form: "Solution",
    qty: "4",
    repeats: "12",
    authority: false,
    pbs: false,
  },
  {
    key: "nicotine-20",
    name: "Nicotine",
    strength: "20 mg/mL",
    schedule: "S3",
    form: "Solution",
    qty: "4",
    repeats: "12",
    authority: false,
    pbs: false,
  },
  {
    key: "nicotine-30",
    name: "Nicotine",
    strength: "30 mg/mL",
    schedule: "S4",
    form: "Solution",
    qty: "4",
    repeats: "12",
    authority: true,
    pbs: false,
  },
  {
    key: "nicotine-40",
    name: "Nicotine",
    strength: "40 mg/mL",
    schedule: "S4",
    form: "Solution",
    qty: "4",
    repeats: "12",
    authority: true,
    pbs: false,
  },
  {
    key: "nicotine-50",
    name: "Nicotine",
    strength: "50 mg/mL",
    schedule: "S4",
    form: "Solution",
    qty: "4",
    repeats: "12",
    authority: true,
    pbs: false,
  },
];

/** Build a fresh Medication seeded from a formulary SKU. */
export function medFromFormulary(item: FormularyItem): Medication {
  const strengthMgMl = Number.parseFloat(item.strength);
  return {
    id: newRxId(),
    name: item.name,
    strength: item.strength,
    form: item.form,
    schedule: item.schedule,
    sig: defaultSigForStrength(Number.isFinite(strengthMgMl) ? strengthMgMl : 0),
    qty: item.qty,
    repeats: item.repeats,
    brandSub: true,
    pbs: item.pbs,
    authority: item.authority,
  };
}

/** Build a blank Medication, optionally pre-named from free-text search. */
export function blankMed(name = ""): Medication {
  return {
    id: newRxId(),
    name,
    strength: "",
    form: "Solution",
    schedule: "S3",
    sig: "",
    qty: "1",
    repeats: "0",
    brandSub: true,
    pbs: false,
    authority: false,
  };
}

/** SIG quick-fill phrases — appended on click, never replace existing text. */
export const SIG_QUICK_FILLS: readonly string[] = [
  "Start 30-50 mg nicotine daily",
  "Max 80 mg/day",
  "PRN for cravings",
  "Review in 7 days",
  "Keep out of reach of children",
];
