"use client";

import { useMemo } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import type { ReactNode } from "react";
import { readTokens } from "@/lib/mui-tokens";

const emotionCache = createCache({ key: "mui", prepend: true });

// Tokens are static (CSS custom properties don't change at runtime in this app).
// Read once at module level so the reference is stable and MUI theme is created once.
const tokens = readTokens();

export function MuiThemeProvider({ children }: { children: ReactNode }) {
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: { main: tokens.primary },
          secondary: { main: tokens.secondary },
          background: {
            default: tokens.background,
            paper: tokens.paper,
          },
          text: {
            primary: tokens.foreground,
            secondary: tokens.mutedForeground,
          },
          divider: tokens.border,
        },
        typography: {
          fontFamily: "Outfit, sans-serif",
          fontSize: 14,
        },
        shape: {
          borderRadius: 16,
        },
      }),
    [tokens]
  );

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </CacheProvider>
  );
}
