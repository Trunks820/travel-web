/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6f7f5",
          100: "#ccefeb",
          200: "#99dfd7",
          300: "#66cfc3",
          400: "#33bfaf",
          500: "#00af9b",
          600: "#008c7c",
          700: "#00695d",
          800: "#00463e",
          900: "#00231f",
        },
        accent: {
          50: "#fff4e6",
          100: "#ffe9cc",
          200: "#ffd399",
          300: "#ffbd66",
          400: "#ffa733",
          500: "#ff9100",
          600: "#cc7400",
          700: "#995700",
          800: "#663a00",
          900: "#331d00",
        },
        sand: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
        },
      },
      maxWidth: {
        form: "34rem",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        soft: "0 2px 16px -2px rgba(0, 175, 155, 0.08)",
        card: "0 4px 24px -4px rgba(0, 175, 155, 0.10)",
        "card-hover": "0 8px 32px -4px rgba(0, 175, 155, 0.15)",
      },
      fontFamily: {
        display: ['"Satoshi"', "system-ui", '"Noto Sans SC"', "sans-serif"],
        body: ["system-ui", '"Noto Sans SC"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
