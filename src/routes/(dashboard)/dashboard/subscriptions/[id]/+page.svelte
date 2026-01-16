<script lang="ts">
	import { page } from "$app/stores";
	import { useQuery, useConvexClient } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import type { Id } from "$convex/_generated/dataModel";

	const client = useConvexClient();
	const subscriptionId = $derived($page.params.id as Id<"subscriptions">);

	const subscriptionQuery = useQuery(api.subscriptions.get, { id: subscriptionId });
	const paymentMethodsQuery = useQuery(api.paymentMethods.list, {});

	// Form state (populated from query)
	let name = $state("");
	let cost = $state(0);
	let currency = $state("USD");
	let billingCycle = $state<"monthly" | "yearly" | "weekly" | "daily">("monthly");
	let nextBillingDate = $state("");
	let paymentMethodId = $state<Id<"paymentMethods"> | "">("");
	let category = $state("");
	let website = $state("");
	let notes = $state("");
	let maxSlots = $state<number | null>(null);
	let isFamilyPlan = $state(false);
	let isActive = $state(true);

	let isEditing = $state(false);
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let error = $state("");
	let showDeleteConfirm = $state(false);

	// Populate form when subscription loads
	$effect(() => {
		if (subscriptionQuery.data) {
			const sub = subscriptionQuery.data;
			name = sub.name;
			cost = sub.cost;
			currency = sub.currency;
			billingCycle = sub.billingCycle;
			nextBillingDate = new Date(sub.nextBillingDate).toISOString().split("T")[0];
			paymentMethodId = sub.paymentMethodId;
			category = sub.category;
			website = sub.website ?? "";
			notes = sub.notes ?? "";
			maxSlots = sub.maxSlots ?? null;
			isFamilyPlan = !!sub.maxSlots;
			isActive = sub.isActive;
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!paymentMethodId) {
			error = "Please select a payment method";
			return;
		}

		isSubmitting = true;
		error = "";

		try {
			await client.mutation(api.subscriptions.update, {
				id: subscriptionId,
				name,
				cost,
				currency,
				billingCycle,
				nextBillingDate: new Date(nextBillingDate).getTime(),
				paymentMethodId: paymentMethodId as Id<"paymentMethods">,
				category,
				website: website || undefined,
				notes: notes || undefined,
				maxSlots: isFamilyPlan && maxSlots ? maxSlots : undefined,
				isActive,
			});
			isEditing = false;
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to update subscription";
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		isDeleting = true;
		try {
			await client.mutation(api.subscriptions.remove, { id: subscriptionId });
			goto("/dashboard/subscriptions");
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to delete subscription";
			isDeleting = false;
		}
	}

	function formatCurrency(amount: number, curr: string): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: curr,
		}).format(amount);
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}

	function getBillingLabel(cycle: string): string {
		switch (cycle) {
			case "monthly": return "Monthly";
			case "yearly": return "Yearly";
			case "weekly": return "Weekly";
			case "daily": return "Daily";
			default: return cycle;
		}
	}

	function getIconUrl(ws: string | undefined): string {
		if (!ws) return "";
		return `https://logo.clearbit.com/${ws}`;
	}
</script>

