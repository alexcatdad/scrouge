import { describe, expect, test } from "bun:test";
import type { ToolCall } from "../src/lib/webllm";
import {
  buildSystemPrompt,
  parseToolCallArgs,
  subscriptionTools,
  validateToolCall,
} from "../src/lib/webllmTools";

describe("webllmTools", () => {
  describe("subscriptionTools", () => {
    test("defines addSubscription tool with required fields", () => {
      const addTool = subscriptionTools.find((t) => t.function.name === "addSubscription");
      expect(addTool).toBeDefined();
      expect(addTool?.function.parameters.required).toContain("name");
      expect(addTool?.function.parameters.required).toContain("cost");
      expect(addTool?.function.parameters.required).toContain("billingCycle");
    });

    test("defines updateSubscription tool", () => {
      const updateTool = subscriptionTools.find((t) => t.function.name === "updateSubscription");
      expect(updateTool).toBeDefined();
      expect(updateTool?.function.description).toContain("Update");
    });

    test("defines cancelSubscription tool", () => {
      const cancelTool = subscriptionTools.find((t) => t.function.name === "cancelSubscription");
      expect(cancelTool).toBeDefined();
      expect(cancelTool?.function.description).toContain("Cancel");
    });

    test("all tools have type function", () => {
      subscriptionTools.forEach((tool) => {
        expect(tool.type).toBe("function");
      });
    });
  });

  describe("buildSystemPrompt", () => {
    test("includes subscription data in prompt", () => {
      const subscriptions = [
        {
          _id: "sub1",
          name: "Netflix",
          cost: 15.99,
          currency: "USD",
          billingCycle: "monthly",
          isActive: true,
          category: "Entertainment",
        },
      ];
      const paymentMethods = [
        { _id: "pm1", name: "Visa", lastFourDigits: "1234", isDefault: true },
      ];

      const prompt = buildSystemPrompt(subscriptions, paymentMethods);

      expect(prompt).toContain("Netflix");
      expect(prompt).toContain("15.99");
      expect(prompt).toContain("monthly");
    });

    test("calculates monthly spending correctly", () => {
      const subscriptions = [
        {
          _id: "sub1",
          name: "Netflix",
          cost: 15.99,
          currency: "USD",
          billingCycle: "monthly" as const,
          isActive: true,
        },
        {
          _id: "sub2",
          name: "Spotify",
          cost: 9.99,
          currency: "USD",
          billingCycle: "monthly" as const,
          isActive: true,
        },
      ];

      const prompt = buildSystemPrompt(subscriptions, []);

      // Should contain the calculated monthly total: 15.99 + 9.99 = 25.98
      expect(prompt).toContain("$25.98");
    });

    test("converts yearly subscriptions to monthly for total", () => {
      const subscriptions = [
        {
          _id: "sub1",
          name: "Adobe",
          cost: 239.88, // $239.88/year = $19.99/month
          currency: "USD",
          billingCycle: "yearly" as const,
          isActive: true,
        },
      ];

      const prompt = buildSystemPrompt(subscriptions, []);

      // Monthly = 239.88 / 12 = 19.99
      expect(prompt).toContain("$19.99");
    });

    test("converts weekly subscriptions to monthly for total", () => {
      const subscriptions = [
        {
          _id: "sub1",
          name: "Weekly Service",
          cost: 5,
          currency: "USD",
          billingCycle: "weekly" as const,
          isActive: true,
        },
      ];

      const prompt = buildSystemPrompt(subscriptions, []);

      // Monthly = 5 * 4.33 = 21.65
      expect(prompt).toContain("$21.65");
    });

    test("only counts active subscriptions for spending", () => {
      const subscriptions = [
        {
          _id: "sub1",
          name: "Active",
          cost: 10,
          currency: "USD",
          billingCycle: "monthly" as const,
          isActive: true,
        },
        {
          _id: "sub2",
          name: "Inactive",
          cost: 100,
          currency: "USD",
          billingCycle: "monthly" as const,
          isActive: false,
        },
      ];

      const prompt = buildSystemPrompt(subscriptions, []);

      // Should only count the $10 active subscription
      expect(prompt).toContain("Monthly spending: $10.00");
      expect(prompt).not.toContain("$110");
    });

    test("includes payment method info", () => {
      const paymentMethods = [
        { _id: "pm1", name: "Chase Visa", lastFourDigits: "4242", isDefault: true },
        { _id: "pm2", name: "Amex", lastFourDigits: "1234", isDefault: false },
      ];

      const prompt = buildSystemPrompt([], paymentMethods);

      expect(prompt).toContain("Chase Visa");
      expect(prompt).toContain("4242");
      expect(prompt).toContain("Amex");
    });

    test("provides tool usage guidance", () => {
      const prompt = buildSystemPrompt([], []);

      expect(prompt).toContain("addSubscription");
      expect(prompt).toContain("updateSubscription");
      expect(prompt).toContain("cancelSubscription");
      expect(prompt).toContain("ONLY when the user explicitly wants to");
    });

    test("handles empty subscriptions and payment methods", () => {
      const prompt = buildSystemPrompt([], []);

      expect(prompt).toContain("Active subscriptions: 0");
      expect(prompt).toContain("Monthly spending: $0.00");
    });
  });

  describe("parseToolCallArgs", () => {
    test("parses valid JSON arguments", () => {
      const toolCall: ToolCall = {
        id: "call-1",
        type: "function",
        function: {
          name: "addSubscription",
          arguments: JSON.stringify({
            name: "Netflix",
            cost: 15.99,
            billingCycle: "monthly",
          }),
        },
      };

      const args = parseToolCallArgs(toolCall);

      expect(args.name).toBe("Netflix");
      expect(args.cost).toBe(15.99);
      expect(args.billingCycle).toBe("monthly");
    });

    test("returns empty object for invalid JSON", () => {
      const toolCall: ToolCall = {
        id: "call-1",
        type: "function",
        function: {
          name: "addSubscription",
          arguments: "invalid json {",
        },
      };

      const args = parseToolCallArgs(toolCall);

      expect(args).toEqual({});
    });

    test("handles empty arguments string", () => {
      const toolCall: ToolCall = {
        id: "call-1",
        type: "function",
        function: {
          name: "addSubscription",
          arguments: "",
        },
      };

      const args = parseToolCallArgs(toolCall);

      expect(args).toEqual({});
    });
  });

  describe("validateToolCall", () => {
    describe("addSubscription", () => {
      test("validates correct addSubscription call", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "addSubscription",
            arguments: JSON.stringify({
              name: "Netflix",
              cost: 15.99,
              billingCycle: "monthly",
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test("rejects addSubscription without name", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "addSubscription",
            arguments: JSON.stringify({
              cost: 15.99,
              billingCycle: "monthly",
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(false);
        expect(result.error).toContain("name");
      });

      test("rejects addSubscription with invalid cost", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "addSubscription",
            arguments: JSON.stringify({
              name: "Netflix",
              cost: -5,
              billingCycle: "monthly",
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(false);
        expect(result.error).toContain("cost");
      });

      test("rejects addSubscription with invalid billing cycle", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "addSubscription",
            arguments: JSON.stringify({
              name: "Netflix",
              cost: 15.99,
              billingCycle: "biweekly", // Invalid
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(false);
        expect(result.error).toContain("billing cycle");
      });

      test("accepts all valid billing cycles", () => {
        const cycles = ["monthly", "yearly", "weekly", "daily"];

        cycles.forEach((cycle) => {
          const toolCall: ToolCall = {
            id: "call-1",
            type: "function",
            function: {
              name: "addSubscription",
              arguments: JSON.stringify({
                name: "Test",
                cost: 10,
                billingCycle: cycle,
              }),
            },
          };

          const result = validateToolCall(toolCall);
          expect(result.valid).toBe(true);
        });
      });
    });

    describe("updateSubscription", () => {
      test("validates with subscriptionId", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "updateSubscription",
            arguments: JSON.stringify({
              subscriptionId: "sub123",
              cost: 19.99,
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(true);
      });

      test("validates with subscriptionName", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "updateSubscription",
            arguments: JSON.stringify({
              subscriptionName: "Netflix",
              cost: 19.99,
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(true);
      });

      test("rejects without identifier", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "updateSubscription",
            arguments: JSON.stringify({
              cost: 19.99,
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(false);
        expect(result.error).toContain("subscriptionId");
        expect(result.error).toContain("subscriptionName");
      });
    });

    describe("cancelSubscription", () => {
      test("validates with subscriptionId", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "cancelSubscription",
            arguments: JSON.stringify({
              subscriptionId: "sub123",
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(true);
      });

      test("validates with subscriptionName", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "cancelSubscription",
            arguments: JSON.stringify({
              subscriptionName: "Netflix",
            }),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(true);
      });

      test("rejects without identifier", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "cancelSubscription",
            arguments: JSON.stringify({}),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(false);
      });
    });

    describe("unknown tool", () => {
      test("rejects unknown tool names", () => {
        const toolCall: ToolCall = {
          id: "call-1",
          type: "function",
          function: {
            name: "unknownTool",
            arguments: JSON.stringify({}),
          },
        };

        const result = validateToolCall(toolCall);

        expect(result.valid).toBe(false);
        expect(result.error).toContain("Unknown tool");
      });
    });
  });
});
