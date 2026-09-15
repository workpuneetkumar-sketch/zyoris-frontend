"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import classNames from "classnames";

export function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-background-secondary border border-border">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={classNames(
              "p-2 rounded-lg transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-text-muted hover:text-text hover:bg-surface-hover"
            )}
            aria-label={option.label}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
