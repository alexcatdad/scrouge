import { describe, test, expect } from "bun:test";
import { cn } from "../src/lib/utils";

describe("cn (className utility)", () => {
  test("combines multiple class names", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  test("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  test("filters out falsy values", () => {
    const result = cn("base", false, null, undefined, "valid");
    expect(result).toBe("base valid");
  });

  test("merges tailwind classes correctly", () => {
    // twMerge should handle conflicting classes
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2"); // Later class wins
  });

  test("handles array input", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  test("handles object input", () => {
    const result = cn({
      active: true,
      disabled: false,
      hover: true,
    });
    expect(result).toContain("active");
    expect(result).toContain("hover");
    expect(result).not.toContain("disabled");
  });

  test("handles empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  test("handles complex tailwind merging", () => {
    const result = cn(
      "text-red-500",
      "text-blue-500"
    );
    expect(result).toBe("text-blue-500");
  });

  test("preserves non-conflicting classes", () => {
    const result = cn("bg-red-500", "text-white", "p-4");
    expect(result).toContain("bg-red-500");
    expect(result).toContain("text-white");
    expect(result).toContain("p-4");
  });

  test("handles responsive classes", () => {
    const result = cn("md:p-4", "lg:p-6");
    expect(result).toContain("md:p-4");
    expect(result).toContain("lg:p-6");
  });
});

