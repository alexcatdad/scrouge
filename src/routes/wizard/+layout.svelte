<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import { onMount, setContext } from "svelte";
	import { PUBLIC_CONVEX_URL } from "$env/static/public";
	import {
		getIsGuestMode,
		initGuestStore,
		hasGuestData,
	} from "$lib/guestStore.svelte";

	const { children } = $props();

	// Shared step state via context
	let currentStep = $state(1);

	// Create a reactive object to share via context
	const wizardState = {
		get step() {
			return currentStep;
		},
		setStep(step: number) {
			currentStep = step;
		}
	};

	setContext("wizard", wizardState);

	const userQuery = useQuery(api.auth.loggedInUser, {});
	const namespace = PUBLIC_CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");

	// Track auth and guest mode state
	let isChecking = $state(true);
	const isGuestMode = $derived(getIsGuestMode());

	onMount(() => {
		// Initialize guest store from localStorage
		initGuestStore();

		// Check localStorage for auth token
		const token = localStorage.getItem(`__convexAuthJWT_${namespace}`);

		if (token) {
			// Authenticated user
			isChecking = false;
		} else if (hasGuestData()) {
			// Guest mode user - allow access
			isChecking = false;
		} else {
			// No auth and no guest data - redirect to sign-in
			goto("/sign-in");
		}
	});

	// Redirect if user becomes unauthenticated (but not if in guest mode)
	$effect(() => {
		if (!isChecking && !isGuestMode && userQuery.data === null && !userQuery.isLoading) {
			goto("/sign-in");
		}
	});
</script>

{#if isChecking}
	<div class="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
		<div class="text-secondary">Loading...</div>
	</div>
{:else}
	<div class="min-h-screen bg-[#0a0a0b] flex flex-col">
		<!-- Progress Header -->
		<header class="border-b border-zinc-800 py-4">
			<div class="max-w-2xl mx-auto px-4">
				<div class="flex items-center justify-between mb-4">
					<h1 class="text-xl font-bold text-white">Quick Start</h1>
					<span class="text-sm text-secondary">Step {currentStep} of 3</span>
				</div>

				<!-- Progress Bar -->
				<div class="flex gap-2">
					{#each [1, 2, 3] as step}
						<div
							class="flex-1 h-1.5 rounded-full transition-colors {step <= currentStep ? 'bg-primary' : 'bg-zinc-700'}"
						></div>
					{/each}
				</div>
			</div>
		</header>

		<!-- Main content -->
		<main class="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
			{@render children()}
		</main>
	</div>
{/if}
