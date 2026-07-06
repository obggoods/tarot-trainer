/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Pretendard", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#1f2421",
        parchment: "#f5f0e6",
        night: "#22223b",
        cedar: "#7b4f35",
        moss: "#4f6f52",
        wine: "#7f1d3a",
      },
    },
  },
  plugins: [],
};
