# Phase 1: SvelteKit Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a new SvelteKit frontend with Better Auth replacing @convex-dev/auth, achieving feature parity for authentication (Password, GitHub, Authentik).

**Architecture:** Clean rewrite approach - new SvelteKit project in a separate directory, migrating to Better Auth for Svelte compatibility. The existing Convex backend tables (subscriptions, paymentMethods, etc.) remain unchanged; only auth is replaced.

**Tech Stack:** SvelteKit 2, Svelte 5, convex-svelte, @convex-dev/better-auth, better-auth, Tailwind CSS v4, Bun

---

## Task 1: Create SvelteKit Project

**Files:**
- Create: `scrouge-svelte/` (new project directory)

**Step 1: Create new SvelteKit project**

```bash
cd /Users/alex/REPOS/alexcatdad
bunx sv create scrouge-svelte
```

Select these options when prompted:
- Template: SvelteKit minimal
- Type checking: TypeScript
- Additional options: None (we'll add Tailwind manually)

**Step 2: Verify project created**

```bash
ls scrouge-svelte/
```

Expected: `package.json`, `src/`, `svelte.config.js`, `vite.config.ts`, etc.

**Step 3: Install dependencies**

```bash
cd scrouge-svelte && bun install
```

**Step 4: Verify dev server runs**

```bash
bun run dev
```

Expected: Server starts at http://localhost:5173

**Step 5: Stop dev server and commit**

```bash
git init
git add .
git commit -m "chore: initialize SvelteKit project"
```

---

## Task 2: Configure Convex for SvelteKit

**Files:**
- Create: `scrouge-svelte/convex.json`
- Create: `scrouge-svelte/src/convex/` (directory)
- Modify: `scrouge-svelte/svelte.config.js`

**Step 1: Install Convex packages**

```bash
bun add convex convex-svelte
```

**Step 2: Create convex.json with custom functions directory**

SvelteKit requires Convex functions under `src/`:

```json
{
  "functions": "src/convex/"
}
```

**Step 3: Add $convex alias to svelte.config.js**

```javascript
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$convex: './src/convex'
		}
	}
};

export default config;
```

**Step 4: Create src/convex directory**

```bash
mkdir -p src/convex
```

**Step 5: Run convex dev to link deployment**

```bash
bunx convex dev
```

When prompted, select the existing `scrouge` project to link to the same backend.

**Step 6: Verify convex files generated**

```bash
ls src/convex/
```

Expected: `_generated/` directory with `api.d.ts`, `api.js`, etc.

**Step 7: Commit**

```bash
git add .
git commit -m "feat: configure Convex for SvelteKit"
```

---

## Task 3: Install Better Auth Dependencies

**Files:**
- Modify: `scrouge-svelte/package.json`

**Step 1: Install Better Auth packages**

```bash
bun add @convex-dev/better-auth better-auth@1.4.9
bun add @mmailaender/convex-better-auth-svelte
```

Note: better-auth@1.4.9 is pinned for compatibility with @convex-dev/better-auth.

**Step 2: Verify packages installed**

```bash
bun pm ls | grep better-auth
```

Expected: Shows better-auth and @convex-dev/better-auth versions.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add Better Auth dependencies"
```

---

## Task 4: Configure Better Auth Convex Component

**Files:**
- Create: `scrouge-svelte/src/convex/convex.config.ts`
- Create: `scrouge-svelte/src/convex/auth.config.ts`

**Step 1: Create convex.config.ts to register Better Auth component**

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);
export default app;
```

**Step 2: Create auth.config.ts**

```typescript
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

**Step 3: Set required environment variables**

```bash
bunx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)
bunx convex env set SITE_URL http://localhost:5173
```

**Step 4: Verify convex dev syncs without errors**

```bash
bunx convex dev
```

Expected: No errors, component registered.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: register Better Auth Convex component"
```

---

## Task 5: Create Better Auth Server Instance

**Files:**
- Create: `scrouge-svelte/src/convex/auth.ts`
- Create: `scrouge-svelte/src/convex/http.ts`

**Step 1: Create auth.ts with Better Auth configuration**

