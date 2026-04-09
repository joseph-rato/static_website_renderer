import React, { createContext, useContext } from "react";
import type { ThemeTokens } from "@pagoda/schema";

const ThemeContext = createContext<ThemeTokens | null>(null);

export function useTheme(): ThemeTokens | null {
  return useContext(ThemeContext);
}

/** Converts ThemeTokens to CSS custom properties on a wrapping div. */
export function ThemeProvider({
  theme,
  children,
}: {
  theme: ThemeTokens;
  children: React.ReactNode;
}) {
  const style = themeToCustomProperties(theme);
  return (
    <ThemeContext.Provider value={theme}>
      <div style={style} data-sr-theme="">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function themeToCustomProperties(
  theme: ThemeTokens,
): Record<string, string> {
  const vars: Record<string, string> = {
    "--color-primary": theme.colors.primary,
    "--color-secondary": theme.colors.secondary,
    "--font-primary": theme.fonts.primary,
    "--font-secondary": theme.fonts.secondary,
  };
  if (theme.colors.primaryText) {
    vars["--color-primary-text"] = theme.colors.primaryText;
  }
  if (theme.colors.secondaryText) {
    vars["--color-secondary-text"] = theme.colors.secondaryText;
  }
  if (theme.colors.background) {
    vars["--color-background"] = theme.colors.background;
  }
  if (theme.colors.surface) {
    vars["--color-surface"] = theme.colors.surface;
  }
  if (theme.custom) {
    for (const [key, value] of Object.entries(theme.custom)) {
      vars[`--${key}`] = value;
    }
  }
  return vars;
}

export function themeToCSSString(theme: ThemeTokens): string {
  const vars = themeToCustomProperties(theme);
  const entries = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `:root {\n${entries}\n}`;
}
