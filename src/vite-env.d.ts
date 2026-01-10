/// <reference types="vite/client" />

/**
 * Type declarations for Vite's import.meta.env
 *
 * These augment the built-in Vite types with our custom environment variables.
 * The actual validation is done by @t3-oss/env-core in src/lib/env.ts
 */
interface ImportMetaEnv {
  /** Convex deployment URL */
  readonly VITE_CONVEX_URL: string;
  /** Skip environment validation (for testing) */
  readonly SKIP_ENV_VALIDATION?: string;
  /** Vite mode: 'development' | 'production' | 'test' */
  readonly MODE: string;
  /** Whether running in development mode */
  readonly DEV: boolean;
  /** Whether running in production mode */
  readonly PROD: boolean;
  /** Whether running in SSR mode */
  readonly SSR: boolean;
  /** Base URL for the app */
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
