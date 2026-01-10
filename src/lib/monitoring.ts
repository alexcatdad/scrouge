/**
 * Error Monitoring Utility
 *
 * Provides a unified interface for error logging.
 * Currently logs to console only.
 */

export interface ErrorContext {
  userId?: string;
  operation?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/**
 * Check if we're in production mode using Vite's import.meta.env
 */
const _isProduction = import.meta.env.PROD;

/**
 * Initialize error monitoring (no-op, kept for API compatibility)
 */
export async function initMonitoring(): Promise<void> {
  // No-op: monitoring is now console-only
}

/**
 * Report an error to the console
 */
export function captureError(error: Error, context?: ErrorContext): void {
  // Always log to console
  console.error("[Error]", error, context);
}

/**
 * Report a message to the console
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: ErrorContext,
): void {
  console.log(`[${level.toUpperCase()}]`, message, context);
}

/**
 * Set user context for error tracking (no-op, kept for API compatibility)
 */
export function setUser(_userId: string | null, _email?: string): void {
  // No-op: console-only logging
}

/**
 * Add breadcrumb for debugging (no-op, kept for API compatibility)
 */
export function addBreadcrumb(
  _message: string,
  _category: string,
  _data?: Record<string, unknown>,
): void {
  // No-op: console-only logging
}

/**
 * Start a performance transaction (no-op, kept for API compatibility)
 */
export function startTransaction(_name: string, _operation: string): { finish: () => void } {
  return { finish: () => {} };
}

/**
 * React Error Boundary integration
 * Use this in your ErrorBoundary component
 */
export function reportBoundaryError(error: Error, componentStack: string): void {
  captureError(error, {
    operation: "react-error-boundary",
    extra: { componentStack },
  });
}
