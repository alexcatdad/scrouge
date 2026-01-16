<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { PUBLIC_CONVEX_URL } from "$env/static/public";
	import { enableGuestMode, initGuestStore } from "$lib/guestStore.svelte";
	import { hasGuestData } from "$lib/guestStorage";

	const namespace = PUBLIC_CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");

	onMount(() => {
		// Initialize guest store to check for existing guest data
		initGuestStore();

		// Check if user is already authenticated
		const token = localStorage.getItem(`__convexAuthJWT_${namespace}`);

		if (token) {
			goto("/dashboard");
		}
	});

	function handleTryWithoutAccount() {
		// Enable guest mode and redirect to dashboard
		enableGuestMode();
		goto("/dashboard");
	}

	// Check if user has existing guest data
	const hasExistingGuestData = $derived(hasGuestData());
</script>

<div class="min-h-screen flex flex-col">
	<!-- Header -->
	<header class="border-b border-zinc-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<span class="text-2xl font-bold text-primary">Scrouge</span>
				<div class="flex items-center gap-4">
					<a
						href="/sign-in"
						class="text-secondary hover:text-white transition-colors"
					>
						Sign In
					</a>
					<a
						href="/sign-up"
						class="px-4 py-2 bg-primary hover:bg-primary-hover text-black font-medium rounded-lg transition-colors"
					>
						Get Started
					</a>
				</div>
			</div>
		</div>
	</header>

	<!-- Hero Section -->
	<main class="flex-1 flex items-center justify-center px-4">
		<div class="max-w-3xl mx-auto text-center">
			<h1 class="text-5xl md:text-6xl font-bold text-white mb-6">
				Take Control of Your
				<span class="text-primary">Subscriptions</span>
			</h1>
			<p class="text-xl text-secondary mb-10 max-w-2xl mx-auto">
				Stop losing money to forgotten subscriptions. Scrouge helps you track,
				manage, and optimize all your recurring payments in one place.
			</p>
			<div
				class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
			>
				<a
					href="/sign-up"
					class="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary-hover text-black font-semibold rounded-lg transition-colors text-lg"
				>
					Start Tracking Free
				</a>
				<a
					href="/sign-in"
					class="w-full sm:w-auto px-8 py-3 bg-surface-elevated hover:bg-zinc-700 border border-zinc-700 text-white font-semibold rounded-lg transition-colors text-lg"
				>
					Sign In
				</a>
			</div>

			<!-- Try without account button -->
			<button
				onclick={handleTryWithoutAccount}
				class="text-primary hover:text-primary-hover transition-colors text-sm font-medium underline-offset-4 hover:underline"
			>
				{hasExistingGuestData
					? "Continue as guest"
					: "Try without an account"}
			</button>
			{#if !hasExistingGuestData}
				<p class="text-xs text-secondary mt-2">
					Data stored locally on your device. Sign up anytime to sync.
				</p>
			{/if}
		</div>
	</main>

	<!-- Features Section -->
	<section class="py-20 border-t border-zinc-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<h2 class="text-3xl font-bold text-white text-center mb-12">
				Everything you need to manage subscriptions
			</h2>
			<div class="grid md:grid-cols-3 gap-8">
				<div class="p-6 bg-surface border border-zinc-800 rounded-xl">
					<div
						class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4"
					>
						<svg
							class="w-6 h-6 text-primary"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-white mb-2">Track Everything</h3>
					<p class="text-secondary">
						Keep all your subscriptions in one place. Never forget about a
						renewal again.
					</p>
				</div>

				<div class="p-6 bg-surface border border-zinc-800 rounded-xl">
					<div
						class="w-12 h-12 bg-accent-teal/10 rounded-lg flex items-center justify-center mb-4"
					>
						<svg
							class="w-6 h-6 text-accent-teal"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-white mb-2">See Your Spending</h3>
					<p class="text-secondary">
						Get insights into your monthly and yearly subscription costs at a
						glance.
					</p>
				</div>

				<div class="p-6 bg-surface border border-zinc-800 rounded-xl">
					<div
						class="w-12 h-12 bg-accent-coral/10 rounded-lg flex items-center justify-center mb-4"
					>
						<svg
							class="w-6 h-6 text-accent-coral"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-white mb-2">Get Reminders</h3>
					<p class="text-secondary">
						Receive notifications before renewals so you can cancel what you
						don't need.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="py-8 border-t border-zinc-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center">
				<span class="text-secondary text-sm">
					&copy; {new Date().getFullYear()} Scrouge. All rights reserved.
				</span>
				<span class="text-primary font-bold">Scrouge</span>
			</div>
		</div>
	</footer>
</div>
