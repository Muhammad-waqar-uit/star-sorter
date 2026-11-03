/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  // Theme tokens are applied through a variable class name, so keep both
  // variants in the output even when only one is referenced statically.
  safelist: ["ss-theme-dark", "ss-theme-light"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--ss-bg) / <alpha-value>)",
        surface: "rgb(var(--ss-surface) / <alpha-value>)",
        surface2: "rgb(var(--ss-surface-2) / <alpha-value>)",
        line: "rgb(var(--ss-border) / <alpha-value>)",
        ink: "rgb(var(--ss-text) / <alpha-value>)",
        muted: "rgb(var(--ss-muted) / <alpha-value>)",
        input: "rgb(var(--ss-input) / <alpha-value>)",
        hover: "rgb(var(--ss-hover) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--ss-accent, 109 124 242) / <alpha-value>)",
          strong: "rgb(var(--ss-accent-strong, 85 99 232) / <alpha-value>)",
          soft: "rgb(var(--ss-accent, 109 124 242) / 0.14)"
        },
        success: {
          DEFAULT: "#238636",
          hover: "#2ea043",
          soft: "rgba(35, 134, 54, 0.14)"
        },
        danger: {
          DEFAULT: "#e5534b",
          soft: "rgba(229, 83, 75, 0.12)"
        },
        warn: {
          DEFAULT: "#d29922",
          soft: "rgba(210, 153, 34, 0.12)"
        }
      },
      boxShadow: {
        panel: "0 24px 70px rgba(2, 6, 23, 0.38)",
        float: "0 10px 30px rgba(2, 6, 23, 0.22)"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Noto Sans",
          "Helvetica",
          "Arial",
          "sans-serif"
        ],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
}
