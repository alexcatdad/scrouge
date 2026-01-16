<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";

	const userQuery = useQuery(api.auth.loggedInUser, {});
	const upcomingQuery = useQuery(api.subscriptions.getUpcoming, { days: 7 });
	const totalCostQuery = useQuery(api.subscriptions.getTotalCost, {});
	const subscriptionsQuery = useQuery(api.subscriptions.list, { activeOnly: true });

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

	function getDaysUntil(timestamp: number): number {
		const now = Date.now();
		return Math.ceil((timestamp - now) / (1000 * 60 * 60 * 24));
	}

	function getIconUrl(website: string | undefined): string {
		if (!website) return "";
		const domain = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
		return `https://logo.clearbit.com/${domain}`;
	}

	// Calculate waste - subscriptions with family plans that have unused slots
	const wasteAlerts = $derived(() => {
		if (!subscriptionsQuery.data) return [];
		return subscriptionsQuery.data
			.filter((sub) => sub.maxSlots && sub.maxSlots > 1)
			.map((sub) => {
				// For now, assume 1 slot used (the owner)
				// In a full implementation, we'd count shares from the sharing table
				const usedSlots = 1;
				const unusedSlots = (sub.maxSlots ?? 0) - usedSlots;
				const costPerSlot = sub.cost / (sub.maxSlots ?? 1);
				const wastedAmount = costPerSlot * unusedSlots;
				return {
					...sub,
					usedSlots,
					unusedSlots,
					costPerSlot,
					wastedAmount,
				};
			})
			.filter((sub) => sub.unusedSlots > 0);
	});

	// Get primary currency total
	const primaryTotal = $derived(() => {
		if (!totalCostQuery.data) return { amount: 0, currency: "USD" };
		const currencies = Object.entries(totalCostQuery.data);
		if (currencies.length === 0) return { amount: 0, currency: "USD" };
		// Return the largest total
		const [currency, amount] = currencies.sort((a, b) => b[1] - a[1])[0];
		return { amount, currency };
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-white">
			{#if userQuery.data?.name}
				Hi, {userQuery.data.name}!
			{:else}
				Dashboard
			{/if}
		</h1>
		<p class="text-secondary text-sm">Your subscription overview</p>
	</div>

	<!-- Quick Stats -->
	<div class="grid grid-cols-2 gap-3">
		<div class="p-4 bg-surface rounded-xl">
			<p class="text-sm text-secondary">Monthly</p>
			<p class="text-xl font-bold text-white">
				{#if totalCostQuery.isLoading}
					...
				{:else}
					{formatCurrency(primaryTotal().amount, primaryTotal().currency)}
				{/if}
			</p>
		</div>
		<div class="p-4 bg-surface rounded-xl">
			<p class="text-sm text-secondary">Active</p>
			<p class="text-xl font-bold text-white">
				{#if subscriptionsQuery.isLoading}
					...
				{:else}
					{subscriptionsQuery.data?.length ?? 0}
				{/if}
			</p>
		</div>
	</div>

	<!-- Upcoming Renewals -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="font-semibold text-white">Upcoming (7 days)</h2>
			{#if upcomingQuery.data && upcomingQuery.data.length > 0}
				<span class="text-sm text-secondary">{upcomingQuery.data.length} renewal{upcomingQuery.data.length !== 1 ? "s" : ""}</span>
			{/if}
		</div>

		{#if upcomingQuery.isLoading}
			<div class="space-y-2">
				{#each [1, 2] as _}
					<div class="p-4 bg-surface rounded-xl animate-pulse h-16"></div>
				{/each}
			</div>
		{:else if upcomingQuery.data && upcomingQuery.data.length > 0}
			<div class="space-y-2">
				{#each upcomingQuery.data as sub}
					{@const daysUntil = getDaysUntil(sub.nextBillingDate)}
					<button
						onclick={() => goto(`/dashboard/subscriptions/${sub._id}`)}
						class="w-full p-4 bg-surface hover:bg-surface-elevated rounded-xl transition-colors text-left"
					>
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
								{#if sub.website}
									<img
										src={getIconUrl(sub.website)}
										alt=""
										class="w-7 h-7 object-contain"
										onerror={(e) => {
											const target = e.target as HTMLImageElement;
											target.style.display = "none";
										}}
									/>
								{/if}
								<span class="text-sm font-bold text-primary">
									{sub.name.charAt(0).toUpperCase()}
								</span>
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-medium text-white truncate">{sub.name}</p>
								<p class="text-sm text-secondary">
									{#if daysUntil === 0}
										Today
									{:else if daysUntil === 1}
										Tomorrow
									{:else}
										{formatDate(sub.nextBillingDate)}
									{/if}
								</p>
							</div>
							<div class="text-right flex-shrink-0">
								<p class="font-medium text-white">{formatCurrency(sub.cost, sub.currency)}</p>
								{#if daysUntil <= 3}
									<p class="text-xs text-accent-coral">{daysUntil} day{daysUntil !== 1 ? "s" : ""}</p>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{:else}
			<div class="p-6 bg-surface rounded-xl text-center">
				<p class="text-secondary text-sm">No renewals in the next 7 days</p>
			</div>
		{/if}
	</div>

	<!-- Waste Alerts -->
	{#if wasteAlerts().length > 0}
		<div class="space-y-3">
			<div class="flex items-center gap-2">
				<h2 class="font-semibold text-white">Potential Savings</h2>
				<span class="px-2 py-0.5 text-xs bg-accent-coral/20 text-accent-coral rounded-full">
					{wasteAlerts().length}
				</span>
			</div>

			<div class="space-y-2">
				{#each wasteAlerts() as alert}
					<button
						onclick={() => goto(`/dashboard/subscriptions/${alert._id}`)}
						class="w-full p-4 bg-surface hover:bg-surface-elevated rounded-xl transition-colors text-left border border-accent-coral/20"
					>
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
								{#if alert.website}
									<img
										src={getIconUrl(alert.website)}
										alt=""
										class="w-7 h-7 object-contain"
										onerror={(e) => {
											const target = e.target as HTMLImageElement;
											target.style.display = "none";
										}}
									/>
								{/if}
								<span class="text-sm font-bold text-primary">
									{alert.name.charAt(0).toUpperCase()}
								</span>
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-medium text-white truncate">{alert.name}</p>
								<p class="text-sm text-accent-coral">
									{alert.unusedSlots} unused slot{alert.unusedSlots !== 1 ? "s" : ""}
								</p>
							</div>
							<div class="text-right flex-shrink-0">
								<p class="font-medium text-accent-coral">
									-{formatCurrency(alert.wastedAmount, alert.currency)}/mo
								</p>
								<p class="text-xs text-secondary">
									{alert.usedSlots}/{alert.maxSlots} used
								</p>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Quick Actions -->
	<div class="grid grid-cols-2 gap-3">
		<button
			onclick={() => goto("/dashboard/subscriptions")}
			class="p-4 bg-surface hover:bg-surface-elevated rounded-xl transition-colors text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
				</div>
				<div>
					<p class="font-medium text-white">Subscriptions</p>
					<p class="text-xs text-secondary">View all</p>
				</div>
			</div>
		</button>

		<button
			onclick={() => goto("/dashboard/subscriptions/new")}
			class="p-4 bg-surface hover:bg-surface-elevated rounded-xl transition-colors text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
				</div>
				<div>
					<p class="font-medium text-white">Add New</p>
					<p class="text-xs text-secondary">Subscription</p>
				</div>
			</div>
		</button>
	</div>
</div>
