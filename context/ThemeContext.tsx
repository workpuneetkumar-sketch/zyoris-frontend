"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "zyoris-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
        if (stored && ["light", "dark", "system"].includes(stored)) {
          return stored;
        }
      } catch {
        // ignore
      }
    }
    return "light";
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === "dark") return true;
        if (stored === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return true;
        return false;
      } catch {
        return false;
      }
    }
    return false;
  });

  // Update DOM and calculate isDark
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let activeIsDark = false;
      if (theme === "dark") {
        activeIsDark = true;
      } else if (theme === "system") {
        activeIsDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      } else {
        activeIsDark = false;
      }

      setIsDark(activeIsDark);
      if (activeIsDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
    };

    applyTheme();

    if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // ignore
    }
  }, []);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

