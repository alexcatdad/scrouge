import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { generateText, tool } from "ai";
import { z } from "zod";
import { getModel } from "./lib/aiProvider";

// Shared validators
const billingCycleValidator = v.union(
  v.literal("monthly"),
  v.literal("yearly"),
  v.literal("weekly"),
  v.literal("daily")
);

const toolResultValidator = v.object({
  success: v.boolean(),
  message: v.string(),
  subscriptionId: v.optional(v.id("subscriptions")),
});

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

// Type for AI settings returned from internal query
type AISettings = {
  provider: "openai" | "xai" | "mistral" | "ollama" | "webllm";
  apiKey: string;
  modelId?: string;
  ollamaBaseUrl?: string;
} | null;

// Type for subscription context
type SubscriptionContext = Array<{
  _id: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: string;
  isActive: boolean;
}>;

// Type for payment method context
type PaymentMethodContext = Array<{
  _id: string;
  name: string;
  isDefault: boolean;
}>;

/**
 * Generate an AI response for a user message.
 * This is a public action that returns the response directly (no server-side storage).
 * Chat messages are stored client-side in Dexie.
 */
export const generateResponse = action({
  args: {
    userMessage: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const userId = await getLoggedInUser(ctx);

    // Get user's AI settings (with decrypted API key)
    const aiSettings: AISettings = await ctx.runQuery(internal.aiSettings.getDecrypted, {
      userId,
    });

    if (!aiSettings) {
      return "Please configure your AI provider settings first. Go to Settings to add your API key.";
    }

    // Get user's subscriptions and payment methods for context
    const subscriptions: SubscriptionContext = await ctx.runQuery(internal.subscriptions.listInternal, {
      userId,
    });
    const paymentMethods: PaymentMethodContext = await ctx.runQuery(internal.paymentMethods.listInternal, {
      userId,
    });

    const systemPrompt: string = `You are a helpful assistant for managing subscriptions. You can help users:
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
If they mention a service name, try to provide helpful information about typical pricing.`;

    try {
      // Get the AI model based on user's provider settings
      const model = getModel(aiSettings.provider, {
        apiKey: aiSettings.apiKey,
        baseURL: aiSettings.ollamaBaseUrl,
        modelId: aiSettings.modelId,
      });

      const result: { text: string } = await generateText({
        model,
        system: systemPrompt,
        prompt: args.userMessage,
        tools: {
          addSubscription: tool({
            description: "Add a new subscription for the user",
            parameters: z.object({
              name: z.string().describe("Service name (e.g., Netflix, Spotify)"),
              cost: z.number().describe("Cost per billing cycle"),
              currency: z.string().default("USD").describe("Currency code (e.g., USD, EUR)"),
              billingCycle: z.enum(["monthly", "yearly", "weekly", "daily"]).describe("Billing frequency"),
              paymentMethodId: z.string().optional().describe("Payment method ID if available"),
              category: z.string().optional().describe("Category (e.g., Entertainment, Software, Cloud)"),
              website: z.string().optional().describe("Service website URL"),
              description: z.string().optional().describe("Additional description"),
              notes: z.string().optional().describe("Any additional notes"),
            }),
            // @ts-expect-error - Tool execute function types are inferred from parameters schema
            execute: async (params) => {
              // Calculate next billing date based on billing cycle
              const now = Date.now();
              let nextBillingDate = now;
              const oneDay = 24 * 60 * 60 * 1000;

              switch (params.billingCycle) {
                case "daily":
                  nextBillingDate = now + oneDay;
                  break;
                case "weekly":
                  nextBillingDate = now + 7 * oneDay;
                  break;
                case "monthly":
                  nextBillingDate = now + 30 * oneDay;
                  break;
                case "yearly":
                  nextBillingDate = now + 365 * oneDay;
                  break;
              }

              // Get default payment method if not specified
              let paymentMethodId = params.paymentMethodId;
              if (!paymentMethodId && paymentMethods.length > 0) {
                const defaultMethod = paymentMethods.find((pm: any) => pm.isDefault);
                paymentMethodId = defaultMethod?._id || paymentMethods[0]._id;
              }

              if (!paymentMethodId) {
                return {
                  success: false,
                  message: "No payment method available. Please add a payment method first.",
                };
              }

              try {
                const subscriptionId = await ctx.runMutation(internal.subscriptions.createInternal, {
                  userId,
                  name: params.name,
                  cost: params.cost,
                  currency: params.currency || "USD",
                  billingCycle: params.billingCycle,
                  nextBillingDate,
                  paymentMethodId: paymentMethodId as any,
                  category: params.category || "Other",
                  website: params.website,
                  description: params.description,
                  notes: params.notes,
                });

                return {
                  success: true,
                  message: `Successfully added ${params.name} subscription ($${params.cost}/${params.billingCycle})`,
                  subscriptionId,
                };
              } catch (error: any) {
                return {
                  success: false,
                  message: `Failed to add subscription: ${error.message}`,
                };
              }
            },
          }),
          updateSubscription: tool({
            description: "Update an existing subscription",
            parameters: z.object({
              subscriptionId: z.string().describe("ID of the subscription to update"),
              name: z.string().optional().describe("New service name"),
              cost: z.number().optional().describe("New cost"),
              billingCycle: z.enum(["monthly", "yearly", "weekly", "daily"]).optional().describe("New billing cycle"),
              isActive: z.boolean().optional().describe("Whether subscription is active"),
            }),
            // @ts-expect-error - Tool execute function types are inferred from parameters schema
            execute: async (params) => {
              try {
                await ctx.runMutation(internal.subscriptions.updateInternal, {
                  id: params.subscriptionId as any,
                  userId,
                  name: params.name,
                  cost: params.cost,
                  billingCycle: params.billingCycle,
                  isActive: params.isActive,
                });
                return {
                  success: true,
                  message: "Subscription updated successfully",
                };
              } catch (error: any) {
                return {
                  success: false,
                  message: `Failed to update subscription: ${error.message}`,
                };
              }
            },
          }),
          cancelSubscription: tool({
            description: "Cancel (deactivate) a subscription",
            parameters: z.object({
              subscriptionId: z.string().describe("ID of the subscription to cancel"),
            }),
            // @ts-expect-error - Tool execute function types are inferred from parameters schema
            execute: async (params) => {
              try {
                await ctx.runMutation(internal.subscriptions.updateInternal, {
                  id: params.subscriptionId as any,
                  userId,
                  isActive: false,
                });
                return {
                  success: true,
                  message: "Subscription cancelled successfully",
                };
              } catch (error: any) {
                return {
                  success: false,
                  message: `Failed to cancel subscription: ${error.message}`,
                };
              }
            },
          }),
        },
      });

      return result.text;
    } catch (error: any) {
      return `I'm sorry, I encountered an error processing your request: ${error.message}. Please try again.`;
    }
  },
});

