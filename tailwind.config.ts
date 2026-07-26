import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SL Strength brand palette
        ink: {
          950: "#080808",
          900: "#0d0d0f",
          850: "#131316",
          800: "#1a1a1e",
          700: "#26262c",
          600: "#33333b",
        },
        blood: {
          50: "#fef2f3",
          400: "#f26571",
          500: "#e11d2a",
          600: "#c8121f",
          700: "#a30f1a",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(225,29,42,0.35), 0 8px 30px -8px rgba(225,29,42,0.35)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgba(225,29,42,0.10), transparent 45%)",
      },
    },
  },
  plugins: [],
};

export default config;
