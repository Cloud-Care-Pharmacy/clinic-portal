import type { ClinicalDataRecord } from "@/types";

export interface RedFlagResult {
  hasRedFlag: boolean;
  triggers: string[];
}

/**
 * Computes red flag status from clinical data.
 * A red flag is raised when any medical history question is answered "yes".
 * Once the record has been approved by a reviewer, red flags are suppressed
 * because the clinician has already reviewed the responses.
 */
export function computeRedFlags(record: ClinicalDataRecord): RedFlagResult {
  if (record.reviewStatus === "approved") {
    return { hasRedFlag: false, triggers: [] };
  }

  const triggers: string[] = [];

  if (record.hasMedicalConditions === "yes") {
    const conditions = record.medicalConditions?.length
      ? record.medicalConditions.join(", ")
      : "Yes";
    triggers.push(`Medical conditions: ${conditions}`);
  }

  if (record.takesMedication === "yes") {
    const meds =
      record.medicationsList ??
      (record.highRiskMedications?.length
        ? record.highRiskMedications.join(", ")
        : "Yes");
    triggers.push(`Takes medication: ${meds}`);
  }

  if (
    record.highRiskMedications &&
    record.highRiskMedications.length > 0 &&
    record.takesMedication !== "yes"
  ) {
    triggers.push(`High-risk medications: ${record.highRiskMedications.join(", ")}`);
  }

  if (record.cardiovascular === "yes") {
    triggers.push("Cardiovascular risk: Yes");
  }

  if (record.pregnancy === "yes") {
    triggers.push("Pregnancy: Yes");
  }

  return { hasRedFlag: triggers.length > 0, triggers };
}
