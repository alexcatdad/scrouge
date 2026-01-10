import { describe, expect, test } from "bun:test";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeDate,
} from "../src/lib/i18n/formatters";

describe("formatCurrency", () => {
  test("formats USD correctly in English", () => {
    const result = formatCurrency(9.99, "USD", "en");
    expect(result).toContain("9.99");
    expect(result).toMatch(/\$|USD/);
  });

  test("formats EUR correctly in English", () => {
    const result = formatCurrency(19.99, "EUR", "en");
    expect(result).toContain("19.99");
  });

  test("formats USD correctly in Spanish", () => {
    const result = formatCurrency(9.99, "USD", "es");
    // Spanish locale uses comma as decimal separator
    expect(result).toMatch(/9[,.]99/);
  });

  test("handles zero values", () => {
    const result = formatCurrency(0, "USD", "en");
    expect(result).toContain("0.00") || expect(result).toContain("0");
  });

  test("handles large values", () => {
    const result = formatCurrency(1000000, "USD", "en");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test("handles negative values", () => {
    const result = formatCurrency(-50, "USD", "en");
    expect(result).toContain("50");
  });

  test("falls back gracefully for unknown currencies", () => {
    const result = formatCurrency(100, "XXX", "en");
    expect(result).toContain("100");
  });
});

describe("formatDate", () => {
  test("formats date correctly in English", () => {
    const date = new Date("2025-01-15");
    const result = formatDate(date, "en");
    expect(result).toContain("2025");
    expect(result).toContain("15");
  });

  test("formats date correctly in Spanish", () => {
    const date = new Date("2025-01-15");
    const result = formatDate(date, "es");
    expect(result).toContain("2025");
    expect(result).toContain("15");
  });

  test("accepts timestamp as input", () => {
    const timestamp = Date.now();
    const result = formatDate(timestamp, "en");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test("accepts custom options", () => {
    const date = new Date("2025-01-15");
    const result = formatDate(date, "en", { weekday: "long" });
    expect(result).toBeTruthy();
  });
});

describe("formatRelativeDate", () => {
  test("formats 'today' correctly", () => {
    const now = new Date();
    const result = formatRelativeDate(now, "en");
    expect(result.toLowerCase()).toMatch(/today|now|0|minute/);
  });

  test("formats future dates", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const result = formatRelativeDate(future, "en");
    expect(result).toBeTruthy();
  });

  test("formats past dates", () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const result = formatRelativeDate(past, "en");
    expect(result).toBeTruthy();
  });

  test("handles timestamps", () => {
    const timestamp = Date.now() + 3600000; // 1 hour from now
    const result = formatRelativeDate(timestamp, "en");
    expect(result).toBeTruthy();
  });
});

describe("formatNumber", () => {
  test("formats integers correctly", () => {
    const result = formatNumber(1234, "en");
    expect(result).toContain("1");
    expect(result).toContain("234");
  });

  test("formats decimals correctly", () => {
    const result = formatNumber(1234.56, "en");
    // Formatted number includes thousand separators
    expect(result).toMatch(/1[,.]?234/);
  });

  test("handles zero", () => {
    const result = formatNumber(0, "en");
    expect(result).toBe("0");
  });

  test("handles negative numbers", () => {
    const result = formatNumber(-1234, "en");
    // Formatted number includes thousand separators
    expect(result).toMatch(/1[,.]?234/);
    expect(result).toContain("-");
  });

  test("accepts custom options", () => {
    const result = formatNumber(1234.5678, "en", { maximumFractionDigits: 2 });
    expect(result).toBeTruthy();
  });
});

describe("formatPercent", () => {
  test("formats percentage correctly", () => {
    const result = formatPercent(0.5, "en");
    expect(result).toContain("50");
    expect(result).toContain("%");
  });

  test("handles zero decimals", () => {
    const result = formatPercent(0.1234, "en", 0);
    expect(result).toContain("12%");
  });

  test("handles custom decimals", () => {
    const result = formatPercent(0.1234, "en", 2);
    // Result can be "12.34%" or "12,34%" depending on locale
    expect(result).toMatch(/12[,.]34/);
  });

  test("handles 100%", () => {
    const result = formatPercent(1, "en");
    expect(result).toContain("100");
  });

  test("handles values over 100%", () => {
    const result = formatPercent(1.5, "en");
    expect(result).toContain("150");
  });
});
