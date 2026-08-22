/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1C2333",
        slate: "#4B5468",
        mist: "#F5F6FA",
        line: "#E3E6EF",
        flow: {
          DEFAULT: "#3355FF",
          dark: "#1F3ACC",
          light: "#E8ECFF",
        },
        ok: "#1E9E6C",
        warn: "#C98A1B",
        bad: "#D8475C",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,35,51,0.04), 0 8px 24px rgba(28,35,51,0.06)",
      },
    },
  },
  plugins: [],
};
