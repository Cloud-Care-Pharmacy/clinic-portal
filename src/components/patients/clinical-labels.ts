/**
 * Human-readable labels for clinical-data slugs returned by the intake form.
 *
 * The public intake form posts hyphenated slugs (e.g. `first-line-nrt`,
 * `heart-attack`) and the backend stores them verbatim. Use `formatSlug` to
 * render any single slug, or `formatSlugList` for arrays of slugs.
 *
 * Unknown slugs fall back to a Title-Cased version of the slug so newly added
 * options stay readable until an explicit label is added here.
 */

const SMOKING_STATUS_LABELS: Record<string, string> = {
  "currently-smoking": "Currently smoking",
  "current-smoker": "Current smoker",
  "ex-smoker": "Ex-smoker",
  vaper: "Vaper",
  "never-smoked-or-vaped": "Never smoked or vaped",
};

const VAPING_STATUS_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
};

const QUIT_MOTIVATION_LABELS: Record<string, string> = {
  health: "Health",
  wellbeing: "Wellbeing",
  family: "Family",
  cost: "Cost",
  pregnancy: "Pregnancy",
  fitness: "Fitness",
  appearance: "Appearance",
  social: "Social pressure",
  other: "Other",
};

const QUIT_METHOD_LABELS: Record<string, string> = {
  "first-line-nrt": "First-line NRT",
  "second-line-nrt": "Second-line NRT",
  "cold-turkey": "Cold turkey",
  champix: "Champix (varenicline)",
  zyban: "Zyban (bupropion)",
  hypnotherapy: "Hypnotherapy",
  acupuncture: "Acupuncture",
  counselling: "Counselling",
  vaping: "Vaping",
  other: "Other",
};

const MEDICAL_CONDITION_LABELS: Record<string, string> = {
  hypertension: "Hypertension",
  "heart-attack": "Heart attack (MI)",
  stroke: "Stroke",
  cancer: "Cancer",
  diabetes: "Diabetes",
  asthma: "Asthma",
  copd: "COPD",
  "asthma-copd": "Asthma / COPD",
  epilepsy: "Epilepsy",
  depression: "Depression",
  anxiety: "Anxiety",
  "depression-anxiety": "Depression / Anxiety",
  pregnancy: "Pregnancy",
  other: "Other",
};

const HIGH_RISK_MED_LABELS: Record<string, string> = {
  warfarin: "Warfarin",
  olanzapine: "Olanzapine",
  clozapine: "Clozapine",
  theophylline: "Theophylline",
  insulin: "Insulin",
  ropinirole: "Ropinirole",
  other: "Other",
};

function titleCaseSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function lookup(map: Record<string, string>, slug: string): string {
  if (!slug) return "";
  return map[slug] ?? map[slug.toLowerCase()] ?? titleCaseSlug(slug);
}

export function smokingStatusLabel(slug: string): string {
  return lookup(SMOKING_STATUS_LABELS, slug);
}

export function vapingStatusLabel(slug: string): string {
  return lookup(VAPING_STATUS_LABELS, slug);
}

export function quitMotivationLabel(slug: string): string {
  return lookup(QUIT_MOTIVATION_LABELS, slug);
}

export function quitMethodLabel(slug: string): string {
  return lookup(QUIT_METHOD_LABELS, slug);
}

export function medicalConditionLabel(slug: string): string {
  return lookup(MEDICAL_CONDITION_LABELS, slug);
}

export function highRiskMedLabel(slug: string): string {
  return lookup(HIGH_RISK_MED_LABELS, slug);
}

export function formatSlugList(
  slugs: string[] | null | undefined,
  formatter: (slug: string) => string
): string {
  if (!slugs || slugs.length === 0) return "";
  return slugs.map(formatter).join(", ");
}
