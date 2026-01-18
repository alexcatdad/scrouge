import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      // Use jsdom for tests that need browser APIs
      ['tests/lib/guest*.test.ts', 'jsdom'],
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
