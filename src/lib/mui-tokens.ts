/**
 * MUI token bridge — reads CSS custom properties from globals.css
 * so the MUI theme stays in sync with the design system tokens.
 *
 * Call `readTokens()` inside a client component (after hydration).
 * Falls back to hardcoded values on the server.
 */

/** MIRROR of globals.css :root — used during SSR when getComputedStyle is unavailable */
const FALLBACK = {
  primary: "#c96442",
  secondary: "#535146",
  background: "#faf9f5",
  paper: "#f5f4ef",
  foreground: "#3d3929",
  mutedForeground: "#6e6d68",
  border: "#dad9d4",
} as const;

function readVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function readTokens() {
  return {
    primary: readVar("--primary") || FALLBACK.primary,
    secondary: readVar("--secondary-foreground") || FALLBACK.secondary,
    background: readVar("--background") || FALLBACK.background,
    paper: readVar("--card") || FALLBACK.paper,
    foreground: readVar("--foreground") || FALLBACK.foreground,
    mutedForeground: readVar("--muted-foreground") || FALLBACK.mutedForeground,
    border: readVar("--border") || FALLBACK.border,
  };
}
