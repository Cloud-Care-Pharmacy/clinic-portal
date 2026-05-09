function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().toLowerCase();
  if (Array.isArray(value)) {
    return value
      .flatMap((v) => {
        const s = normalizeSearchValue(v);
        return s ? [s] : [];
      })
      .join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .flatMap((v) => {
        const s = normalizeSearchValue(v);
        return s ? [s] : [];
      })
      .join(" ");
  }
  return String(value).toLowerCase();
}

export function matchesSearchQuery(query: string, values: unknown[]) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = values
    .flatMap((v) => {
      const s = normalizeSearchValue(v);
      return s ? [s] : [];
    })
    .join(" ");
  return terms.every((term) => haystack.includes(term));
}
