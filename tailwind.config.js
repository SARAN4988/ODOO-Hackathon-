/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1E2430",
        surface: "#FFFFFF",
        canvas: "#F5F7FA",
        border: "#E3E7EE",
        primary: {
          DEFAULT: "#2B3A67",
          light: "#3F5290",
          dark: "#1C2647",
        },
        accent: {
          DEFAULT: "#3F9C6D",
          light: "#E6F4EC",
        },
        warn: {
          DEFAULT: "#D98E3B",
          light: "#FBF0E1",
        },
        danger: {
          DEFAULT: "#C7492F",
          light: "#FBEAE6",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,36,48,0.06), 0 1px 12px rgba(30,36,48,0.04)",
      },
    },
  },
  plugins: [],
};
