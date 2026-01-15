<script lang="ts">
	import { useQuery, useConvexClient } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { PUBLIC_CONVEX_URL } from "$env/static/public";

	const { children } = $props();

	const client = useConvexClient();
	const userQuery = useQuery(api.auth.loggedInUser, {});
	const namespace = PUBLIC_CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");

	// Track auth state
	let isChecking = $state(true);

	onMount(() => {
		// Check localStorage for auth token
		const token = localStorage.getItem(`__convexAuthJWT_${namespace}`);

		if (!token) {
			goto("/sign-in");
		} else {
			isChecking = false;
		}
	});

	// Redirect if user becomes unauthenticated
	$effect(() => {
		if (!isChecking && userQuery.data === null && !userQuery.isLoading) {
			goto("/sign-in");
		}
	});

	async function handleSignOut() {
		try {
			await client.action(api.auth.signOut, {});
		} catch {
			// Ignore errors
		}

		// Clear tokens
		localStorage.removeItem(`__convexAuthJWT_${namespace}`);
		localStorage.removeItem(`__convexAuthRefreshToken_${namespace}`);

		goto("/sign-in");
	}
</script>

{#if isChecking}
	<div class="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
		<div class="text-secondary">Loading...</div>
	</div>
{:else}
	<div class="min-h-screen bg-[#0a0a0b]">
		<!-- Navigation header -->
		<header class="border-b border-zinc-800">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between items-center h-16">
					<div class="flex items-center gap-8">
						<a href="/dashboard" class="text-2xl font-bold text-primary">Scrouge</a>
						<nav class="hidden md:flex items-center gap-6">
							<a href="/dashboard" class="text-secondary hover:text-white transition-colors">Dashboard</a>
							<a href="/dashboard/subscriptions" class="text-secondary hover:text-white transition-colors">Subscriptions</a>
							<a href="/dashboard/settings" class="text-secondary hover:text-white transition-colors">Settings</a>
						</nav>
					</div>

					<div class="flex items-center gap-4">
						{#if userQuery.data}
							<span class="text-sm text-secondary">
								{userQuery.data.email || userQuery.data.name || "User"}
							</span>
						{/if}
						<button
							onclick={handleSignOut}
							class="px-3 py-1.5 text-sm bg-surface-elevated hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white transition-colors"
						>
							Sign Out
						</button>
					</div>
				</div>
			</div>
		</header>

		<!-- Main content -->
		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{@render children()}
		</main>
	</div>
{/if}
