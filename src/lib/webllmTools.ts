import type { ToolDefinition, ToolCall } from "./webllm";

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
  subscriptions: Array<{ _id: string; name: string; cost: number; currency: string; billingCycle: string; isActive: boolean }>,
  paymentMethods: Array<{ _id: string; name: string; lastFourDigits?: string; isDefault: boolean }>
): string {
  return `You are a helpful assistant for managing subscriptions. You can help users:
1. Add new subscriptions
2. Update existing subscriptions
3. Cancel subscriptions
4. Track spending
5. Get reminders about upcoming payments
6. Analyze subscription costs

Current subscriptions: ${JSON.stringify(subscriptions, null, 2)}
Available payment methods: ${JSON.stringify(paymentMethods, null, 2)}

When helping with subscriptions, be specific about costs, billing cycles, and payment methods.
If the user wants to add a subscription, use the addSubscription tool with all necessary details.
If they want to update a subscription, use updateSubscription - you can reference by name if you don't have the ID.
If they want to cancel, use cancelSubscription.
If they mention a service name, try to provide helpful information about typical pricing.

Important: When the user mentions a specific day of the month for billing (like "1st of month" or "on the 15th"), include the billingDay parameter.`;
}

/**
 * Parse tool call arguments safely
 */
export function parseToolCallArgs(toolCall: ToolCall): Record<string, unknown> {
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
    return {};
  }
}

/**
 * Validate that a tool call has required fields
 */
export function validateToolCall(
  toolCall: ToolCall
): { valid: boolean; error?: string } {
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

