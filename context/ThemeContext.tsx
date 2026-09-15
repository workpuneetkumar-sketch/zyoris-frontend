"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "zyoris-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<ThemeMode>("light");

  useEffect(() => {
    localStorage.setItem(THEME_KEY, "light");
    const root = document.documentElement;
    root.classList.add("light");
    root.classList.remove("dark");
  }, []);

  const value: ThemeContextValue = {
    theme: "light",
    setTheme: () => {},
    isDark: false,
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
