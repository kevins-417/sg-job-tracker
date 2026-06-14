import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the frontend runs on :5173 and proxies /api to the Express
// server on :4000, so there are no CORS headaches and VITE_API_BASE can stay
// empty. In production you set VITE_API_BASE to your deployed API origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
