"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import type { ReactNode } from "react";
import { readTokens } from "@/lib/mui-tokens";

const emotionCache = createCache({ key: "mui", prepend: true });

// Subscribe is a no-op — tokens are read once on mount and don't change at runtime
const subscribe = () => () => {};
const getSnapshot = () => readTokens();
const getServerSnapshot = () => readTokens();

export function MuiThemeProvider({ children }: { children: ReactNode }) {
  const tokens = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
