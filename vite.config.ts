import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    // Generate source maps for production debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "convex/react"],
  },
  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
  },
  // Preview server for testing production builds
  preview: {
    port: 4173,
  },
});
