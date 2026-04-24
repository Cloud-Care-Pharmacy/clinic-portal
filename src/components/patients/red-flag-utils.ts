import type { ClinicalDataRecord } from "@/types";

export interface RedFlagResult {
  hasRedFlag: boolean;
  triggers: string[];
}

/**
 * Computes red flag status from clinical data.
 * A red flag is raised when any medical history question is answered "yes".
 */
export function computeRedFlags(record: ClinicalDataRecord): RedFlagResult {
  const triggers: string[] = [];

  if (record.has_medical_conditions === "yes") {
    const conditions = record.medical_conditions?.length
      ? record.medical_conditions.join(", ")
      : "Yes";
    triggers.push(`Medical conditions: ${conditions}`);
  }

  if (record.takes_medication === "yes") {
    const meds =
      record.medications_list ??
      (record.high_risk_medications?.length
        ? record.high_risk_medications.join(", ")
        : "Yes");
    triggers.push(`Takes medication: ${meds}`);
  }

  if (
    record.high_risk_medications &&
    record.high_risk_medications.length > 0 &&
    record.takes_medication !== "yes"
  ) {
    triggers.push(`High-risk medications: ${record.high_risk_medications.join(", ")}`);
  }

  if (record.cardiovascular === "yes") {
    triggers.push("Cardiovascular risk: Yes");
  }

  if (record.pregnancy === "yes") {
    triggers.push("Pregnancy: Yes");
  }

  return { hasRedFlag: triggers.length > 0, triggers };
}
