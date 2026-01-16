<script lang="ts">
	import { useConvexClient } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import { PUBLIC_CONVEX_URL } from "$env/static/public";
	import {
		getAllGuestDataForMigration,
		getIsGuestMode,
		disableGuestMode,
	} from "$lib/guestStore.svelte";

	let email = $state("");
	let password = $state("");
	let confirmPassword = $state("");
	let name = $state("");
	let loading = $state(false);
	let error = $state("");
	let migrationMessage = $state("");

	const client = useConvexClient();
	const namespace = PUBLIC_CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");

	// Check if user has guest data to migrate
	const hasGuestDataToMigrate = $derived(getIsGuestMode());

	async function migrateGuestData(): Promise<{
		migratedPaymentMethods: number;
		migratedSubscriptions: number;
	} | null> {
		const guestData = getAllGuestDataForMigration();

		// Only migrate if there's data
		if (
			guestData.paymentMethods.length === 0 &&
			guestData.subscriptions.length === 0
		) {
			return null;
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

			return result;
		} catch (err) {
			console.error("Failed to migrate guest data:", err);
			// Don't throw - migration failure shouldn't block sign-up
			return null;
		}
	}

	async function handleSignUp(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = "";
		migrationMessage = "";

		if (password !== confirmPassword) {
			error = "Passwords do not match";
			loading = false;
			return;
		}

		if (password.length < 8) {
			error = "Password must be at least 8 characters";
			loading = false;
			return;
		}

		try {
			const result = await client.action(api.auth.signIn, {
				provider: "password",
				params: { email, password, name, flow: "signUp" },
			});

			if (result.tokens) {
				// Store tokens in localStorage
				localStorage.setItem(`__convexAuthJWT_${namespace}`, result.tokens.token);
				localStorage.setItem(
					`__convexAuthRefreshToken_${namespace}`,
					result.tokens.refreshToken,
				);

				// Migrate guest data if present
				if (hasGuestDataToMigrate) {
					const migrationResult = await migrateGuestData();
					if (migrationResult) {
						const totalMigrated =
							migrationResult.migratedPaymentMethods +
							migrationResult.migratedSubscriptions;
						if (totalMigrated > 0) {
							migrationMessage = `Migrated ${migrationResult.migratedSubscriptions} subscription${migrationResult.migratedSubscriptions !== 1 ? "s" : ""} and ${migrationResult.migratedPaymentMethods} payment method${migrationResult.migratedPaymentMethods !== 1 ? "s" : ""}`;
							// Show message briefly before redirecting
							await new Promise((resolve) => setTimeout(resolve, 1500));
						}
					}
				}

				goto("/dashboard");
			} else {
				error = "Sign up failed. Please try again.";
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
					localStorage.setItem(
						`__convexAuthOAuthVerifier_${namespace}`,
						result.verifier,
					);
				}
				// Store flag to migrate guest data after OAuth callback
				if (hasGuestDataToMigrate) {
					localStorage.setItem("scrouge_migrate_guest_after_oauth", "true");
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
		<h1 class="text-3xl font-bold text-primary">Create Account</h1>
		<p class="mt-2 text-secondary">Start tracking your subscriptions</p>
	</div>

	{#if hasGuestDataToMigrate}
		<div
			class="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3"
		>
			<svg
				class="w-5 h-5 text-primary flex-shrink-0"
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
				Your guest data will be migrated to your new account
			</span>
		</div>
	{/if}

	{#if error}
		<div
			class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
		>
			{error}
		</div>
	{/if}

	{#if migrationMessage}
		<div
			class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm"
		>
			{migrationMessage}
		</div>
	{/if}

	<form onsubmit={handleSignUp} class="space-y-4">
		<div>
			<label for="name" class="block text-sm font-medium text-secondary mb-1"
				>Name (optional)</label
			>
			<input
				id="name"
				type="text"
				bind:value={name}
				disabled={loading}
				class="w-full px-4 py-2 bg-surface border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
				placeholder="Your name"
			/>
		</div>

		<div>
			<label for="email" class="block text-sm font-medium text-secondary mb-1"
				>Email</label
			>
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
			<label
				for="password"
				class="block text-sm font-medium text-secondary mb-1">Password</label
			>
			<input
				id="password"
				type="password"
				bind:value={password}
				required
				minlength={8}
				disabled={loading}
				class="w-full px-4 py-2 bg-surface border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
				placeholder="At least 8 characters"
			/>
		</div>

		<div>
			<label
				for="confirmPassword"
				class="block text-sm font-medium text-secondary mb-1"
				>Confirm Password</label
			>
			<input
				id="confirmPassword"
				type="password"
				bind:value={confirmPassword}
				required
				disabled={loading}
				class="w-full px-4 py-2 bg-surface border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
				placeholder="Confirm your password"
			/>
		</div>

		<button
			type="submit"
			disabled={loading}
			class="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{loading ? "Creating account..." : "Create Account"}
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
				<path
					d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
				/>
			</svg>
			GitHub
		</button>

		<button
			onclick={() => handleOAuthSignIn("authentik")}
			disabled={loading}
			class="flex items-center justify-center gap-2 py-2 px-4 bg-surface-elevated hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
				/>
			</svg>
			Authentik
		</button>
	</div>

	<p class="text-center text-sm text-secondary">
		Already have an account?
		<a
			href="/sign-in"
			class="text-primary hover:text-primary-hover transition-colors"
		>
			Sign in
		</a>
	</p>
</div>
