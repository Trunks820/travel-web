/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#edf7f6",
          100: "#d0edea",
          200: "#a3dbd5",
          300: "#6bc4bb",
          400: "#3da89e",
          500: "#1a7a6d",
          600: "#166559",
          700: "#135249",
          800: "#1c3640",
          900: "#0f2a30",
        },
        accent: {
          50: "#fff6ed",
          100: "#ffe9d5",
          200: "#ffd1aa",
          300: "#ffb274",
          400: "#f2923e",
          500: "#e8783a",
          600: "#d4632e",
          700: "#b04d24",
          800: "#8e3e20",
          900: "#73331c",
        },
        sand: {
          50: "#f7f9fa",
          100: "#eef2f4",
          200: "#dde4e8",
          300: "#c4cfd5",
          400: "#6b7f87",
          500: "#4d6069",
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
        soft: "0 2px 16px -2px rgba(26, 107, 122, 0.08)",
        card: "0 4px 24px -4px rgba(26, 107, 122, 0.10)",
        "card-hover": "0 8px 32px -4px rgba(26, 107, 122, 0.15)",
      },
      fontFamily: {
        display: ['"Satoshi"', "system-ui", '"Noto Sans SC"', "sans-serif"],
        body: ["system-ui", '"Noto Sans SC"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