```typescript
import { BetterAuth } from "@convex-dev/better-auth";
import { betterAuth } from "better-auth";
import { convexAdapter } from "@convex-dev/better-auth/adapter";
import { genericOAuth } from "better-auth/plugins";
import { components } from "./_generated/api";

const auth = new BetterAuth(components.betterAuth, {
  trustedOrigins: [process.env.SITE_URL!],
  auth: betterAuth({
    database: convexAdapter,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: process.env.AUTH_GITHUB_ID!,
        clientSecret: process.env.AUTH_GITHUB_SECRET!,
      },
    },
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "authentik",
            clientId: process.env.AUTH_AUTHENTIK_ID!,
            clientSecret: process.env.AUTH_AUTHENTIK_SECRET!,
            discoveryUrl: `${process.env.AUTH_AUTHENTIK_ISSUER}/.well-known/openid-configuration`,
          },
        ],
      }),
    ],
  }),
});

export default auth;
```

**Step 2: Create http.ts to mount auth routes**

```typescript
import { httpRouter } from "convex/server";
import auth from "./auth";

const http = httpRouter();

auth.registerRoutes(http, {
  allowedOrigins: [process.env.SITE_URL!],
});

export default http;
```

**Step 3: Verify convex dev syncs**

```bash
bunx convex dev
```

Expected: HTTP routes registered, no errors.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: create Better Auth server with GitHub and Authentik providers"
```

---

## Task 6: Create Auth Client for SvelteKit

**Files:**
- Create: `scrouge-svelte/src/lib/auth-client.ts`
- Create: `scrouge-svelte/src/lib/auth.ts`

**Step 1: Create auth-client.ts**

```typescript
import { createAuthClient } from "better-auth/svelte";
import { convexAuthClient } from "@convex-dev/better-auth/client";
import { genericOAuthClient } from "better-auth/plugins";

