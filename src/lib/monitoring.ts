/**
 * Error Monitoring Utility
 * 
 * Provides a unified interface for error monitoring and reporting.
 * Can be configured to use Sentry or other monitoring services.
 * 
 * To enable Sentry:
 * 1. Install: bun add @sentry/react
 * 2. Set VITE_SENTRY_DSN environment variable in .env
 * 3. Call initMonitoring() in main.tsx
 */

export interface MonitoringConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  debug?: boolean;
}

export interface ErrorContext {
  userId?: string;
  operation?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

// Global state for monitoring
let isInitialized = false;
let sentryInstance: typeof import("@sentry/react") | null = null;

/**
 * Check if we're in production mode using Vite's import.meta.env
 */
const isProduction = import.meta.env.PROD;

/**
 * Initialize error monitoring
 * Call this in main.tsx before rendering the app
 */
export async function initMonitoring(config?: MonitoringConfig): Promise<void> {
  if (isInitialized) return;

  const dsn = config?.dsn;
  
  if (!dsn) {
    console.info("[Monitoring] No DSN configured, error monitoring disabled");
    isInitialized = true;
    return;
  }

  try {
    // Dynamically import Sentry to avoid bundling if not used
    const Sentry = await import("@sentry/react");
    
    Sentry.init({
      dsn,
      environment: config?.environment || import.meta.env.MODE,
      release: config?.release,
      debug: config?.debug ?? !isProduction,
      
      // Performance monitoring
      tracesSampleRate: isProduction ? 0.1 : 1.0,
      
      // Session replay (optional)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Filter out non-critical errors
      beforeSend(event) {
        // Don't send errors from development
        if (!isProduction) {
          return null;
        }
        return event;
      },
    });

    sentryInstance = Sentry;
    isInitialized = true;
    console.info("[Monitoring] Sentry initialized successfully");
  } catch (error) {
    // Sentry not installed or failed to initialize
    console.warn("[Monitoring] Failed to initialize Sentry:", error);
    isInitialized = true;
  }
}

/**
 * Report an error to the monitoring service
 */
export function captureError(error: Error, context?: ErrorContext): void {
  // Always log to console in development
  if (!isProduction) {
    console.error("[Error]", error, context);
  }

  if (!sentryInstance) return;

  sentryInstance.withScope((scope) => {
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context?.operation) {
      scope.setTag("operation", context.operation);
    }
    
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    sentryInstance!.captureException(error);
  });
}

/**
 * Report a message to the monitoring service
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: ErrorContext
): void {
  if (!sentryInstance) {
    console.log(`[${level.toUpperCase()}]`, message, context);
    return;
  }

  sentryInstance.withScope((scope) => {
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    sentryInstance!.captureMessage(message, level);
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string | null, email?: string): void {
  if (!sentryInstance) return;

  if (userId) {
    sentryInstance.setUser({ id: userId, email });
  } else {
    sentryInstance.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (!sentryInstance) return;

  sentryInstance.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  operation: string
): { finish: () => void } {
  if (!sentryInstance) {
    return { finish: () => {} };
  }

  const transaction = sentryInstance.startTransaction({
    name,
    op: operation,
  });

  return {
    finish: () => transaction.finish(),
  };
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
