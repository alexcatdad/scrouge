import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      // Use happy-dom for tests that need browser APIs
      ['**/tests/lib/guest*.test.ts', 'happy-dom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'convex/_generated/**',
        '.svelte-kit/**',
        'build/**',
      ],
    },
    setupFiles: ['tests/setup.ts'],
  },
});
