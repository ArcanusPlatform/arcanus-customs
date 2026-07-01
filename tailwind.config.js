import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "rgb(var(--color-border-rgb) / <alpha-value>)",
        input: "rgb(var(--color-border-rgb) / <alpha-value>)",
        ring: "var(--color-ring)",
        background: "rgb(var(--color-bg-rgb) / <alpha-value>)",
        foreground: "rgb(var(--color-text-rgb) / <alpha-value>)",
        primary: {
          DEFAULT: "rgba(var(--brand-primary-rgb), <alpha-value>)",
          foreground: "var(--color-text-on-primary)",
        },
        secondary: {
          DEFAULT: "rgb(var(--color-surface-rgb) / <alpha-value>)",
          foreground: "rgb(var(--color-text-rgb) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--color-danger-rgb) / <alpha-value>)",
          foreground: "var(--color-text-on-primary)",
        },
        muted: {
          DEFAULT: "rgb(var(--color-surface-rgb) / <alpha-value>)",
          foreground: "rgb(var(--color-text-muted-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgba(var(--brand-primary-rgb), <alpha-value>)",
          foreground: "var(--color-text-on-primary)",
        },
        popover: {
          DEFAULT: "rgb(var(--color-surface-rgb) / <alpha-value>)",
          foreground: "rgb(var(--color-text-rgb) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--color-surface-rgb) / <alpha-value>)",
          foreground: "rgb(var(--color-text-rgb) / <alpha-value>)",
        },
        arcanus: {
          purple: "#7c3aed",
          violet: "#8b5cf6",
          light: "#a78bfa",
          pale: "#c4b5fd",
          dark: "#0f172a",
          darker: "#0a0e27",
          card: "#1e293b",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "arcanus-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124, 58, 237, 0.3), 0 0 30px rgba(124, 58, 237, 0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(124, 58, 237, 0.5), 0 0 40px rgba(124, 58, 237, 0.2)" },
        },
        "arcanus-fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "arcanus-glow": "arcanus-glow 3s ease-in-out infinite",
        "arcanus-fade-in": "arcanus-fade-in 0.6s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
