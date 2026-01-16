import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    serviceName: v.string(),
    website: v.optional(v.string()),
  },
  returns: v.id("serviceRequests"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("serviceRequests", {
      serviceName: args.serviceName,
      website: args.website,
      requestedBy: userId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// List pending requests for admin
export const listPending = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("serviceRequests"),
      serviceName: v.string(),
      website: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("serviceRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});
