import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/admin";

// Internal mutation to seed first admin (run via Convex dashboard)
export const seedFirstAdmin = internalMutation({
  args: { email: v.string() },
  returns: v.union(v.id("userRoles"), v.null()),
  handler: async (ctx, args) => {
    // Check if any admin exists
    const existingAdmin = await ctx.db
      .query("userRoles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (existingAdmin) {
      console.log("Admin already exists, skipping seed");
      return null;
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    // Create admin role
    const roleId = await ctx.db.insert("userRoles", {
      userId: user._id,
      role: "admin",
      grantedAt: Date.now(),
    });

    console.log(`Made ${args.email} an admin`);
    return roleId;
  },
});

// Grant admin role (admin only)
export const grantAdmin = mutation({
  args: { userId: v.id("users") },
  returns: v.id("userRoles"),
  handler: async (ctx, args) => {
    const adminId = (await requireAdmin(ctx)) as Id<"users">;

    // Check if user already has a role
    const existingRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingRole) {
      if (existingRole.role === "admin") {
        throw new Error("User is already an admin");
      }
      await ctx.db.delete(existingRole._id);
    }

    return await ctx.db.insert("userRoles", {
      userId: args.userId,
      role: "admin",
      grantedAt: Date.now(),
      grantedBy: adminId,
    });
  },
});

// Revoke admin role (admin only)
export const revokeAdmin = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);

    // Can't revoke own admin
    if (args.userId === adminId) {
      throw new Error("Cannot revoke your own admin access");
    }

    const role = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!role || role.role !== "admin") {
      throw new Error("User is not an admin");
    }

    await ctx.db.delete(role._id);
    return null;
  },
});

// Check if current user is admin
export const amIAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const role = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return role?.role === "admin";
  },
});