export const authClient = createAuthClient({
  plugins: [convexAuthClient(), genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;
```

**Step 2: Create auth.ts for server-side auth utilities**

```typescript
import { PUBLIC_CONVEX_URL } from "$env/static/public";

export function getConvexUrl() {
  return PUBLIC_CONVEX_URL;
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: create Better Auth client for SvelteKit"
```

---

## Task 7: Set Up SvelteKit Server Hooks

**Files:**
- Create: `scrouge-svelte/src/hooks.server.ts`
- Modify: `scrouge-svelte/src/app.d.ts`

**Step 1: Create hooks.server.ts**

```typescript
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  // Extract auth token from cookies for Convex
  const token = event.cookies.get("convex_auth_token");

  if (token) {
    event.locals.token = token;
  }

  return resolve(event);
};
```

**Step 2: Update app.d.ts with type definitions**

```typescript
/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Locals {
      token?: string;
    }
  }
}

export {};
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add SvelteKit server hooks for auth"
```

---

## Task 8: Create Root Layout with Convex Provider

**Files:**
- Modify: `scrouge-svelte/src/routes/+layout.svelte`
- Create: `scrouge-svelte/src/routes/+layout.ts`

**Step 1: Create +layout.ts for environment variables**

```typescript
import { PUBLIC_CONVEX_URL } from "$env/static/public";

export const load = () => {
  return {
    convexUrl: PUBLIC_CONVEX_URL,
  };
};
```

**Step 2: Update +layout.svelte with Convex setup**

```svelte
<script lang="ts">
  import { setupConvex } from "convex-svelte";
  import { createSvelteAuthClient } from "@mmailaender/convex-better-auth-svelte";

  const { data, children } = $props();

  setupConvex(data.convexUrl);
  createSvelteAuthClient();
</script>

{@render children()}
```

**Step 3: Create .env file with Convex URL**

```bash
echo "PUBLIC_CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud" > .env
```

Replace YOUR_DEPLOYMENT with actual deployment URL from existing project.

**Step 4: Verify app loads**

```bash
bun run dev
```

Expected: App loads at http://localhost:5173 without errors.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: create root layout with Convex and auth providers"
```

---

## Task 9: Create API Auth Route Handler

**Files:**
- Create: `scrouge-svelte/src/routes/api/auth/[...all]/+server.ts`

**Step 1: Create the catch-all auth route**

```typescript
import type { RequestHandler } from "./$types";
import { PUBLIC_CONVEX_URL } from "$env/static/public";

const CONVEX_SITE_URL = PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site");

export const GET: RequestHandler = async ({ request, params }) => {
  const path = params.all;
  const url = new URL(request.url);
  const targetUrl = `${CONVEX_SITE_URL}/api/auth/${path}${url.search}`;

  return fetch(targetUrl, {
    method: "GET",
    headers: request.headers,
  });
};

export const POST: RequestHandler = async ({ request, params }) => {
  const path = params.all;
  const targetUrl = `${CONVEX_SITE_URL}/api/auth/${path}`;

  return fetch(targetUrl, {
    method: "POST",
    headers: request.headers,
    body: request.body,
    duplex: "half",
  } as RequestInit);
};
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add API auth route handler"
```

---

## Task 10: Install and Configure Tailwind CSS

**Files:**
- Modify: `scrouge-svelte/package.json`
- Create: `scrouge-svelte/src/app.css`
- Modify: `scrouge-svelte/vite.config.ts`

**Step 1: Install Tailwind v4**

```bash
bun add -D tailwindcss @tailwindcss/vite
```

**Step 2: Update vite.config.ts**

```typescript
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

**Step 3: Create src/app.css**

```css
@import "tailwindcss";

/* Base theme variables - copied from existing project */
@theme {
  --color-primary: #d4a853;
  --color-primary-hover: #e5bc6a;
  --color-secondary: #a1a1aa;
  --color-accent-teal: #5eead4;
  --color-accent-coral: #f97316;
  --color-surface: rgba(24, 24, 27, 0.8);
  --color-surface-elevated: rgba(39, 39, 42, 0.9);
  --font-display: "Inter", system-ui, sans-serif;
}

/* Dark theme base */
html {
  @apply bg-[#0a0a0b] text-white antialiased;
}
```

**Step 4: Import CSS in layout**

Update `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import "../app.css";
  import { setupConvex } from "convex-svelte";
  import { createSvelteAuthClient } from "@mmailaender/convex-better-auth-svelte";

  const { data, children } = $props();

  setupConvex(data.convexUrl);
  createSvelteAuthClient();
</script>

{@render children()}
```

**Step 5: Verify Tailwind works**

Update `src/routes/+page.svelte`:

```svelte
<h1 class="text-4xl font-bold text-primary">Scrouge</h1>
```

```bash
bun run dev
```

Expected: Gold-colored "Scrouge" heading visible.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add Tailwind CSS v4"
```

---

## Task 11: Create Sign-In Page

**Files:**
- Create: `scrouge-svelte/src/routes/(auth)/sign-in/+page.svelte`
- Create: `scrouge-svelte/src/routes/(auth)/+layout.svelte`

**Step 1: Create auth layout**

```svelte
<!-- src/routes/(auth)/+layout.svelte -->
<script lang="ts">
  const { children } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
  <div class="w-full max-w-md p-8">
    {@render children()}
  </div>
</div>
```

**Step 2: Create sign-in page**

```svelte
<!-- src/routes/(auth)/sign-in/+page.svelte -->
<script lang="ts">
  import { signIn } from "$lib/auth-client";
  import { goto } from "$app/navigation";

  let email = $state("");
  let password = $state("");
  let loading = $state(false);
  let error = $state("");

  async function handleEmailSignIn(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = "";

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        error = result.error.message || "Sign in failed";
      } else {
        goto("/dashboard");
      }
    } catch (err) {
      error = "An unexpected error occurred";
    } finally {
      loading = false;
    }
  }

  async function handleGitHubSignIn() {
    await signIn.social({ provider: "github" });
  }

  async function handleAuthentikSignIn() {
    await signIn.oauth2({ providerId: "authentik" });
  }
</script>

<div class="space-y-6">
  <div class="text-center">
    <h1 class="text-3xl font-bold text-white mb-2">Welcome back</h1>
    <p class="text-secondary">Sign in to your account</p>
  </div>

  <form onsubmit={handleEmailSignIn} class="space-y-4">
    {#if error}
      <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
        {error}
      </div>
    {/if}

    <input
      type="email"
      bind:value={email}
      placeholder="Email address"
      required
      class="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-secondary focus:outline-none focus:border-primary"
    />

    <input
      type="password"
      bind:value={password}
      placeholder="Password"
      required
      class="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-secondary focus:outline-none focus:border-primary"
    />

    <button
      type="submit"
      disabled={loading}
      class="w-full py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
    >
      {loading ? "Signing in..." : "Sign in"}
    </button>
  </form>

  <div class="flex items-center gap-4">
    <div class="flex-1 h-px bg-white/10"></div>
    <span class="text-secondary text-sm">or continue with</span>
    <div class="flex-1 h-px bg-white/10"></div>
  </div>

  <div class="space-y-3">
    <button
      onclick={handleGitHubSignIn}
      class="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/>
      </svg>
      GitHub
    </button>

    <button
      onclick={handleAuthentikSignIn}
      class="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
      </svg>
      Authentik
    </button>
  </div>

  <p class="text-center text-secondary text-sm">
    Don't have an account?
    <a href="/sign-up" class="text-primary hover:text-primary-hover">Sign up</a>
  </p>
</div>
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: create sign-in page with email, GitHub, and Authentik"
```

---

## Task 12: Create Sign-Up Page

**Files:**
- Create: `scrouge-svelte/src/routes/(auth)/sign-up/+page.svelte`

**Step 1: Create sign-up page**

```svelte
<!-- src/routes/(auth)/sign-up/+page.svelte -->
<script lang="ts">
  import { signIn } from "$lib/auth-client";
  import { goto } from "$app/navigation";

  let email = $state("");
  let password = $state("");
  let name = $state("");
  let loading = $state(false);
  let error = $state("");

  async function handleSignUp(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = "";

    try {
      const result = await signIn.email({
        email,
        password,
        name,
        callbackURL: "/dashboard"
      });
      if (result.error) {
        error = result.error.message || "Sign up failed";
      } else {
        goto("/dashboard");
      }
    } catch (err) {
      error = "An unexpected error occurred";
    } finally {
      loading = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="text-center">
    <h1 class="text-3xl font-bold text-white mb-2">Create account</h1>
    <p class="text-secondary">Start tracking your subscriptions</p>
  </div>

  <form onsubmit={handleSignUp} class="space-y-4">
    {#if error}
      <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
        {error}
      </div>
    {/if}

    <input
      type="text"
      bind:value={name}
      placeholder="Full name"
      class="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-secondary focus:outline-none focus:border-primary"
    />

    <input
      type="email"
      bind:value={email}
      placeholder="Email address"
      required
      class="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-secondary focus:outline-none focus:border-primary"
    />

    <input
      type="password"
      bind:value={password}
      placeholder="Password"
      required
      minlength="8"
      class="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white placeholder-secondary focus:outline-none focus:border-primary"
    />

    <button
      type="submit"
      disabled={loading}
      class="w-full py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
    >
      {loading ? "Creating account..." : "Create account"}
    </button>
  </form>

  <p class="text-center text-secondary text-sm">
    Already have an account?
    <a href="/sign-in" class="text-primary hover:text-primary-hover">Sign in</a>
  </p>
</div>
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create sign-up page"
```

---

## Task 13: Create Dashboard Layout with Auth Guard

**Files:**
- Create: `scrouge-svelte/src/routes/(app)/+layout.svelte`
- Create: `scrouge-svelte/src/routes/(app)/dashboard/+page.svelte`
- Create: `scrouge-svelte/src/lib/components/Header.svelte`

**Step 1: Create Header component**

```svelte
<!-- src/lib/components/Header.svelte -->
<script lang="ts">
  import { signOut, useSession } from "$lib/auth-client";
  import { goto } from "$app/navigation";

  const session = useSession();

  async function handleSignOut() {
    await signOut();
    goto("/sign-in");
  }
</script>

<header class="border-b border-white/10 bg-surface-elevated/50 backdrop-blur-sm">
  <div class="max-w-7xl mx-auto h-16 flex justify-between items-center px-6">
    <a href="/dashboard" class="flex items-center gap-2">
      <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <span class="font-semibold text-white">Scrouge</span>
    </a>

    <div class="flex items-center gap-4">
      {#if $session.data?.user}
        <span class="text-secondary text-sm">{$session.data.user.email}</span>
      {/if}
      <button
        onclick={handleSignOut}
        class="px-4 py-2 text-sm text-secondary hover:text-white transition-colors"
      >
        Sign out
      </button>
    </div>
  </div>
</header>
```

**Step 2: Create app layout with auth guard**

```svelte
<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
  import { useSession } from "$lib/auth-client";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Header from "$lib/components/Header.svelte";

  const { children } = $props();
  const session = useSession();

  onMount(() => {
    // Redirect to sign-in if not authenticated
    const unsubscribe = session.subscribe((s) => {
      if (!s.isPending && !s.data?.user) {
        goto("/sign-in");
      }
    });
    return unsubscribe;
  });
</script>

{#if $session.isPending}
  <div class="min-h-screen flex items-center justify-center">
    <div class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
  </div>
{:else if $session.data?.user}
  <div class="min-h-screen flex flex-col">
    <Header />
    <main class="flex-1">
      {@render children()}
    </main>
  </div>
{/if}
```

**Step 3: Create dashboard page**

```svelte
<!-- src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
  import { useSession } from "$lib/auth-client";

  const session = useSession();
</script>

<div class="max-w-7xl mx-auto px-6 py-8">
  <div class="mb-10">
    <p class="text-secondary text-sm font-medium tracking-wide uppercase mb-2">
      Welcome back
    </p>
    <h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-3">
      <span class="text-primary">
        {$session.data?.user?.email?.split("@")[0] || "friend"}
      </span>
    </h1>
    <p class="text-secondary text-lg">
      Track your subscriptions, manage spending, stay in control.
    </p>
  </div>

  <div class="p-8 bg-surface border border-white/10 rounded-xl text-center">
    <p class="text-secondary">Dashboard coming in Phase 2</p>
  </div>
</div>
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: create dashboard layout with auth guard and header"
```

---

## Task 14: Create Landing Page

**Files:**
- Modify: `scrouge-svelte/src/routes/+page.svelte`

**Step 1: Update landing page**

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { useSession } from "$lib/auth-client";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  const session = useSession();

  onMount(() => {
    const unsubscribe = session.subscribe((s) => {
      if (!s.isPending && s.data?.user) {
        goto("/dashboard");
      }
    });
    return unsubscribe;
  });
</script>

<div class="min-h-screen flex flex-col items-center justify-center px-6 py-16">
  <div class="text-center mb-12 max-w-2xl">
    <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-8">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>
      Subscription Tracker
    </div>

    <h1 class="text-5xl md:text-6xl font-bold mb-6">
      <span class="text-white block">Master Your</span>
      <span class="text-primary">Subscriptions</span>
    </h1>

    <p class="text-secondary text-xl mb-8">
      Effortlessly track every subscription, monitor spending patterns, and reclaim control of your finances.
    </p>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a
        href="/sign-up"
        class="px-8 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primary-hover transition-colors"
      >
        Get Started
      </a>
      <a
        href="/sign-in"
        class="px-8 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
      >
        Sign In
      </a>
    </div>
  </div>
</div>
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create landing page with auth redirect"
```

---

## Task 15: Verify End-to-End Auth Flow

**Step 1: Start dev servers**

Terminal 1:
```bash
bunx convex dev
```

Terminal 2:
```bash
bun run dev
```

**Step 2: Test sign-up flow**

1. Open http://localhost:5173
2. Click "Get Started"
3. Fill in email/password
4. Click "Create account"

Expected: Redirected to /dashboard, user email shown in header.

**Step 3: Test sign-out**

1. Click "Sign out" in header

Expected: Redirected to /sign-in.

**Step 4: Test sign-in flow**

1. Enter same email/password
2. Click "Sign in"

Expected: Redirected to /dashboard.

**Step 5: Test GitHub OAuth (if configured)**

1. Sign out
2. Click "GitHub" button
3. Authorize on GitHub

Expected: Redirected to /dashboard after authorization.

**Step 6: Document any issues found**

If issues found, note them for follow-up. Auth integration complete when all flows work.

**Step 7: Final commit**

```bash
git add .
git commit -m "feat: Phase 1 complete - SvelteKit foundation with Better Auth"
```

---

## Verification Checklist

- [ ] SvelteKit project created and running
- [ ] Convex connected to existing deployment
- [ ] Better Auth configured with email/password
- [ ] GitHub OAuth working
- [ ] Authentik OIDC working (if env vars set)
- [ ] Sign-in page functional
- [ ] Sign-up page functional
- [ ] Dashboard protected by auth guard
- [ ] Sign-out working
- [ ] Landing page redirects authenticated users
- [ ] Tailwind CSS styling working

---

## Notes for Phase 2

After Phase 1 is complete, Phase 2 will port the actual features:
- Dashboard stats component
- Subscription list (CRUD)
- Payment methods (CRUD)
- Guest mode (localStorage)

The Convex queries/mutations for subscriptions and payment methods already exist and can be used directly via `convex-svelte`.
