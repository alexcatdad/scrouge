import { query, mutation, action, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

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
    // Get user's subscriptions and payment methods for context
    const subscriptions = await ctx.runQuery(api.subscriptions.list, {});
    const paymentMethods = await ctx.runQuery(api.paymentMethods.list, {});
    
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
If the user wants to add a subscription, ask for all necessary details: name, cost, billing cycle, payment method, etc.
If they mention a service name, try to provide helpful information about typical pricing.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.userMessage }
        ],
        temperature: 0.7,
      });

      const assistantMessage = response.choices[0].message.content || "I'm sorry, I couldn't process that request.";

      // Store assistant response
      await ctx.runMutation(internal.chat.storeMessage, {
        userId: args.userId,
        content: assistantMessage,
        role: "assistant",
        subscriptionId: args.subscriptionId,
      });

    } catch (error) {
      console.error("Error generating response:", error);
      await ctx.runMutation(internal.chat.storeMessage, {
        userId: args.userId,
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
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
