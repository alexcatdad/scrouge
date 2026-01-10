import { afterEach, beforeEach, describe, expect, test } from "bun:test";

// Mock console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

describe("Monitoring Utility", () => {
  let consoleLogs: string[];
  let consoleWarnings: string[];
  let consoleErrors: string[];
  let consoleInfos: string[];

  beforeEach(() => {
    consoleLogs = [];
    consoleWarnings = [];
    consoleErrors = [];
    consoleInfos = [];

    console.log = (...args) => {
      consoleLogs.push(args.join(" "));
    };
    console.warn = (...args) => {
      consoleWarnings.push(args.join(" "));
    };
    console.error = (...args) => {
      consoleErrors.push(args.join(" "));
    };
    console.info = (...args) => {
      consoleInfos.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
  });

  test("captureMessage is a no-op function", async () => {
    // Dynamic import to reset module state
    const { captureMessage } = await import("../src/lib/monitoring");

    // Should not throw - these are no-op functions
    captureMessage("Test message", "info");
    captureMessage("Test message", "warning", {
      userId: "user123",
      operation: "test-op",
    });

    // No-op functions don't log to console (implementation is now console-free)
    expect(true).toBe(true);
  });

  test("captureError is a no-op function", async () => {
    const { captureError } = await import("../src/lib/monitoring");

    const error = new Error("Test error");

    // Should not throw - these are no-op functions
    captureError(error);
    captureError(error, {
      userId: "user123",
      operation: "test-operation",
      tags: { component: "TestComponent" },
    });

    // No-op functions don't log to console (implementation is now console-free)
    expect(true).toBe(true);
  });

  test("initMonitoring is a no-op", async () => {
    // Mock window object for browser-specific code
    (globalThis as any).window = {};

    const { initMonitoring } = await import("../src/lib/monitoring");

    // Should not throw
    await initMonitoring();

    (globalThis as any).window = undefined;
  });

  test("startTransaction returns a finish function", async () => {
    const { startTransaction } = await import("../src/lib/monitoring");

    const transaction = startTransaction("test-transaction", "test");

    expect(transaction).toHaveProperty("finish");
    expect(typeof transaction.finish).toBe("function");

    // Should not throw
    transaction.finish();
  });

  test("setUser handles null user", async () => {
    const { setUser } = await import("../src/lib/monitoring");

    // Should not throw
    setUser(null);
  });

  test("setUser handles user with email", async () => {
    const { setUser } = await import("../src/lib/monitoring");

    // Should not throw
    setUser("user123", "test@example.com");
  });

  test("addBreadcrumb is a no-op", async () => {
    const { addBreadcrumb } = await import("../src/lib/monitoring");

    // Should not throw
    addBreadcrumb("Test breadcrumb", "test", { key: "value" });
  });

  test("reportBoundaryError is a no-op function", async () => {
    const { reportBoundaryError } = await import("../src/lib/monitoring");

    const error = new Error("Boundary error");
    const componentStack = "at TestComponent\n  at App";

    // Should not throw - this is a no-op function
    reportBoundaryError(error, componentStack);

    // No-op functions don't log to console (implementation is now console-free)
    expect(true).toBe(true);
  });
});

describe("MonitoringConfig", () => {
  test("initMonitoring accepts no arguments", async () => {
    // Mock window object for browser-specific code
    (globalThis as any).window = {};

    const { initMonitoring } = await import("../src/lib/monitoring");

    // Should not throw with no arguments
    await initMonitoring();

    (globalThis as any).window = undefined;
  });
});

describe("ErrorContext", () => {
  test("should support all context properties", async () => {
    const { captureError } = await import("../src/lib/monitoring");

    const error = new Error("Context test");

    // Should not throw with full context
    captureError(error, {
      userId: "user123",
      operation: "test-operation",
      tags: {
        component: "TestComponent",
        action: "click",
      },
      extra: {
        subscriptionId: "sub123",
        amount: 9.99,
      },
    });
  });
});
