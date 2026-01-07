import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import GitHub from "@auth/core/providers/github";
import Authentik from "@auth/core/providers/authentik";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub,
    Authentik({
      clientId: process.env.AUTH_AUTHENTIK_ID,
      clientSecret: process.env.AUTH_AUTHENTIK_SECRET,
      issuer: process.env.AUTH_AUTHENTIK_ISSUER,
    }),
    Password,
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
