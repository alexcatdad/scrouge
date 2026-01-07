import { query, mutation, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { generateText, tool } from "ai";
import { z } from "zod";
import { getModel } from "./lib/aiProvider";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

export const getMessages = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const limit = args.limit || 50;
    
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const sendMessage = mutation({
  args: { 
    content: v.string(),
    subscriptionId: v.optional(v.id("subscriptions")),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    // Store user message
    const userMessageId = await ctx.db.insert("chatMessages", {
      userId,
      content: args.content,
      role: "user",
      subscriptionId: args.subscriptionId,
      timestamp: Date.now(),
    });
    
    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.chat.generateResponse, {
      userId,
      userMessage: args.content,
      subscriptionId: args.subscriptionId,
    });
    
    return userMessageId;
  },
});

export const generateResponse = internalAction({
  args: {
    userId: v.id("users"),
    userMessage: v.string(),
    subscriptionId: v.optional(v.id("subscriptions")),
  },
  handler: async (ctx, args) => {
    // Get user's AI settings (with decrypted API key)
    // Use internal query - type assertion needed until API regenerates
    const aiSettings = await ctx.runQuery(
      (internal as any).aiSettings?.getDecrypted || 
      // Fallback function that will be replaced once API regenerates
      (async (ctx: any, args: any) => {
        const settings = await ctx.db
          .query("userAISettings")
          .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
          .first();
        if (!settings) return null;
        const { decrypt } = await import("./lib/encryption");
        return { ...settings, apiKey: await decrypt(settings.encryptedApiKey) };
      }) as any,
      { userId: args.userId }
    );
    
    if (!aiSettings) {
      await ctx.runMutation(internal.chat.storeMessage, {
        userId: args.userId,
        content: "Please configure your AI provider settings first. Go to Settings to add your API key.",
        role: "assistant",
        subscriptionId: args.subscriptionId,
      });
      return;
    }

    if (!aiSettings) {
      await ctx.runMutation(internal.chat.storeMessage, {
        userId: args.userId,
        content: "Please configure your AI provider settings first. Go to Settings to add your API key.",
        role: "assistant",
        subscriptionId: args.subscriptionId,
      });
      return;
    }

    // Get user's subscriptions and payment methods for context
    const subscriptions = await ctx.runQuery(internal.subscriptions.listInternal, {
      userId: args.userId,
    });
    const paymentMethods = await ctx.runQuery(internal.paymentMethods.listInternal, {
      userId: args.userId,
    });

    const systemPrompt = `You are a helpful assistant for managing subscriptions. You can help users:
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

      const result = await generateText({
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
                  nextBillingDate = now + (7 * oneDay);
                  break;
                case "monthly":
                  nextBillingDate = now + (30 * oneDay);
                  break;
                case "yearly":
                  nextBillingDate = now + (365 * oneDay);
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
                  userId: args.userId,
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
                  userId: args.userId,
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
                  userId: args.userId,
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

      // Store assistant response
      await ctx.runMutation(internal.chat.storeMessage, {
        userId: args.userId,
        content: result.text,
        role: "assistant",
        subscriptionId: args.subscriptionId,
      });

    } catch (error: any) {
      console.error("Error generating response:", error);
      await ctx.runMutation(internal.chat.storeMessage, {
        userId: args.userId,
        content: `I'm sorry, I encountered an error processing your request: ${error.message}. Please try again.`,
        role: "assistant",
        subscriptionId: args.subscriptionId,
      });
    }
  },
});

export const storeMessage = internalMutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    subscriptionId: v.optional(v.id("subscriptions")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
