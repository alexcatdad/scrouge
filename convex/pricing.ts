import { action, query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const fetchServicePricing = action({
  args: { 
    serviceName: v.string(),
    website: v.string(),
  },
  handler: async (ctx, args) => {
    // This is a placeholder for actual web scraping or API integration
    // In a real implementation, you would use web scraping libraries or service APIs
    
    const mockPricingData = {
      serviceName: args.serviceName,
      website: args.website,
      plans: [
        {
          name: "Basic",
          price: 9.99,
          currency: "USD",
          billingCycle: "monthly",
          features: ["Basic features", "Email support"]
        },
        {
          name: "Pro",
          price: 19.99,
          currency: "USD",
          billingCycle: "monthly",
          features: ["All basic features", "Priority support", "Advanced analytics"]
        },
        {
          name: "Enterprise",
          price: 49.99,
          currency: "USD",
          billingCycle: "monthly",
          features: ["All pro features", "Custom integrations", "Dedicated support"]
        }
      ],
      lastUpdated: Date.now(),
    };
    
    // Store the pricing data
    await ctx.runMutation(internal.pricing.storePricing, mockPricingData);
    
    return mockPricingData;
  },
});

export const storePricing = internalMutation({
  args: {
    serviceName: v.string(),
    website: v.string(),
    plans: v.array(v.object({
      name: v.string(),
      price: v.number(),
      currency: v.string(),
      billingCycle: v.string(),
      features: v.array(v.string()),
    })),
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if pricing already exists
    const existing = await ctx.db
      .query("servicePricing")
      .withIndex("by_service", (q) => q.eq("serviceName", args.serviceName))
      .first();
    
    if (existing) {
      return await ctx.db.patch(existing._id, args);
    } else {
      return await ctx.db.insert("servicePricing", args);
    }
  },
});

export const getPricing = query({
  args: { serviceName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("servicePricing")
      .withIndex("by_service", (q) => q.eq("serviceName", args.serviceName))
      .first();
  },
});

import { internal } from "./_generated/api";
