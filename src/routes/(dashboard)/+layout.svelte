<script lang="ts">
	import { useQuery, useConvexClient } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { onMount } from "svelte";
	import { PUBLIC_CONVEX_URL } from "$env/static/public";
	import {
		initGuestStore,
		getIsGuestMode,
		disableGuestMode,
		getAllGuestDataForMigration,
	} from "$lib/guestStore.svelte";
	import { hasGuestData } from "$lib/guestStorage";

	const { children } = $props();

	// Determine active nav item
	const isActive = (path: string) => {
		const currentPath = $page.url.pathname;
		if (path === "/dashboard") {
			return currentPath === "/dashboard";
		}
		return currentPath.startsWith(path);
	};

	const client = useConvexClient();
	const userQuery = useQuery(api.auth.loggedInUser, {});
	const namespace = PUBLIC_CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");

	// Track auth and guest state
	let isChecking = $state(true);
	let isAuthenticated = $state(false);
	let migrationMessage = $state("");
	let hasMigratedOAuth = $state(false);

	// Get reactive guest mode state
	const isGuestMode = $derived(getIsGuestMode());

	onMount(() => {
		initGuestStore();

		const token = localStorage.getItem(`__convexAuthJWT_${namespace}`);

		if (token) {
			isAuthenticated = true;
			isChecking = false;
		} else if (hasGuestData()) {
			isChecking = false;
		} else {
			goto("/sign-in");
		}
	});

	// Migrate guest data after OAuth sign-in
	async function migrateGuestDataAfterOAuth(): Promise<void> {
		const guestData = getAllGuestDataForMigration();

		// Only migrate if there's data
		if (
			guestData.paymentMethods.length === 0 &&
			guestData.subscriptions.length === 0
		) {
			return;
		}

		try {
			const result = await client.mutation(api.subscriptions.migrateFromGuest, {
				paymentMethods: guestData.paymentMethods.map((pm) => ({
					localId: pm.localId,
					name: pm.name,
					type: pm.type,
					lastFourDigits: pm.lastFourDigits,
					expiryDate: pm.expiryDate,
					isDefault: pm.isDefault,
				})),
				subscriptions: guestData.subscriptions.map((sub) => ({
					localId: sub.localId,
					name: sub.name,
					description: sub.notes,
					cost: sub.cost,
					currency: sub.currency,
					billingCycle: sub.billingCycle,
					nextBillingDate: sub.nextBillingDate,
					paymentMethodLocalId: sub.paymentMethodLocalId,
					category: sub.category,
					website: sub.website,
					isActive: sub.isActive,
					notes: sub.notes,
				})),
			});

			// Clear guest data after successful migration
			disableGuestMode();

			const totalMigrated =
				result.migratedPaymentMethods + result.migratedSubscriptions;
			if (totalMigrated > 0) {
				migrationMessage = `Successfully migrated ${result.migratedSubscriptions} subscription${result.migratedSubscriptions !== 1 ? "s" : ""} and ${result.migratedPaymentMethods} payment method${result.migratedPaymentMethods !== 1 ? "s" : ""} from guest mode`;
				// Auto-dismiss after 5 seconds
				setTimeout(() => {
					migrationMessage = "";
				}, 5000);
			}
		} catch (err) {
			console.error("Failed to migrate guest data after OAuth:", err);
		}
	}

	// Redirect if user becomes unauthenticated and is not in guest mode
	$effect(() => {
		if (
			!isChecking &&
			!isAuthenticated &&
			userQuery.data === null &&
			!userQuery.isLoading &&
			!isGuestMode
		) {
			goto("/sign-in");
		}
		if (userQuery.data !== null && userQuery.data !== undefined) {
			isAuthenticated = true;
		}
	});

	// Handle OAuth migration when user becomes authenticated
	$effect(() => {
		if (
			userQuery.data !== null &&
			userQuery.data !== undefined &&
			!hasMigratedOAuth
		) {
			// Check if we need to migrate guest data after OAuth
			const shouldMigrate =
				typeof window !== "undefined" &&
				localStorage.getItem("scrouge_migrate_guest_after_oauth") === "true";

			if (shouldMigrate) {
				hasMigratedOAuth = true;
				localStorage.removeItem("scrouge_migrate_guest_after_oauth");
				migrateGuestDataAfterOAuth();
			}
		}
	});

	async function handleSignOut() {
		if (isGuestMode) {
			// Just disable guest mode and redirect
			disableGuestMode();
			goto("/");
			return;
		}

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
		<!-- Migration Success Banner -->
		{#if migrationMessage}
			<div class="bg-green-500/10 border-b border-green-500/20">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-2">
							<svg
								class="w-5 h-5 text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span class="text-sm text-white">{migrationMessage}</span>
						</div>
						<button
							onclick={() => (migrationMessage = "")}
							class="text-green-400 hover:text-green-300 transition-colors"
							aria-label="Dismiss notification"
						>
							<svg
								class="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Guest Mode Banner -->
		{#if isGuestMode && !isAuthenticated}
			<div class="bg-primary/10 border-b border-primary/20">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-2">
							<svg
								class="w-5 h-5 text-primary"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span class="text-sm text-white">
								<span class="font-medium">Guest Mode</span> - Your data is saved
								locally
							</span>
						</div>
						<a
							href="/sign-up"
							class="px-3 py-1 text-sm bg-primary hover:bg-primary-hover text-black font-medium rounded-lg transition-colors"
						>
							Sign up to save
						</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- Navigation header -->
		<header class="border-b border-zinc-800">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between items-center h-16">
					<div class="flex items-center gap-8">
						<a href="/dashboard" class="text-2xl font-bold text-primary"
							>Scrouge</a
						>
						<nav class="hidden md:flex items-center gap-6">
							<a
								href="/dashboard"
								class="text-secondary hover:text-white transition-colors"
								>Dashboard</a
							>
							<a
								href="/dashboard/subscriptions"
								class="text-secondary hover:text-white transition-colors"
								>Subscriptions</a
							>
							<a
								href="/dashboard/settings"
								class="text-secondary hover:text-white transition-colors"
								>Settings</a
							>
						</nav>
					</div>

					<div class="flex items-center gap-4">
						{#if isGuestMode && !isAuthenticated}
							<span class="text-sm text-secondary">Guest</span>
						{:else if userQuery.data}
							<span class="text-sm text-secondary">
								{userQuery.data.email || userQuery.data.name || "User"}
							</span>
						{/if}
						<button
							onclick={handleSignOut}
							class="px-3 py-1.5 text-sm bg-surface-elevated hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white transition-colors"
						>
							{isGuestMode && !isAuthenticated ? "Exit Guest Mode" : "Sign Out"}
						</button>
					</div>
				</div>
			</div>
		</header>

		<!-- Main content -->
		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
			{@render children()}
		</main>

		<!-- Mobile bottom navigation -->
		<nav
			class="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-zinc-800 safe-area-inset-bottom"
		>
			<div class="flex justify-around items-center h-16">
				<a
					href="/dashboard"
					class="flex flex-col items-center gap-1 px-4 py-2 transition-colors {isActive(
						'/dashboard',
					)
						? 'text-primary'
						: 'text-secondary'}"
				>
					<svg
						class="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
						/>
					</svg>
					<span class="text-xs">Home</span>
				</a>

				<a
					href="/dashboard/subscriptions"
					class="flex flex-col items-center gap-1 px-4 py-2 transition-colors {isActive(
						'/dashboard/subscriptions',
					)
						? 'text-primary'
						: 'text-secondary'}"
				>
					<svg
						class="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 10h16M4 14h16M4 18h16"
						/>
					</svg>
					<span class="text-xs">Subs</span>
				</a>

				<a
					href="/dashboard/subscriptions/new"
					class="flex items-center justify-center w-14 h-14 -mt-6 bg-primary rounded-full shadow-lg"
				>
					<svg
						class="w-7 h-7 text-black"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
				</a>

				<a
					href="/dashboard/settings"
					class="flex flex-col items-center gap-1 px-4 py-2 transition-colors {isActive(
						'/dashboard/settings',
					)
						? 'text-primary'
						: 'text-secondary'}"
				>
					<svg
						class="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					<span class="text-xs">Settings</span>
				</a>

				<button
					onclick={handleSignOut}
					class="flex flex-col items-center gap-1 px-4 py-2 text-secondary transition-colors"
				>
					<svg
						class="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					<span class="text-xs">{isGuestMode && !isAuthenticated ? "Exit" : "Out"}</span>
				</button>
			</div>
		</nav>
	</div>
{/if}
