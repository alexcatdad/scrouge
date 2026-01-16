<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import {
		getIsGuestMode,
		getGuestSubscriptions,
	} from "$lib/guestStore.svelte";

	// Check if in guest mode
	const isGuestMode = $derived(getIsGuestMode());

	// Convex query (only used when authenticated)
	const subscriptionsQuery = useQuery(api.subscriptions.list, {
		activeOnly: false,
	});

	// Guest mode data
	const guestSubscriptions = $derived(getGuestSubscriptions());

	// Unified data based on mode
	const isLoading = $derived(!isGuestMode && subscriptionsQuery.isLoading);

	const subscriptions = $derived(
		isGuestMode
			? guestSubscriptions.map((sub) => ({
					_id: sub.localId,
					name: sub.name,
					cost: sub.cost,
					currency: sub.currency,
					billingCycle: sub.billingCycle,
					nextBillingDate: sub.nextBillingDate,
					website: sub.website,
					isActive: sub.isActive,
				}))
			: (subscriptionsQuery.data ?? []),
	);

	function formatCurrency(amount: number, currency: string): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency,
		}).format(amount);
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}

	function getBillingLabel(cycle: string): string {
		switch (cycle) {
			case "monthly":
				return "/mo";
			case "yearly":
				return "/yr";
			case "weekly":
				return "/wk";
			case "daily":
				return "/day";
			default:
				return "";
		}
	}

	function getDaysUntil(timestamp: number): number {
		const now = Date.now();
		return Math.ceil((timestamp - now) / (1000 * 60 * 60 * 24));
	}

	function getIconUrl(website: string | undefined): string {
		if (!website) return "";
		const domain = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
		return `https://logo.clearbit.com/${domain}`;
	}

	function handleSubscriptionClick(id: string) {
		if (isGuestMode) {
			goto(`/dashboard/subscriptions/${id}?guest=true`);
		} else {
			goto(`/dashboard/subscriptions/${id}`);
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-white">Subscriptions</h1>
		<span class="text-sm text-secondary">
			{#if subscriptions}
				{subscriptions.length} total
			{/if}
		</span>
	</div>

	<!-- Subscription List -->
	{#if isLoading}
		<div class="space-y-3">
			{#each [1, 2, 3] as _}
				<div class="bg-surface rounded-xl p-4 animate-pulse">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 bg-zinc-700 rounded-lg"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 bg-zinc-700 rounded w-32"></div>
							<div class="h-3 bg-zinc-700 rounded w-24"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if subscriptions && subscriptions.length > 0}
		<div class="space-y-3">
			{#each subscriptions as subscription}
				{@const daysUntil = getDaysUntil(subscription.nextBillingDate)}
				<button
					onclick={() => handleSubscriptionClick(subscription._id)}
					class="w-full bg-surface hover:bg-surface-elevated rounded-xl p-4 transition-colors text-left"
				>
					<div class="flex items-center gap-4">
						<!-- Icon -->
						<div
							class="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
						>
							{#if subscription.website}
								<img
									src={getIconUrl(subscription.website)}
									alt=""
									class="w-8 h-8 object-contain"
									onerror={(e) => {
										const target = e.target as HTMLImageElement;
										target.style.display = "none";
									}}
								/>
							{/if}
							<span class="text-lg font-bold text-primary">
								{subscription.name.charAt(0).toUpperCase()}
							</span>
						</div>

						<!-- Details -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="font-medium text-white truncate">
									{subscription.name}
								</h3>
								{#if !subscription.isActive}
									<span
										class="px-2 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded"
										>Inactive</span
									>
								{/if}
							</div>
							<p class="text-sm text-secondary">
								{#if daysUntil === 0}
									Due today
								{:else if daysUntil === 1}
									Due tomorrow
								{:else if daysUntil < 0}
									{Math.abs(daysUntil)} days overdue
								{:else}
									Due {formatDate(subscription.nextBillingDate)}
								{/if}
							</p>
						</div>

						<!-- Cost -->
						<div class="text-right flex-shrink-0">
							<p class="font-medium text-white">
								{formatCurrency(subscription.cost, subscription.currency)}
								<span class="text-secondary text-sm"
									>{getBillingLabel(subscription.billingCycle)}</span
								>
							</p>
							{#if daysUntil >= 0 && daysUntil <= 7}
								<p class="text-xs text-accent-coral">{daysUntil} days</p>
							{/if}
						</div>

						<!-- Arrow -->
						<svg
							class="w-5 h-5 text-secondary flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12">
			<div
				class="w-16 h-16 mx-auto mb-4 bg-surface rounded-full flex items-center justify-center"
			>
				<svg
					class="w-8 h-8 text-secondary"
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
			</div>
			<h3 class="text-lg font-medium text-white mb-2">No subscriptions yet</h3>
			<p class="text-secondary mb-6">
				Add your first subscription to start tracking your spending.
			</p>
			<button
				onclick={() => goto("/dashboard/subscriptions/new")}
				class="px-6 py-3 bg-primary hover:bg-primary-hover text-black font-medium rounded-lg transition-colors"
			>
				Add Subscription
			</button>
		</div>
	{/if}
</div>

<!-- FAB -->
{#if subscriptions && subscriptions.length > 0}
	<button
		onclick={() => goto("/dashboard/subscriptions/new")}
		class="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary-hover text-black rounded-full shadow-lg flex items-center justify-center transition-colors md:bottom-8 md:right-8"
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
				d="M12 6v6m0 0v6m0-6h6m-6 0H6"
			/>
		</svg>
	</button>
{/if}
