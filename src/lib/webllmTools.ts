import type { ToolCall, ToolDefinition } from "./webllm";

/**
 * Tool definitions for subscription management
 * These mirror the tools defined in convex/chat.ts
 */
export const subscriptionTools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "addSubscription",
      description: "Add a new subscription for the user",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Service name (e.g., Netflix, Spotify)",
          },
          cost: {
            type: "number",
            description: "Cost per billing cycle",
          },
          currency: {
            type: "string",
            description: "Currency code (e.g., USD, EUR). Defaults to USD.",
          },
          billingCycle: {
            type: "string",
            enum: ["monthly", "yearly", "weekly", "daily"],
            description: "Billing frequency",
          },
          paymentMethodId: {
            type: "string",
            description: "Payment method ID if available",
          },
          category: {
            type: "string",
            description: "Category (e.g., Entertainment, Software, Cloud)",
          },
          website: {
            type: "string",
            description: "Service website URL",
          },
          description: {
            type: "string",
            description: "Additional description",
          },
          notes: {
            type: "string",
            description: "Any additional notes",
          },
          billingDay: {
            type: "number",
            description: "Day of month for billing (1-31). If not specified, defaults to today.",
          },
        },
        required: ["name", "cost", "billingCycle"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateSubscription",
      description: "Update an existing subscription",
      parameters: {
        type: "object",
        properties: {
          subscriptionId: {
            type: "string",
            description: "ID of the subscription to update",
          },
          subscriptionName: {
            type: "string",
            description: "Name of the subscription to update (if ID not known)",
          },
          name: {
            type: "string",
            description: "New service name",
          },
          cost: {
            type: "number",
            description: "New cost",
          },
          billingCycle: {
            type: "string",
            enum: ["monthly", "yearly", "weekly", "daily"],
            description: "New billing cycle",
          },
          isActive: {
            type: "boolean",
            description: "Whether subscription is active",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancelSubscription",
      description: "Cancel (deactivate) a subscription",
      parameters: {
        type: "object",
        properties: {
          subscriptionId: {
            type: "string",
            description: "ID of the subscription to cancel",
          },
          subscriptionName: {
            type: "string",
            description: "Name of the subscription to cancel (if ID not known)",
          },
        },
        required: [],
      },
    },
  },
];

/**
 * Build the system prompt for subscription management
 */
export function buildSystemPrompt(
  subscriptions: Array<{
    _id: string;
    name: string;
    cost: number;
    currency: string;
    billingCycle: string;
    isActive: boolean;
    category?: string;
  }>,
  paymentMethods: Array<{ _id: string; name: string; lastFourDigits?: string; isDefault: boolean }>,
): string {
  // Calculate spending summaries for the model
  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  const monthlyTotal = activeSubscriptions.reduce((sum, s) => {
    const monthlyCost =
      s.billingCycle === "yearly"
        ? s.cost / 12
        : s.billingCycle === "weekly"
          ? s.cost * 4.33
          : s.billingCycle === "daily"
            ? s.cost * 30
            : s.cost;
    return sum + monthlyCost;
  }, 0);
  const yearlyTotal = monthlyTotal * 12;

  return `You are a helpful assistant for managing subscriptions. You help users add, update, cancel, and analyze their subscriptions.

CURRENT DATA:
- Active subscriptions: ${activeSubscriptions.length}
- Monthly spending: $${monthlyTotal.toFixed(2)}
- Yearly spending: $${yearlyTotal.toFixed(2)}
- Subscriptions: ${JSON.stringify(
    subscriptions.map((s) => ({
      name: s.name,
      cost: s.cost,
      currency: s.currency,
      billingCycle: s.billingCycle,
      isActive: s.isActive,
      category: s.category,
    })),
    null,
    2,
  )}
- Payment methods: ${JSON.stringify(
    paymentMethods.map((pm) => ({
      name: pm.name,
      lastFourDigits: pm.lastFourDigits,
      isDefault: pm.isDefault,
    })),
    null,
    2,
  )}

TOOL USAGE:
- Use addSubscription ONLY when the user explicitly wants to ADD a new subscription
- Use updateSubscription ONLY when the user explicitly wants to CHANGE an existing subscription
- Use cancelSubscription ONLY when the user explicitly wants to CANCEL/REMOVE a subscription

FOR QUESTIONS (spending, analytics, listing):
- Answer directly using the data above - do NOT use tools
- Calculate totals, averages, and summaries from the subscription data
- Be conversational and helpful

When adding subscriptions, include billingDay if the user mentions a specific billing date.`;
}

/**
 * Parse tool call arguments safely
 */
export function parseToolCallArgs(toolCall: ToolCall): Record<string, unknown> {
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return {};
  }
}

/**
 * Validate that a tool call has required fields
 */
export function validateToolCall(toolCall: ToolCall): { valid: boolean; error?: string } {
  const args = parseToolCallArgs(toolCall);
  const toolName = toolCall.function.name;

  switch (toolName) {
    case "addSubscription":
      if (!args.name || typeof args.name !== "string") {
        return { valid: false, error: "Missing or invalid subscription name" };
      }
      if (typeof args.cost !== "number" || args.cost <= 0) {
        return { valid: false, error: "Missing or invalid cost" };
      }
      if (!["monthly", "yearly", "weekly", "daily"].includes(args.billingCycle as string)) {
        return { valid: false, error: "Invalid billing cycle" };
      }
      return { valid: true };

    case "updateSubscription":
      if (!args.subscriptionId && !args.subscriptionName) {
        return { valid: false, error: "Must provide either subscriptionId or subscriptionName" };
      }
      return { valid: true };

    case "cancelSubscription":
      if (!args.subscriptionId && !args.subscriptionName) {
        return { valid: false, error: "Must provide either subscriptionId or subscriptionName" };
      }
      return { valid: true };

    default:
      return { valid: false, error: `Unknown tool: ${toolName}` };
  }
}
