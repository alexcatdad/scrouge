import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Bundle analyzer - generates stats.html in project root
    // Only in build mode, not during development
    mode === "production" &&
      visualizer({
        filename: "bundle-stats.html",
        open: false, // Don't auto-open in browser
        gzipSize: true,
        brotliSize: true,
        template: "treemap", // treemap, sunburst, or network
      }),
  ].filter(Boolean),
  build: {
    outDir: "dist",
    // Generate source maps for production debugging
    sourcemap: true,
    // Rollup options for bundle optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          react: ["react", "react-dom"],
          // Convex runtime (excluding @convex-dev/auth which has export resolution issues)
          convex: ["convex", "convex/react"],
          // AI SDKs (loaded on demand)
          ai: ["ai", "@ai-sdk/openai", "@ai-sdk/xai", "@ai-sdk/mistral"],
          // IndexedDB for offline support
          dexie: ["dexie", "dexie-react-hooks"],
        },
      },
    },
    // Increase chunk size warning limit (WebLLM is large)
    chunkSizeWarningLimit: 1000,
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
}));
