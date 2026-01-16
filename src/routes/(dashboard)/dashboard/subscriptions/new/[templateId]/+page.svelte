<script lang="ts">
	import { page } from "$app/stores";
	import { useQuery, useConvexClient } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import type { Id } from "$convex/_generated/dataModel";

	const client = useConvexClient();
	const templateId = $derived($page.params.templateId as Id<"serviceTemplates">);

	const templateQuery = useQuery(api.templates.get, { id: templateId });
	const paymentMethodsQuery = useQuery(api.paymentMethods.list, {});

	// Form state
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

	let isSubmitting = $state(false);
	let error = $state("");

	// Populate form when template loads
	$effect(() => {
		if (templateQuery.data) {
			name = templateQuery.data.name;
			cost = templateQuery.data.defaultPrice ?? 0;
			currency = templateQuery.data.defaultCurrency ?? "USD";
			billingCycle = (templateQuery.data.defaultBillingCycle as typeof billingCycle) ?? "monthly";
			category = templateQuery.data.category;
			website = templateQuery.data.website ?? "";
		}
	});

	// Set default payment method
	$effect(() => {
		if (paymentMethodsQuery.data && !paymentMethodId) {
			const defaultMethod = paymentMethodsQuery.data.find((pm) => pm.isDefault);
			if (defaultMethod) {
				paymentMethodId = defaultMethod._id;
			} else if (paymentMethodsQuery.data.length > 0) {
				paymentMethodId = paymentMethodsQuery.data[0]._id;
			}
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
			await client.mutation(api.subscriptions.create, {
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
			});
			goto("/dashboard/subscriptions");
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to create subscription";
		} finally {
			isSubmitting = false;
		}
	}

	function getIconUrl(website: string | undefined): string {
		if (!website) return "";
		return `https://logo.clearbit.com/${website}`;
	}
</script>

<div class="space-y-6 max-w-lg mx-auto">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<button onclick={() => goto("/dashboard/subscriptions/new")} class="p-2 -ml-2 hover:bg-surface rounded-lg transition-colors">
			<svg class="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		{#if templateQuery.data}
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-surface rounded-lg flex items-center justify-center overflow-hidden">
					{#if templateQuery.data.website}
						<img
							src={getIconUrl(templateQuery.data.website)}
							alt=""
							class="w-8 h-8 object-contain"
							onerror={(e) => {
								const target = e.target as HTMLImageElement;
								target.style.display = "none";
							}}
						/>
					{/if}
					<span class="text-lg font-bold text-primary">
						{templateQuery.data.name.charAt(0).toUpperCase()}
					</span>
				</div>
				<h1 class="text-xl font-bold text-white">{templateQuery.data.name}</h1>
			</div>
		{:else}
			<h1 class="text-xl font-bold text-white">Add Subscription</h1>
		{/if}
	</div>

	{#if error}
		<div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
			{error}
		</div>
	{/if}

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
					class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
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
							{#if pm.lastFourDigits}
								(*{pm.lastFourDigits})
							{/if}
						</option>
					{/each}
				</select>
			{:else}
				<div class="p-4 bg-surface border border-zinc-700 rounded-xl">
					<p class="text-secondary text-sm mb-3">No payment methods yet</p>
					<button
						type="button"
						onclick={() => goto("/dashboard/settings")}
						class="text-primary text-sm font-medium hover:underline"
					>
						Add Payment Method
					</button>
				</div>
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
					placeholder="e.g., 5"
					class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
				/>
			</div>
		{/if}

		<!-- Notes -->
		<div>
			<label for="notes" class="block text-sm font-medium text-secondary mb-2">Notes (optional)</label>
			<textarea
				id="notes"
				bind:value={notes}
				rows={3}
				placeholder="Any additional notes..."
				class="w-full px-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white placeholder:text-secondary focus:outline-none focus:border-primary transition-colors resize-none"
			></textarea>
		</div>

		<!-- Submit -->
		<button
			type="submit"
			disabled={isSubmitting || !paymentMethodId}
			class="w-full py-4 bg-primary hover:bg-primary-hover disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-medium rounded-xl transition-colors"
		>
			{#if isSubmitting}
				Adding...
			{:else}
				Add Subscription
			{/if}
		</button>
	</form>
</div>
