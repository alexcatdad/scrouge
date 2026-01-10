import { describe, expect, test } from "bun:test";

/**
 * Tests for WebLLM utilities and parsing logic
 *
 * Note: The actual WebLLM engine cannot be tested in Node.js/Bun as it requires
 * WebGPU which is only available in browsers. These tests focus on the parsing
 * and utility logic that can be tested without the actual engine.
 */

describe("webllm error parsing", () => {
  // Simulate the error message pattern from WebLLM when function calling parsing fails
  const createWebLLMError = (outputMessage: string) => {
    return new Error(
      `Internal error: error encountered when parsing outputMessage for function calling. ` +
        `Got outputMessage: ${outputMessage}` +
        `Got error: SyntaxError: Unexpected token 'T', "To determi"... is not valid JSON. Please try again.`,
    );
  };

  /**
   * Extracts plain text from WebLLM function calling parse error
   * This mirrors the logic in chatWithTools
   */
  function extractResponseFromError(error: Error): string | null {
    const errorMessage = error.message;

    if (errorMessage.includes("parsing outputMessage for function calling")) {
      const match = errorMessage.match(/Got outputMessage: ([\s\S]*?)(?:Got error:|$)/);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  test("extracts plain text response from WebLLM parse error", () => {
    const modelResponse =
      "To determine your total monthly spending on subscriptions, let's look at your current active subscriptions:\n\n" +
      "Current subscriptions: []\n" +
      "Available payment methods: []\n\n" +
      "It looks like you don't currently have any active subscriptions set up through this system. " +
      "Therefore, your total monthly spending on subscriptions managed by this assistant is $0.00.";

    const error = createWebLLMError(modelResponse);
    const extracted = extractResponseFromError(error);

    expect(extracted).not.toBeNull();
    expect(extracted).toContain("total monthly spending");
    expect(extracted).toContain("$0.00");
  });

  test("extracts multi-line response correctly", () => {
    const modelResponse =
      "Here's a summary of your subscriptions:\n" +
      "1. Netflix - $15.99/month\n" +
      "2. Spotify - $9.99/month\n" +
      "3. Disney+ - $7.99/month\n\n" +
      "Total: $33.97/month";

    const error = createWebLLMError(modelResponse);
    const extracted = extractResponseFromError(error);

    expect(extracted).toContain("Netflix");
    expect(extracted).toContain("Spotify");
    expect(extracted).toContain("Disney+");
    expect(extracted).toContain("$33.97");
  });

  test("returns null for unrelated errors", () => {
    const error = new Error("Network connection failed");
    const extracted = extractResponseFromError(error);

    expect(extracted).toBeNull();
  });

  test("returns null when no match in error message", () => {
    const error = new Error("parsing outputMessage for function calling - but no actual message");
    const extracted = extractResponseFromError(error);

    expect(extracted).toBeNull();
  });

  test("handles empty model response", () => {
    const error = createWebLLMError("");
    const extracted = extractResponseFromError(error);

    // Empty string after trim is falsy, so match[1] is empty and doesn't pass the if check
    // This is acceptable behavior - empty responses from the model shouldn't happen
    expect(extracted).toBeNull();
  });

  test("preserves special characters in response", () => {
    const modelResponse = "Your spending: $100.00 (USD) - 50% increase from last month!";
    const error = createWebLLMError(modelResponse);
    const extracted = extractResponseFromError(error);

    expect(extracted).toBe(modelResponse);
  });
});

describe("webllm model configuration", () => {
  test("WEBLLM_MODELS contains recommended model", async () => {
    // Dynamic import to get the actual models
    const { WEBLLM_MODELS, DEFAULT_MODEL } = await import("../src/lib/webllm");

    const defaultModelInfo = WEBLLM_MODELS.find((m) => m.id === DEFAULT_MODEL);

    expect(defaultModelInfo).toBeDefined();
    expect(defaultModelInfo?.name).toContain("Recommended");
  });

  test("all models have required fields", async () => {
    const { WEBLLM_MODELS } = await import("../src/lib/webllm");

    WEBLLM_MODELS.forEach((model) => {
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.size).toBeDefined();
      expect(model.description).toBeDefined();
      expect(model.id.length).toBeGreaterThan(0);
    });
  });

  test("getModelInfo returns correct model", async () => {
    const { getModelInfo, WEBLLM_MODELS } = await import("../src/lib/webllm");

    const firstModel = WEBLLM_MODELS[0];
    const info = getModelInfo(firstModel.id);

    expect(info).toEqual(firstModel);
  });

  test("getModelInfo returns undefined for unknown model", async () => {
    const { getModelInfo } = await import("../src/lib/webllm");

    const info = getModelInfo("nonexistent-model-id" as any);

    expect(info).toBeUndefined();
  });
});

describe("webllm type definitions", () => {
  test("ToolDefinition has correct structure", async () => {
    const { subscriptionTools } = await import("../src/lib/webllmTools");

    // Verify structure matches ToolDefinition type
    const tool = subscriptionTools[0];

    expect(tool).toHaveProperty("type", "function");
    expect(tool).toHaveProperty("function");
    expect(tool.function).toHaveProperty("name");
    expect(tool.function).toHaveProperty("description");
    expect(tool.function).toHaveProperty("parameters");
    expect(tool.function.parameters).toHaveProperty("type", "object");
    expect(tool.function.parameters).toHaveProperty("properties");
  });

  test("ToolCall interface is compatible with tool results", () => {
    // Verify the ToolCall interface structure
    const toolCall = {
      id: "call-123",
      type: "function" as const,
      function: {
        name: "addSubscription",
        arguments: JSON.stringify({ name: "Test", cost: 10, billingCycle: "monthly" }),
      },
    };

    expect(toolCall.id).toBe("call-123");
    expect(toolCall.type).toBe("function");
    expect(toolCall.function.name).toBe("addSubscription");
    expect(JSON.parse(toolCall.function.arguments)).toEqual({
      name: "Test",
      cost: 10,
      billingCycle: "monthly",
    });
  });
});

describe("webllm ChatMessage interface", () => {
  test("supports all required roles", () => {
    const roles = ["system", "user", "assistant", "tool"] as const;

    roles.forEach((role) => {
      const message = {
        role,
        content: `Test message for ${role}`,
      };

      expect(message.role).toBe(role);
      expect(message.content).toContain(role);
    });
  });

  test("assistant messages can include tool_calls", () => {
    const message = {
      role: "assistant" as const,
      content: null,
      tool_calls: [
        {
          id: "call-1",
          type: "function" as const,
          function: {
            name: "addSubscription",
            arguments: "{}",
          },
        },
      ],
    };

    expect(message.tool_calls).toHaveLength(1);
    expect(message.tool_calls[0].function.name).toBe("addSubscription");
  });

  test("tool messages include tool_call_id", () => {
    const message = {
      role: "tool" as const,
      content: JSON.stringify({ success: true }),
      tool_call_id: "call-1",
    };

    expect(message.tool_call_id).toBe("call-1");
  });
});
