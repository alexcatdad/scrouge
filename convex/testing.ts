import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Guard: Only allow in test environment
 */
function requireTestEnvironment() {
	if (process.env.CONVEX_IS_TEST !== "true") {
		throw new Error("Test functions only available when CONVEX_IS_TEST=true");
	}
}

/**
 * Create a test user directly in the database
 * Returns userId for use with signIn
 */
export const createTestUser = internalMutation({
	args: {
		email: v.string(),
		name: v.optional(v.string()),
	},
	returns: v.id("users"),
	handler: async (ctx, args) => {
		requireTestEnvironment();

		// Check if user already exists
		const existing = await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("email"), args.email))
			.first();

		if (existing) {
			return existing._id;
		}

		// Create user
		const userId = await ctx.db.insert("users", {
			email: args.email,
			name: args.name,
			emailVerificationTime: Date.now(),
		});

		return userId;
	},
});

/**
 * Delete a test user and all related data
 */
export const deleteTestUser = internalMutation({
	args: {
		email: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		requireTestEnvironment();

		const user = await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("email"), args.email))
			.first();

		if (!user) return null;

		// Delete subscriptions
		const subs = await ctx.db
			.query("subscriptions")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		for (const sub of subs) {
			await ctx.db.delete(sub._id);
		}

		// Delete payment methods
		const pms = await ctx.db
			.query("paymentMethods")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		for (const pm of pms) {
			await ctx.db.delete(pm._id);
		}

		// Delete user
		await ctx.db.delete(user._id);

		return null;
	},
});
