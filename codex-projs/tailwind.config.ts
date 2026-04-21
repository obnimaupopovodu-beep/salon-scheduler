import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "\"Segoe UI\"", "sans-serif"]
      },
      colors: {
        accent: "#2563EB",
        canvas: "#F9FAFB",
        ink: "#111827",
        muted: "#6B7280",
        card: "#FFFFFF",
        appointment: "#DBEAFE"
      },
      boxShadow: {
        sheet: "0 -10px 30px rgba(17, 24, 39, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
