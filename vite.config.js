import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local dev server only (no Live Server extension needed).
// Run with: npm run dev  -> opens on http://localhost:5173
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Forward /api calls to the Express backend on :5000
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