<div class="space-y-6 max-w-lg mx-auto">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<button onclick={() => goto("/dashboard/subscriptions")} class="p-2 -ml-2 hover:bg-surface rounded-lg transition-colors">
				<svg class="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			{#if subscriptionQuery.data}
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-surface rounded-lg flex items-center justify-center overflow-hidden">
						{#if subscriptionQuery.data.website}
							<img
								src={getIconUrl(subscriptionQuery.data.website)}
								alt=""
								class="w-8 h-8 object-contain"
								onerror={(e) => {
									const target = e.target as HTMLImageElement;
									target.style.display = "none";
								}}
							/>
						{/if}
						<span class="text-lg font-bold text-primary">
							{subscriptionQuery.data.name.charAt(0).toUpperCase()}
						</span>
					</div>
					<div>
						<h1 class="text-xl font-bold text-white">{subscriptionQuery.data.name}</h1>
						{#if !subscriptionQuery.data.isActive}
							<span class="text-xs text-zinc-400">Inactive</span>
						{/if}
					</div>
				</div>
			{:else}
				<h1 class="text-xl font-bold text-white">Subscription</h1>
			{/if}
		</div>

		{#if subscriptionQuery.data && !isEditing}
			<button
				onclick={() => (isEditing = true)}
				class="px-4 py-2 bg-surface hover:bg-surface-elevated text-white text-sm font-medium rounded-lg transition-colors"
			>
				Edit
			</button>
		{/if}
	</div>

	{#if subscriptionQuery.isLoading}
		<div class="space-y-4">
			{#each [1, 2, 3, 4] as _}
				<div class="h-16 bg-surface rounded-xl animate-pulse"></div>
			{/each}
		</div>
	{:else if subscriptionQuery.data}
		{#if error}
			<div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
				{error}
			</div>
		{/if}

		{#if isEditing}
			<!-- Edit Form -->
			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Name -->
				<div>
					<label for="name" class="block text-sm font-medium text-secondary mb-2">Name</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						required
						class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
					/>
				</div>

				<!-- Cost & Currency -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="cost" class="block text-sm font-medium text-secondary mb-2">Cost</label>
						<input
							type="number"
							id="cost"
							bind:value={cost}
							required
							min="0"
							step="0.01"
							class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
						/>
					</div>
					<div>
						<label for="currency" class="block text-sm font-medium text-secondary mb-2">Currency</label>
						<select
							id="currency"
							bind:value={currency}
							class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
						>
							<option value="USD">USD</option>
							<option value="EUR">EUR</option>
							<option value="GBP">GBP</option>
							<option value="CAD">CAD</option>
							<option value="AUD">AUD</option>
						</select>
					</div>
				</div>

				<!-- Billing Cycle -->
				<div>
					<label for="billingCycle" class="block text-sm font-medium text-secondary mb-2">Billing Cycle</label>
					<select
						id="billingCycle"
						bind:value={billingCycle}
						class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
					>
						<option value="monthly">Monthly</option>
						<option value="yearly">Yearly</option>
						<option value="weekly">Weekly</option>
						<option value="daily">Daily</option>
					</select>
				</div>

				<!-- Next Billing Date -->
				<div>
					<label for="nextBillingDate" class="block text-sm font-medium text-secondary mb-2">Next Billing Date</label>
					<input
						type="date"
						id="nextBillingDate"
						bind:value={nextBillingDate}
						required
						class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
					/>
				</div>

				<!-- Payment Method -->
				<div>
					<label for="paymentMethod" class="block text-sm font-medium text-secondary mb-2">Payment Method</label>
					{#if paymentMethodsQuery.data && paymentMethodsQuery.data.length > 0}
						<select
							id="paymentMethod"
							bind:value={paymentMethodId}
							required
							class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
						>
							{#each paymentMethodsQuery.data as pm}
								<option value={pm._id}>
									{pm.name}
									{#if pm.lastFourDigits}(*{pm.lastFourDigits}){/if}
								</option>
							{/each}
						</select>
					{/if}
				</div>

				<!-- Category -->
				<div>
					<label for="category" class="block text-sm font-medium text-secondary mb-2">Category</label>
					<select
						id="category"
						bind:value={category}
						required
						class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
					>
						<option value="streaming">Streaming</option>
						<option value="music">Music</option>
						<option value="gaming">Gaming</option>
						<option value="productivity">Productivity</option>
						<option value="news">News</option>
						<option value="fitness">Fitness</option>
						<option value="cloud">Cloud</option>
						<option value="other">Other</option>
					</select>
				</div>

				<!-- Active Toggle -->
				<div class="flex items-center justify-between p-4 bg-surface rounded-xl">
					<div>
						<p class="font-medium text-white">Active</p>
						<p class="text-sm text-secondary">Inactive subscriptions won't show in totals</p>
					</div>
					<button
						type="button"
						onclick={() => (isActive = !isActive)}
						class="relative w-12 h-7 rounded-full transition-colors {isActive ? 'bg-primary' : 'bg-zinc-700'}"
					>
						<span class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform {isActive ? 'translate-x-5' : ''}"></span>
					</button>
				</div>

				<!-- Family Plan Toggle -->
				<div class="flex items-center justify-between p-4 bg-surface rounded-xl">
					<div>
						<p class="font-medium text-white">Family Plan</p>
						<p class="text-sm text-secondary">Track slots and calculate per-person cost</p>
					</div>
					<button
						type="button"
						onclick={() => (isFamilyPlan = !isFamilyPlan)}
						class="relative w-12 h-7 rounded-full transition-colors {isFamilyPlan ? 'bg-primary' : 'bg-zinc-700'}"
					>
						<span class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform {isFamilyPlan ? 'translate-x-5' : ''}"></span>
					</button>
				</div>

				{#if isFamilyPlan}
					<div>
						<label for="maxSlots" class="block text-sm font-medium text-secondary mb-2">Max Slots</label>
						<input
							type="number"
							id="maxSlots"
							bind:value={maxSlots}
							min="1"
							max="20"
							class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
						/>
					</div>
				{/if}

				<!-- Notes -->
				<div>
					<label for="notes" class="block text-sm font-medium text-secondary mb-2">Notes</label>
					<textarea
						id="notes"
						bind:value={notes}
						rows={3}
						class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white placeholder:text-secondary focus:outline-none focus:border-primary transition-colors resize-none"
					></textarea>
				</div>

				<!-- Actions -->
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => (isEditing = false)}
						class="flex-1 py-3 bg-surface hover:bg-surface-elevated text-white font-medium rounded-xl transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:bg-zinc-700 text-black font-medium rounded-xl transition-colors"
					>
						{isSubmitting ? "Saving..." : "Save"}
					</button>
				</div>
			</form>
		{:else}
			<!-- View Mode -->
			<div class="space-y-4">
				<div class="p-4 bg-surface rounded-xl">
					<p class="text-sm text-secondary mb-1">Cost</p>
					<p class="text-2xl font-bold text-white">
						{formatCurrency(subscriptionQuery.data.cost, subscriptionQuery.data.currency)}
						<span class="text-lg text-secondary font-normal">/ {subscriptionQuery.data.billingCycle}</span>
					</p>
				</div>

				<div class="p-4 bg-surface rounded-xl">
					<p class="text-sm text-secondary mb-1">Next Billing</p>
					<p class="text-lg text-white">{formatDate(subscriptionQuery.data.nextBillingDate)}</p>
				</div>

				<div class="p-4 bg-surface rounded-xl">
					<p class="text-sm text-secondary mb-1">Payment Method</p>
					<p class="text-lg text-white">
						{subscriptionQuery.data.paymentMethod?.name ?? "Unknown"}
						{#if subscriptionQuery.data.paymentMethod?.lastFourDigits}
							<span class="text-secondary">(*{subscriptionQuery.data.paymentMethod.lastFourDigits})</span>
						{/if}
					</p>
				</div>

				<div class="p-4 bg-surface rounded-xl">
					<p class="text-sm text-secondary mb-1">Category</p>
					<p class="text-lg text-white capitalize">{subscriptionQuery.data.category}</p>
				</div>

				{#if subscriptionQuery.data.maxSlots}
					<div class="p-4 bg-surface rounded-xl">
						<p class="text-sm text-secondary mb-1">Family Plan</p>
						<p class="text-lg text-white">{subscriptionQuery.data.maxSlots} slots</p>
					</div>
				{/if}

				{#if subscriptionQuery.data.notes}
					<div class="p-4 bg-surface rounded-xl">
						<p class="text-sm text-secondary mb-1">Notes</p>
						<p class="text-white">{subscriptionQuery.data.notes}</p>
					</div>
				{/if}

				<!-- Delete Button -->
				<div class="pt-4 border-t border-zinc-800">
					{#if showDeleteConfirm}
						<div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
							<p class="text-red-400 mb-4">Are you sure you want to delete this subscription? This cannot be undone.</p>
							<div class="flex gap-3">
								<button
									onclick={() => (showDeleteConfirm = false)}
									class="flex-1 py-2 bg-surface hover:bg-surface-elevated text-white font-medium rounded-lg transition-colors"
								>
									Cancel
								</button>
								<button
									onclick={handleDelete}
									disabled={isDeleting}
									class="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
								>
									{isDeleting ? "Deleting..." : "Delete"}
								</button>
							</div>
						</div>
					{:else}
						<button
							onclick={() => (showDeleteConfirm = true)}
							class="w-full py-3 text-red-400 hover:text-red-300 font-medium transition-colors"
						>
							Delete Subscription
						</button>
					{/if}
				</div>
			</div>
		{/if}
	{:else}
		<div class="text-center py-12">
			<p class="text-secondary">Subscription not found</p>
			<button
				onclick={() => goto("/dashboard/subscriptions")}
				class="mt-4 text-primary hover:underline"
			>
				Back to Subscriptions
			</button>
		</div>
	{/if}
</div>
