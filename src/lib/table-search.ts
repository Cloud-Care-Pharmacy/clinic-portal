function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().toLowerCase();
  if (Array.isArray(value)) {
    return value.map(normalizeSearchValue).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(normalizeSearchValue)
      .filter(Boolean)
      .join(" ");
  }
  return String(value).toLowerCase();
}

export function matchesSearchQuery(query: string, values: unknown[]) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = values.map(normalizeSearchValue).filter(Boolean).join(" ");
  return terms.every((term) => haystack.includes(term));
}
