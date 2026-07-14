/**
 * Shared formatting helpers for the catalog area (Products / Inventory /
 * Orders). Money crosses the gateway as integer cents; format at the edge.
 */

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const AUD_WHOLE = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

/** Format integer cents as AUD, e.g. 1299 -> "$12.99". */
export function formatAudCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return AUD.format(cents / 100);
}

/** Format integer cents as whole-dollar AUD (for stat cards). */
export function formatAudCentsWhole(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return AUD_WHOLE.format(cents / 100);
}

const SHORT_DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

/** Format an ISO date/datetime as "14 Jan 2025". */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", SHORT_DATE);
}

/** Format an ISO datetime as "14 Jan 2025, 09:42". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-AU", SHORT_DATE)}, ${d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}
