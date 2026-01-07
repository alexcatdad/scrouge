import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // Generate source maps for production debugging
    sourcemap: true,
    rollupOptions: {
      // Mark @sentry/react as external since it's dynamically imported and optional
      // Users who want Sentry should install it: bun add @sentry/react
      external: ["@sentry/react"],
      output: {
        // Provide globals for external modules (needed for UMD builds)
        globals: {
          "@sentry/react": "Sentry",
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "convex/react"],
    // Exclude optional dependencies that may not be installed
    exclude: ["@sentry/react"],
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
