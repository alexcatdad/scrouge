// Auth client using @convex-dev/auth
// Note: @convex-dev/auth is primarily designed for React, but we can use
// convex-svelte for basic Convex integration and handle auth via HTTP routes

import { PUBLIC_CONVEX_URL } from "$env/static/public";

export function getConvexUrl() {
  return PUBLIC_CONVEX_URL;
}

// The Convex site URL for auth redirects
export function getConvexSiteUrl() {
  return PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site");
}
