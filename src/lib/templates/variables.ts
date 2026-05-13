/**
 * Static catalog of variables that can be inserted into template bodies.
 * Each variable has a dotted `path` (used as the token, e.g. `{{patient.firstName}}`),
 * a human `label`, and a `sample` value used for preview rendering.
 */

export interface TemplateVariable {
  path: string;
  label: string;
  sample: string;
}

export interface TemplateVariableGroup {
  label: string;
  variables: TemplateVariable[];
}

export const VARIABLE_CATALOG: TemplateVariableGroup[] = [
  {
    label: "Patient",
    variables: [
      { path: "patient.firstName", label: "First name", sample: "Alex" },
      { path: "patient.lastName", label: "Last name", sample: "Nguyen" },
      { path: "patient.fullName", label: "Full name", sample: "Alex Nguyen" },
      { path: "patient.email", label: "Email", sample: "alex@example.com" },
      { path: "patient.phone", label: "Phone", sample: "+61 412 345 678" },
    ],
  },
  {
    label: "Doctor",
    variables: [
      { path: "doctor.name", label: "Name", sample: "Dr. Priya Patel" },
      { path: "doctor.email", label: "Email", sample: "priya@cloudcare.health" },
    ],
  },
  {
    label: "Appointment",
    variables: [
      { path: "appointment.date", label: "Date", sample: "Mon 26 May 2026" },
      { path: "appointment.time", label: "Time", sample: "10:30 AM" },
      { path: "appointment.type", label: "Type", sample: "Initial consult" },
      { path: "appointment.location", label: "Location", sample: "Telehealth" },
    ],
  },
  {
    label: "Clinic",
    variables: [
      { path: "clinic.name", label: "Name", sample: "Cloud Care Pharmacy" },
      { path: "clinic.phone", label: "Phone", sample: "1300 555 010" },
      { path: "clinic.url", label: "Website", sample: "https://cloudcare.health" },
    ],
  },
];

const SAMPLE_VALUES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const group of VARIABLE_CATALOG) {
    for (const v of group.variables) {
      map[v.path] = v.sample;
    }
  }
  return map;
})();

export function getSampleValues(): Record<string, string> {
  return { ...SAMPLE_VALUES };
}

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Replace `{{path}}` tokens in `body` with values from `sample`.
 * Unknown tokens are preserved as-is so authors can see what wasn't matched.
 */
export function renderTemplate(
  body: string,
  sample: Record<string, string> = SAMPLE_VALUES
): string {
  return body.replace(TOKEN_RE, (full, path: string) =>
    Object.prototype.hasOwnProperty.call(sample, path) ? sample[path] : full
  );
}

/** Extract the set of variable paths referenced by a template body. */
export function extractVariablePaths(body: string): string[] {
  const paths = new Set<string>();
  for (const match of body.matchAll(TOKEN_RE)) {
    paths.add(match[1]);
  }
  return Array.from(paths);
}

/** Flat list of all known variable paths. */
export function allVariablePaths(): string[] {
  return Object.keys(SAMPLE_VALUES);
}
