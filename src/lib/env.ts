import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Type-safe environment variables for the client application.
 * Uses @t3-oss/env-core with Vite's import.meta.env for build-time validation.
 * 
 * Required environment variables:
 * - VITE_CONVEX_URL: The Convex deployment URL (required)
 * 
 * Optional environment variables:
 * - VITE_SENTRY_DSN: Sentry DSN for error monitoring
 */
export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    /**
     * Convex deployment URL - required for the app to function
     * Example: https://tough-hound-59.convex.cloud
     */
    VITE_CONVEX_URL: z.string().url({
      message: "VITE_CONVEX_URL must be a valid URL. Set it in your .env file.",
    }),
    /**
     * Sentry DSN for error monitoring (optional)
     * Example: https://xxx@sentry.io/xxx
     */
    VITE_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
  /**
   * Skip validation in test environments or when explicitly disabled
   */
  skipValidation: import.meta.env.SKIP_ENV_VALIDATION === "true",
});

