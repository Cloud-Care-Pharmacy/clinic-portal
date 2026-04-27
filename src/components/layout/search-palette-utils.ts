import type { PatientSearchResult } from "@/types";

const RECENT_PATIENTS_KEY = "patient-portal:search-recent-patients:v1";
const RECENT_PATIENTS_EVENT = "patient-portal:search-recent-patients-changed";
const RECENT_PATIENTS_VERSION = 1;
const MAX_RECENT_PATIENTS = 5;
const EMPTY_RECENT_PATIENTS: PatientSearchResult[] = [];
const DATE_OF_BIRTH_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

let cachedRecentRaw: string | null = null;
let cachedRecentPatients: PatientSearchResult[] = EMPTY_RECENT_PATIENTS;

interface RecentPatientsPayload {
  version: number;
  patients: PatientSearchResult[];
}

export function getPatientLabel(patient: PatientSearchResult) {
  return (
    patient.displayName || patient.originalEmail || patient.generatedEmail || "Patient"
  );
}

export function getPatientIdentifier(patient: PatientSearchResult) {
  if (patient.halaxyPatientId) return `PMS ${patient.halaxyPatientId}`;
  if (patient.pbsPatientId) return `PBS ${patient.pbsPatientId}`;
  return "PMS pending";
}

export function formatDateOfBirth(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const match = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(dateOfBirth);

  if (Number.isNaN(date.getTime())) return dateOfBirth;
  return DATE_OF_BIRTH_FORMATTER.format(date);
}

export function getPatientAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());

  if (!hasBirthdayPassed) age -= 1;
  return age >= 0 ? age : null;
}

export function getPatientInitials(patient: PatientSearchResult) {
  const label = getPatientLabel(patient).trim();
  const words = label.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (label[0] ?? "P").toUpperCase();
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isRecentPatient(value: unknown): value is PatientSearchResult {
  if (!value || typeof value !== "object") return false;

  const patient = value as Record<string, unknown>;
  return (
    typeof patient.id === "string" &&
    typeof patient.displayName === "string" &&
    isStringOrNull(patient.originalEmail) &&
    isStringOrNull(patient.generatedEmail) &&
    isStringOrNull(patient.mobile) &&
    isStringOrNull(patient.dateOfBirth) &&
    isStringOrNull(patient.pbsPatientId) &&
    isStringOrNull(patient.halaxyPatientId)
  );
}

function parseRecentPatients(raw: string | null) {
  if (!raw) return EMPTY_RECENT_PATIENTS;

  try {
    const payload = JSON.parse(raw) as Partial<RecentPatientsPayload>;
    if (payload.version !== RECENT_PATIENTS_VERSION) return EMPTY_RECENT_PATIENTS;
    if (!Array.isArray(payload.patients)) return EMPTY_RECENT_PATIENTS;

    return payload.patients.filter(isRecentPatient).slice(0, MAX_RECENT_PATIENTS);
  } catch {
    return EMPTY_RECENT_PATIENTS;
  }
}

export function getRecentPatientsSnapshot() {
  if (typeof window === "undefined") return EMPTY_RECENT_PATIENTS;

  const raw = window.localStorage.getItem(RECENT_PATIENTS_KEY);
  if (raw === cachedRecentRaw) return cachedRecentPatients;

  cachedRecentRaw = raw;
  cachedRecentPatients = parseRecentPatients(raw);
  return cachedRecentPatients;
}

export function getRecentPatientsServerSnapshot() {
  return EMPTY_RECENT_PATIENTS;
}

export function subscribeRecentPatients(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === RECENT_PATIENTS_KEY) callback();
  };
  const handleLocalChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(RECENT_PATIENTS_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(RECENT_PATIENTS_EVENT, handleLocalChange);
  };
}

export function rememberRecentPatient(patient: PatientSearchResult) {
  if (typeof window === "undefined") return;

  const current = getRecentPatientsSnapshot();
  const next = [patient, ...current.filter((recent) => recent.id !== patient.id)].slice(
    0,
    MAX_RECENT_PATIENTS
  );
  const payload: RecentPatientsPayload = {
    version: RECENT_PATIENTS_VERSION,
    patients: next,
  };

  try {
    window.localStorage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(payload));
    cachedRecentRaw = JSON.stringify(payload);
    cachedRecentPatients = next;
    window.dispatchEvent(new Event(RECENT_PATIENTS_EVENT));
  } catch {
    // localStorage may be unavailable or full; recents are non-critical.
  }
}
