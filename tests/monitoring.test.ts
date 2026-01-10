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

  test("captureMessage logs to console", async () => {
    // Dynamic import to reset module state
    const { captureMessage } = await import("../src/lib/monitoring");

    captureMessage("Test message", "info");

    expect(consoleLogs.some((log) => log.includes("Test message"))).toBe(true);
  });

  test("captureMessage includes context in log", async () => {
    const { captureMessage } = await import("../src/lib/monitoring");

    captureMessage("Test message", "warning", {
      userId: "user123",
      operation: "test-op",
    });

    expect(consoleLogs.some((log) => log.includes("Test message"))).toBe(true);
  });

  test("captureError logs error to console in development", async () => {
    const { captureError } = await import("../src/lib/monitoring");

    const error = new Error("Test error");
    captureError(error);

    expect(consoleErrors.some((log) => log.includes("Error"))).toBe(true);
  });

  test("captureError includes context", async () => {
    const { captureError } = await import("../src/lib/monitoring");

    const error = new Error("Test error");
    captureError(error, {
      userId: "user123",
      operation: "test-operation",
      tags: { component: "TestComponent" },
    });

    expect(consoleErrors.length).toBeGreaterThan(0);
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

  test("reportBoundaryError captures error with component stack", async () => {
    const { reportBoundaryError } = await import("../src/lib/monitoring");

    const error = new Error("Boundary error");
    const componentStack = "at TestComponent\n  at App";

    // Should not throw
    reportBoundaryError(error, componentStack);

    expect(consoleErrors.length).toBeGreaterThan(0);
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
