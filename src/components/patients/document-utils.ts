import type { DocumentCategory } from "@/types";

export const DOCUMENT_CATEGORY_VALUES = [
  "proof_of_identity",
  "proof_of_age",
  "prescription",
  "lab_result",
  "referral",
  "consent_form",
  "insurance",
  "clinical_report",
  "imaging",
  "correspondence",
  "other",
] as const satisfies readonly DocumentCategory[];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  proof_of_identity: "Proof of Identity",
  proof_of_age: "Proof of Age",
  prescription: "Prescription",
  lab_result: "Lab Result",
  referral: "Referral",
  consent_form: "Consent Form",
  insurance: "Insurance",
  clinical_report: "Clinical Report",
  imaging: "Imaging",
  correspondence: "Correspondence",
  other: "Other",
};

export const DOCUMENT_CATEGORY_OPTIONS = DOCUMENT_CATEGORY_VALUES.map((value) => ({
  value,
  label: DOCUMENT_CATEGORY_LABELS[value],
}));

export function getDocumentCategoryLabel(category: DocumentCategory): string {
  return DOCUMENT_CATEGORY_LABELS[category] ?? category;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocumentDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDocumentTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDocumentDownloadHref(patientId: string, documentId: string): string {
  return `/api/proxy/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/download`;
}
