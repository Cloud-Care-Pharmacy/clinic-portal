/**
 * Manual prescription composer — types & validation.
 *
 * Source of truth: `.github/copilot-instructions.md` design rules and the
 * Manual Prescription Composer spec. Shape mirrors `Nicotine_Custom_Drug_Prescribing_Upload.xlsx`.
 */

export type MedForm =
  | "Solution"
  | "Patch"
  | "Gum"
  | "Lozenge"
  | "Spray"
  | "Tablet";

export const MED_FORMS: readonly MedForm[] = [
  "Solution",
  "Patch",
  "Gum",
  "Lozenge",
  "Spray",
  "Tablet",
];

export type MedSchedule = "S3" | "S4";

export interface Medication {
  id: string;
  name: string;
  strength: string;
  form: MedForm;
  schedule: MedSchedule;
  sig: string;
  qty: string;
  repeats: string;
  brandSub: boolean;
  pbs: boolean;
  authority: boolean;
}

export const MAX_REPEATS = 12;

export function isMedValid(m: Medication): boolean {
  const qty = Number.parseInt(m.qty, 10);
  const repeats = Number.parseInt(m.repeats, 10);
  return (
    m.name.trim().length > 0 &&
    m.strength.trim().length > 0 &&
    m.sig.trim().length > 0 &&
    Number.isFinite(qty) &&
    qty >= 1 &&
    Number.isFinite(repeats) &&
    repeats >= 0 &&
    repeats <= MAX_REPEATS
  );
}

export function areAllValid(meds: Medication[]): boolean {
  return meds.length > 0 && meds.every(isMedValid);
}

/** UUID helper — falls back to a timestamped random string when crypto is missing (SSR-safe). */
export function newRxId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `rx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
