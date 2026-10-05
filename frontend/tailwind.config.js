/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1814",
        paper: "#f7f1e6",
        night: "#141b24",
        persimmon: "#e36a3a",
        marigold: "#f0c14e",
        sage: "#6ea892",
        sea: "#2a6f86",
        wood: "#8d5a38",
      },
      fontFamily: {
        display: ["Fraunces", "Iowan Old Style", "Palatino", "serif"],
        read: ["Literata", "Iowan Old Style", "Georgia", "serif"],
        ui: ["Nunito", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      minHeight: {
        tap: "48px",
      },
      minWidth: {
        tap: "48px",
      },
    },
  },
  plugins: [],
};
