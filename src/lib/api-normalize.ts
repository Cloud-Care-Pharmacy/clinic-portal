type JsonObject = Record<string, unknown>;

const PATIENT_SORT_FIELD_TO_BACKEND: Record<string, string> = {
  createdAt: "created_at",
  firstName: "first_name",
  lastName: "last_name",
  dateOfBirth: "date_of_birth",
  halaxyPatientId: "halaxy_patient_id",
  pbsPatientId: "pbs_patient_id",
};

function isPlainObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function snakeToCamel(key: string) {
  return key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeKeys(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      snakeToCamel(key),
      camelizeKeys(entry),
    ])
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePatientSearchResult(value: unknown) {
  if (!isPlainObject(value)) return value;

  const firstName = stringValue(value.firstName);
  const lastName = stringValue(value.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const fallback =
    stringValue(value.originalEmail) ??
    stringValue(value.generatedEmail) ??
    stringValue(value.mobile) ??
    stringValue(value.id) ??
    "Patient";

  return {
    ...value,
    displayName: stringValue(value.displayName) ?? (fullName || fallback),
  };
}

function normalizeEnvelopeData(data: unknown, path?: string) {
  if (!isPlainObject(data)) return data;

  const normalized: JsonObject = { ...data };

  if (Array.isArray(normalized.patients)) {
    normalized.patients = normalized.patients.map((patient) =>
      path?.startsWith("/api/patients/search")
        ? normalizePatientSearchResult(patient)
        : patient
    );
  }

  if (isPlainObject(normalized.patient)) {
    normalized.patient = normalized.patient;
  }

  if (isPlainObject(normalized.clinicalData) && !normalized.record) {
    normalized.record = normalized.clinicalData;
  }

  return normalized;
}

export function normalizeApiPayload<T>(payload: unknown, path?: string): T {
  const camelized = camelizeKeys(payload);

  if (!isPlainObject(camelized)) {
    return camelized as T;
  }

  if ("data" in camelized) {
    return {
      ...camelized,
      data: normalizeEnvelopeData(camelized.data, path),
    } as T;
  }

  return camelized as T;
}

export function toBackendPatientSort(sort: string | undefined) {
  if (!sort) return undefined;
  return PATIENT_SORT_FIELD_TO_BACKEND[sort] ?? sort;
}
