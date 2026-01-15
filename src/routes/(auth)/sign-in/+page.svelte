<script lang="ts">
	import { useConvexClient } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import { PUBLIC_CONVEX_URL } from "$env/static/public";

	let email = $state("");
	let password = $state("");
	let loading = $state(false);
	let error = $state("");

	const client = useConvexClient();
	const namespace = PUBLIC_CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");

	async function handleEmailSignIn(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = "";

		try {
			const result = await client.action(api.auth.signIn, {
				provider: "password",
				params: { email, password, flow: "signIn" },
			});

			if (result.tokens) {
				// Store tokens in localStorage
				localStorage.setItem(`__convexAuthJWT_${namespace}`, result.tokens.token);
				localStorage.setItem(`__convexAuthRefreshToken_${namespace}`, result.tokens.refreshToken);
				goto("/dashboard");
			} else {
				error = "Sign in failed. Please check your credentials.";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "An unexpected error occurred";
		} finally {
			loading = false;
		}
	}

	async function handleOAuthSignIn(provider: string) {
		loading = true;
		error = "";

		try {
			const result = await client.action(api.auth.signIn, {
				provider,
				params: {},
			});

			if (result.redirect) {
				// Store verifier for OAuth callback
				if (result.verifier) {
					localStorage.setItem(`__convexAuthOAuthVerifier_${namespace}`, result.verifier);
				}
				window.location.href = result.redirect;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "An unexpected error occurred";
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="text-center">
		<h1 class="text-3xl font-bold text-primary">Sign In</h1>
		<p class="mt-2 text-secondary">Welcome back to Scrouge</p>
	</div>

	{#if error}
		<div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
			{error}
		</div>
	{/if}

	<form onsubmit={handleEmailSignIn} class="space-y-4">
		<div>
			<label for="email" class="block text-sm font-medium text-secondary mb-1">Email</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				required
				disabled={loading}
				class="w-full px-4 py-2 bg-surface border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
				placeholder="you@example.com"
			/>
		</div>

		<div>
			<label for="password" class="block text-sm font-medium text-secondary mb-1">Password</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				required
				disabled={loading}
				class="w-full px-4 py-2 bg-surface border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
				placeholder="Enter your password"
			/>
		</div>

		<button
			type="submit"
			disabled={loading}
			class="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{loading ? "Signing in..." : "Sign In"}
		</button>
	</form>

	<div class="relative">
		<div class="absolute inset-0 flex items-center">
			<div class="w-full border-t border-zinc-700"></div>
		</div>
		<div class="relative flex justify-center text-sm">
			<span class="px-2 bg-[#0a0a0b] text-secondary">Or continue with</span>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<button
			onclick={() => handleOAuthSignIn("github")}
			disabled={loading}
			class="flex items-center justify-center gap-2 py-2 px-4 bg-surface-elevated hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
			</svg>
			GitHub
		</button>

		<button
			onclick={() => handleOAuthSignIn("authentik")}
			disabled={loading}
			class="flex items-center justify-center gap-2 py-2 px-4 bg-surface-elevated hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
			</svg>
			Authentik
		</button>
	</div>

	<p class="text-center text-sm text-secondary">
		Don't have an account?
		<a href="/sign-up" class="text-primary hover:text-primary-hover transition-colors">
			Sign up
		</a>
	</p>
</div>