/**
 * Execute a tool call from local (WebLLM) inference
 * Returns the result of the tool execution
 */
export const executeLocalToolCall = mutation({
  args: {
    toolName: v.string(),
    toolArgs: v.object({
      // addSubscription args
      name: v.optional(v.string()),
      cost: v.optional(v.number()),
      currency: v.optional(v.string()),
      billingCycle: v.optional(billingCycleValidator),
      paymentMethodId: v.optional(v.string()),
      category: v.optional(v.string()),
      website: v.optional(v.string()),
      description: v.optional(v.string()),
      notes: v.optional(v.string()),
      billingDay: v.optional(v.number()),
      // updateSubscription / cancelSubscription args
      subscriptionId: v.optional(v.string()),
      subscriptionName: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
  },
  returns: toolResultValidator,
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const { toolName, toolArgs } = args;

    // Get user's payment methods for default selection
    const paymentMethods = await ctx.db
      .query("paymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get user's subscriptions for name-based lookups
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    switch (toolName) {
      case "addSubscription": {
        if (!toolArgs.name || !toolArgs.cost || !toolArgs.billingCycle) {
          return {
            success: false,
            message: "Missing required fields: name, cost, or billingCycle",
          };
        }

        // Calculate next billing date
        const now = new Date();
        let nextBillingDate: number;
        const oneDay = 24 * 60 * 60 * 1000;

        if (toolArgs.billingDay && toolArgs.billingDay >= 1 && toolArgs.billingDay <= 31) {
          // Set to specific day of month
          const targetDay = toolArgs.billingDay;
          const currentDay = now.getDate();

          if (currentDay < targetDay) {
            // This month
            now.setDate(targetDay);
          } else {
            // Next month
            now.setMonth(now.getMonth() + 1);
            now.setDate(targetDay);
          }
          nextBillingDate = now.getTime();
        } else {
          // Default: calculate based on billing cycle from today
          switch (toolArgs.billingCycle) {
            case "daily":
              nextBillingDate = Date.now() + oneDay;
              break;
            case "weekly":
              nextBillingDate = Date.now() + 7 * oneDay;
              break;
            case "monthly":
              nextBillingDate = Date.now() + 30 * oneDay;
              break;
            case "yearly":
              nextBillingDate = Date.now() + 365 * oneDay;
              break;
            default:
              nextBillingDate = Date.now() + 30 * oneDay;
          }
        }

        // Get payment method
        let paymentMethodId = toolArgs.paymentMethodId;
        if (!paymentMethodId && paymentMethods.length > 0) {
          const defaultMethod = paymentMethods.find((pm) => pm.isDefault);
          paymentMethodId = defaultMethod?._id ?? paymentMethods[0]._id;
        }

        if (!paymentMethodId) {
          return {
            success: false,
            message: "No payment method available. Please add a payment method first.",
          };
        }

        try {
          const subscriptionId = await ctx.db.insert("subscriptions", {
            userId,
            name: toolArgs.name,
            cost: toolArgs.cost,
            currency: toolArgs.currency || "USD",
            billingCycle: toolArgs.billingCycle,
            nextBillingDate,
            paymentMethodId: paymentMethodId as any,
            category: toolArgs.category || "Other",
            website: toolArgs.website,
            description: toolArgs.description,
            notes: toolArgs.notes,
            isActive: true,
          });

          return {
            success: true,
            message: `Successfully added ${toolArgs.name} subscription ($${toolArgs.cost}/${toolArgs.billingCycle})`,
            subscriptionId,
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Failed to add subscription: ${error.message}`,
          };
        }
      }

      case "updateSubscription": {
        // Find subscription by ID or name
        const subscription = toolArgs.subscriptionId
          ? subscriptions.find((s) => s._id === toolArgs.subscriptionId)
          : toolArgs.subscriptionName
            ? subscriptions.find((s) => s.name.toLowerCase() === toolArgs.subscriptionName!.toLowerCase())
            : null;

        if (!subscription) {
          return {
            success: false,
            message: toolArgs.subscriptionName
              ? `Subscription "${toolArgs.subscriptionName}" not found`
              : "Subscription not found",
          };
        }

        try {
          const updates: Record<string, any> = {};
          if (toolArgs.name !== undefined) updates.name = toolArgs.name;
          if (toolArgs.cost !== undefined) updates.cost = toolArgs.cost;
          if (toolArgs.billingCycle !== undefined) updates.billingCycle = toolArgs.billingCycle;
          if (toolArgs.isActive !== undefined) updates.isActive = toolArgs.isActive;

          await ctx.db.patch(subscription._id, updates);

          return {
            success: true,
            message: `Successfully updated ${subscription.name}${toolArgs.cost ? ` to $${toolArgs.cost}` : ""}`,
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Failed to update subscription: ${error.message}`,
          };
        }
      }

      case "cancelSubscription": {
        // Find subscription by ID or name
        const subscription = toolArgs.subscriptionId
          ? subscriptions.find((s) => s._id === toolArgs.subscriptionId)
          : toolArgs.subscriptionName
            ? subscriptions.find((s) => s.name.toLowerCase() === toolArgs.subscriptionName!.toLowerCase())
            : null;

        if (!subscription) {
          return {
            success: false,
            message: toolArgs.subscriptionName
              ? `Subscription "${toolArgs.subscriptionName}" not found`
              : "Subscription not found",
          };
        }

        try {
          await ctx.db.patch(subscription._id, { isActive: false });

          return {
            success: true,
            message: `Successfully cancelled ${subscription.name}`,
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Failed to cancel subscription: ${error.message}`,
          };
        }
      }

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
        };
    }
  },
});

/**
 * Get context data for local inference (subscriptions and payment methods)
 */
export const getLocalInferenceContext = query({
  args: {},
  returns: v.object({
    subscriptions: v.array(
      v.object({
        _id: v.id("subscriptions"),
        name: v.string(),
        cost: v.number(),
        currency: v.string(),
        billingCycle: billingCycleValidator,
        isActive: v.boolean(),
        category: v.string(),
      })
    ),
    paymentMethods: v.array(
      v.object({
        _id: v.id("paymentMethods"),
        name: v.string(),
        lastFourDigits: v.optional(v.string()),
        isDefault: v.boolean(),
      })
    ),
  }),
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const paymentMethods = await ctx.db
      .query("paymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      subscriptions: subscriptions.map((s) => ({
        _id: s._id,
        name: s.name,
        cost: s.cost,
        currency: s.currency,
        billingCycle: s.billingCycle,
        isActive: s.isActive,
        category: s.category,
      })),
      paymentMethods: paymentMethods.map((pm) => ({
        _id: pm._id,
        name: pm.name,
        lastFourDigits: pm.lastFourDigits,
        isDefault: pm.isDefault,
      })),
    };
  },
});
