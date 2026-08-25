/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--color-background)",
          secondary: "var(--color-background-secondary)",
          tertiary: "var(--color-background-tertiary)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          hover: "var(--color-surface-hover)",
          active: "var(--color-surface-active)",
        },
        text: {
          DEFAULT: "var(--color-text)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          light: "var(--color-border-light)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          dark: "var(--color-primary-dark)",
          foreground: "var(--color-primary-foreground)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          light: "var(--color-success-light)",
          foreground: "var(--color-success-foreground)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          light: "var(--color-warning-light)",
          foreground: "var(--color-warning-foreground)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          light: "var(--color-error-light)",
          foreground: "var(--color-error-foreground)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          light: "var(--color-info-light)",
          foreground: "var(--color-info-foreground)",
        },
        cat: {
          crm: "var(--color-cat-crm)",
          "crm-bg": "var(--color-cat-crm-bg)",
          finance: "var(--color-cat-finance)",
          "finance-bg": "var(--color-cat-finance-bg)",
          marketing: "var(--color-cat-marketing)",
          "marketing-bg": "var(--color-cat-marketing-bg)",
          comm: "var(--color-cat-comm)",
          "comm-bg": "var(--color-cat-comm-bg)",
          hr: "var(--color-cat-hr)",
          "hr-bg": "var(--color-cat-hr-bg)",
          projects: "var(--color-cat-projects)",
          "projects-bg": "var(--color-cat-projects-bg)",
          custom: "var(--color-cat-custom)",
          "custom-bg": "var(--color-cat-custom-bg)",
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};