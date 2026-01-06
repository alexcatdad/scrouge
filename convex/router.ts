import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// MCP endpoint for AI agents to add subscriptions
http.route({
  path: "/mcp/subscriptions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { userId, subscription } = body;
      
      if (!userId || !subscription) {
        return new Response(
          JSON.stringify({ error: "Missing userId or subscription data" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Validate required subscription fields
      const requiredFields = ["name", "cost", "currency", "billingCycle", "paymentMethodId", "category"];
      for (const field of requiredFields) {
        if (!subscription[field]) {
          return new Response(
            JSON.stringify({ error: `Missing required field: ${field}` }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      
      // Calculate next billing date if not provided
      if (!subscription.nextBillingDate) {
        const now = new Date();
        switch (subscription.billingCycle) {
          case "monthly":
            now.setMonth(now.getMonth() + 1);
            break;
          case "yearly":
            now.setFullYear(now.getFullYear() + 1);
            break;
          case "weekly":
            now.setDate(now.getDate() + 7);
            break;
          case "daily":
            now.setDate(now.getDate() + 1);
            break;
        }
        subscription.nextBillingDate = now.getTime();
      }
      
      const subscriptionId = await ctx.runMutation(api.subscriptions.create, subscription);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          subscriptionId,
          message: "Subscription added successfully" 
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } catch (error) {
      console.error("MCP subscription creation error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// MCP endpoint to get user subscriptions
http.route({
  path: "/mcp/subscriptions",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing userId parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const subscriptions = await ctx.runQuery(api.subscriptions.list, {});
      
      return new Response(
        JSON.stringify({ subscriptions }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } catch (error) {
      console.error("MCP subscription fetch error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// MCP endpoint for payment methods
http.route({
  path: "/mcp/payment-methods",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing userId parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const paymentMethods = await ctx.runQuery(api.paymentMethods.list, {});
      
      return new Response(
        JSON.stringify({ paymentMethods }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } catch (error) {
      console.error("MCP payment methods fetch error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
