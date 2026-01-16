<script lang="ts">
	import { useQuery, useConvexClient } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import { goto } from "$app/navigation";
	import { onMount, getContext } from "svelte";
	import type { Id } from "$convex/_generated/dataModel";

	// Get wizard context from layout
	const wizard = getContext<{ step: number; setStep: (step: number) => void }>("wizard");

	const client = useConvexClient();

	// Queries
	const templatesQuery = useQuery(api.templates.search, { query: "" });
	const paymentMethodsQuery = useQuery(api.paymentMethods.list, {});

	// Wizard state
	let searchQuery = $state("");
	let selectedCategory = $state<string | null>(null);

	// Selected templates storage
	type SelectedTemplate = {
		templateId: string;
		name: string;
		cost: number;
		currency: string;
		billingCycle: "monthly" | "yearly" | "weekly" | "daily";
		nextBillingDate: string;
		paymentMethodId: Id<"paymentMethods"> | "";
		category: string;
		website?: string;
	};

	let selectedTemplates = $state<Map<string, SelectedTemplate>>(new Map());
	let isSubmitting = $state(false);
	let error = $state("");

	// Success state
	let successData = $state<{ count: number; total: number } | null>(null);

	// Restore prompt state
	let showRestorePrompt = $state(false);
	let savedStateToRestore = $state<{
		selectedTemplates: [string, SelectedTemplate][];
		currentStep: number;
	} | null>(null);

	// Inline payment method creation
	let showPaymentMethodForm = $state(false);
	let newPaymentMethodName = $state("");
	let newPaymentMethodType = $state<"credit_card" | "debit_card" | "bank_account" | "paypal" | "other">("credit_card");
	let isCreatingPaymentMethod = $state(false);

	// LocalStorage key for persistence
	const STORAGE_KEY = "scrouge_wizard_state";
	const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

	const categories = [
		{ id: null, label: "All" },
		{ id: "streaming", label: "Streaming" },
		{ id: "music", label: "Music" },
		{ id: "gaming", label: "Gaming" },
		{ id: "productivity", label: "Productivity" },
		{ id: "news", label: "News" },
		{ id: "fitness", label: "Fitness" },
		{ id: "cloud", label: "Cloud" },
		{ id: "other", label: "Other" },
	];

	// Filter templates by category on client side
	const filteredTemplates = $derived(() => {
		if (!templatesQuery.data) return [];
		let templates = templatesQuery.data;
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			templates = templates.filter((t) => t.name.toLowerCase().includes(query));
		}
		if (selectedCategory) {
			templates = templates.filter((t) => t.category === selectedCategory);
		}
		return templates;
	});

	// Selected count
	const selectedCount = $derived(selectedTemplates.size);

	// Calculate total monthly cost
	const totalMonthlyCost = $derived(() => {
		let total = 0;
		for (const sub of selectedTemplates.values()) {
			let monthlyCost = sub.cost;
			switch (sub.billingCycle) {
				case "yearly":
					monthlyCost = sub.cost / 12;
					break;
				case "weekly":
					monthlyCost = sub.cost * 4.33;
					break;
				case "daily":
					monthlyCost = sub.cost * 30;
					break;
			}
			total += monthlyCost;
		}
		return total;
	});

	// Get default payment method ID
	const defaultPaymentMethodId = $derived(() => {
		if (!paymentMethodsQuery.data || paymentMethodsQuery.data.length === 0) return "";
		const defaultMethod = paymentMethodsQuery.data.find((pm) => pm.isDefault);
		return defaultMethod?._id ?? paymentMethodsQuery.data[0]._id;
	});

	// Load persisted state on mount
	onMount(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const { timestamp, data } = JSON.parse(stored);
				if (Date.now() - timestamp < STORAGE_EXPIRY_MS && data.selectedTemplates && data.selectedTemplates.length > 0) {
					// Show restore prompt instead of silently restoring
					savedStateToRestore = data;
					showRestorePrompt = true;
				} else {
					// Expired or empty - clear it
					localStorage.removeItem(STORAGE_KEY);
				}
			} catch {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	});

	function handleRestoreState() {
		if (savedStateToRestore) {
			selectedTemplates = new Map(savedStateToRestore.selectedTemplates);
			wizard?.setStep(savedStateToRestore.currentStep || 1);
		}
		showRestorePrompt = false;
		savedStateToRestore = null;
	}

	function handleStartFresh() {
		localStorage.removeItem(STORAGE_KEY);
		showRestorePrompt = false;
		savedStateToRestore = null;
	}

	// Persist state changes
	$effect(() => {
		if (selectedTemplates.size > 0) {
			const data = {
				selectedTemplates: Array.from(selectedTemplates.entries()),
				currentStep: wizard?.step ?? 1,
			};
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					timestamp: Date.now(),
					data,
				})
			);
		}
	});

	function getIconUrl(website: string | undefined): string {
		if (!website) return "";
		return `https://logo.clearbit.com/${website}`;
	}

	function toggleTemplate(template: {
		_id: Id<"serviceTemplates">;
		name: string;
		category: string;
		website?: string;
		defaultPrice?: number;
		defaultCurrency?: string;
		defaultBillingCycle?: string;
	}) {
		const id = template._id;
		if (selectedTemplates.has(id)) {
			selectedTemplates.delete(id);
			selectedTemplates = new Map(selectedTemplates);
		} else {
			// Get default next billing date (1 month from now)
			const nextDate = new Date();
			nextDate.setMonth(nextDate.getMonth() + 1);
			const nextBillingDate = nextDate.toISOString().split("T")[0];

			selectedTemplates.set(id, {
				templateId: id,
				name: template.name,
				cost: template.defaultPrice ?? 9.99,
				currency: template.defaultCurrency ?? "USD",
				billingCycle: (template.defaultBillingCycle as "monthly" | "yearly" | "weekly" | "daily") ?? "monthly",
				nextBillingDate,
				paymentMethodId: defaultPaymentMethodId() as Id<"paymentMethods"> | "",
				category: template.category,
				website: template.website,
			});
			selectedTemplates = new Map(selectedTemplates);
		}
	}

	function updateSubscriptionField<K extends keyof SelectedTemplate>(
		templateId: string,
		field: K,
		value: SelectedTemplate[K]
	) {
		const sub = selectedTemplates.get(templateId);
		if (sub) {
			sub[field] = value;
			selectedTemplates = new Map(selectedTemplates);
		}
	}

	function removeSubscription(templateId: string) {
		selectedTemplates.delete(templateId);
		selectedTemplates = new Map(selectedTemplates);
	}

	async function createPaymentMethod() {
		if (!newPaymentMethodName.trim()) return;

		isCreatingPaymentMethod = true;
		try {
			const newId = await client.mutation(api.paymentMethods.create, {
				name: newPaymentMethodName,
				type: newPaymentMethodType,
				isDefault: true,
			});

			// Update all subscriptions to use this new payment method
			for (const [, sub] of selectedTemplates) {
				sub.paymentMethodId = newId;
			}
			selectedTemplates = new Map(selectedTemplates);

			showPaymentMethodForm = false;
			newPaymentMethodName = "";
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to create payment method";
		} finally {
			isCreatingPaymentMethod = false;
		}
	}

	async function handleSubmit() {
		// Validate all subscriptions have payment methods
		for (const sub of selectedTemplates.values()) {
			if (!sub.paymentMethodId) {
				error = "Please select a payment method for all subscriptions";
				return;
			}
		}

		isSubmitting = true;
		error = "";

		try {
			const subscriptions = Array.from(selectedTemplates.values()).map((sub) => ({
				name: sub.name,
				cost: sub.cost,
				currency: sub.currency,
				billingCycle: sub.billingCycle,
				nextBillingDate: new Date(sub.nextBillingDate).getTime(),
				paymentMethodId: sub.paymentMethodId as Id<"paymentMethods">,
				category: sub.category,
				website: sub.website,
			}));

			const result = await client.mutation(api.subscriptions.batchCreate, { subscriptions });

			// Success!
			successData = {
				count: result.created,
				total: Math.round(totalMonthlyCost() * 100) / 100,
			};
			wizard?.setStep(3);

			// Clear persisted state
			localStorage.removeItem(STORAGE_KEY);
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to create subscriptions";
		} finally {
			isSubmitting = false;
		}
	}

	function goToStep(step: number) {
		wizard?.setStep(step);
	}
</script>

<div class="space-y-6">
	<!-- Restore Session Prompt Modal -->
	{#if showRestorePrompt}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div class="bg-surface border border-zinc-700 rounded-2xl p-6 max-w-md mx-4 shadow-xl">
				<h2 class="text-xl font-bold text-white mb-2">Continue where you left off?</h2>
				<p class="text-secondary mb-6">
					You have a previous session in progress. Would you like to continue where you left off?
				</p>
				<div class="flex gap-3">
					<button
						onclick={handleStartFresh}
						class="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-xl transition-colors"
					>
						Start Fresh
					</button>
					<button
						onclick={handleRestoreState}
						class="flex-1 py-3 bg-primary hover:bg-primary-hover text-black font-medium rounded-xl transition-colors"
					>
						Continue
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if wizard?.step === 1}
		<!-- Step 1: Select Services -->
		<div class="space-y-4">
			<!-- Search -->
			<div class="relative">
				<svg
					class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search services..."
					class="w-full pl-12 pr-4 py-3 bg-surface border border-zinc-700 rounded-xl text-white placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
				/>
			</div>

			<!-- Category Tabs -->
			<div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
				{#each categories as category}
					<button
						onclick={() => {
							selectedCategory = category.id;
						}}
						class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors {selectedCategory ===
						category.id
							? 'bg-primary text-black'
							: 'bg-surface text-secondary hover:text-white'}"
					>
						{category.label}
					</button>
				{/each}
			</div>

			<!-- Template Grid -->
			{#if templatesQuery.isLoading}
				<div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
					{#each Array(12) as _}
						<div class="aspect-square bg-surface rounded-xl animate-pulse"></div>
					{/each}
				</div>
			{:else if filteredTemplates().length > 0}
				<div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
					{#each filteredTemplates() as template}
						{@const isSelected = selectedTemplates.has(template._id)}
						<button
							onclick={() => toggleTemplate(template)}
							class="aspect-square rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all relative
								{isSelected
								? 'bg-primary/20 border-2 border-primary'
								: 'bg-surface hover:bg-surface-elevated border-2 border-transparent'}"
						>
							{#if isSelected}
								<div
									class="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
								>
									<svg class="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
									</svg>
								</div>
							{/if}
							<div
								class="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden"
							>
								{#if template.website}
									<img
										src={getIconUrl(template.website)}
										alt=""
										class="w-10 h-10 object-contain"
										onerror={(e) => {
											const target = e.target as HTMLImageElement;
											target.style.display = "none";
										}}
									/>
								{/if}
								<span class="text-xl font-bold text-primary">
									{template.name.charAt(0).toUpperCase()}
								</span>
							</div>
							<span class="text-xs text-center text-secondary line-clamp-2">
								{template.name}
							</span>
						</button>
					{/each}
				</div>
			{:else}
				<div class="text-center py-12">
					<p class="text-secondary">No services found</p>
				</div>
			{/if}
		</div>

		<!-- Bottom Action Bar -->
		<div class="fixed bottom-0 left-0 right-0 bg-surface border-t border-zinc-800 p-4 safe-area-inset-bottom">
			<div class="max-w-2xl mx-auto flex items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<button onclick={() => goto("/dashboard")} class="text-secondary hover:text-white text-sm transition-colors">
						Skip
					</button>
					{#if selectedCount > 0}
						<span class="text-white font-medium">{selectedCount} selected</span>
					{/if}
				</div>
				<button
					onclick={() => goToStep(2)}
					disabled={selectedCount === 0}
					class="px-6 py-3 bg-primary hover:bg-primary-hover disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-medium rounded-xl transition-colors"
				>
					Continue
				</button>
			</div>
		</div>
	{:else if wizard?.step === 2}
		<!-- Step 2: Confirm Details -->
		<div class="space-y-4">
			<button
				onclick={() => goToStep(1)}
				class="flex items-center gap-2 text-secondary hover:text-white transition-colors"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back to selection
			</button>

			{#if error}
				<div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
					{error}
				</div>
			{/if}

			<!-- Payment Method Check -->
			{#if paymentMethodsQuery.data && paymentMethodsQuery.data.length === 0 && !showPaymentMethodForm}
				<div class="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
					<p class="text-yellow-400 text-sm mb-3">You need a payment method to track subscriptions</p>
					<button
						onclick={() => (showPaymentMethodForm = true)}
						class="text-primary text-sm font-medium hover:underline"
					>
						Add Payment Method
					</button>
				</div>
			{/if}

			<!-- Inline Payment Method Form -->
			{#if showPaymentMethodForm}
				<div class="p-4 bg-surface border border-zinc-700 rounded-xl space-y-4">
					<h3 class="font-medium text-white">Add Payment Method</h3>
					<div>
						<label for="pmName" class="block text-sm text-secondary mb-2">Name</label>
						<input
							type="text"
							id="pmName"
							bind:value={newPaymentMethodName}
							placeholder="e.g., Main Credit Card"
							class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
						/>
					</div>
					<div>
						<label for="pmType" class="block text-sm text-secondary mb-2">Type</label>
						<select
							id="pmType"
							bind:value={newPaymentMethodType}
							class="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
						>
							<option value="credit_card">Credit Card</option>
							<option value="debit_card">Debit Card</option>
							<option value="bank_account">Bank Account</option>
							<option value="paypal">PayPal</option>
							<option value="other">Other</option>
						</select>
					</div>
					<div class="flex gap-3">
						<button
							onclick={() => (showPaymentMethodForm = false)}
							class="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-xl transition-colors"
						>
							Cancel
						</button>
						<button
							onclick={createPaymentMethod}
							disabled={!newPaymentMethodName.trim() || isCreatingPaymentMethod}
							class="flex-1 py-3 bg-primary hover:bg-primary-hover disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-medium rounded-xl transition-colors"
						>
							{isCreatingPaymentMethod ? "Creating..." : "Create"}
						</button>
					</div>
				</div>
			{/if}

			<!-- Subscription Cards -->
			<div class="space-y-3">
				{#each Array.from(selectedTemplates.entries()) as [templateId, sub]}
					<details class="bg-surface rounded-xl overflow-hidden group" open>
						<summary
							class="p-4 cursor-pointer list-none flex items-center justify-between hover:bg-surface-elevated transition-colors"
						>
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
									{#if sub.website}
										<img
											src={getIconUrl(sub.website)}
											alt=""
											class="w-8 h-8 object-contain"
											onerror={(e) => {
												const target = e.target as HTMLImageElement;
												target.style.display = "none";
											}}
										/>
									{/if}
									<span class="text-lg font-bold text-primary">
										{sub.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<div>
									<p class="font-medium text-white">{sub.name}</p>
									<p class="text-sm text-secondary">
										{sub.currency} {sub.cost.toFixed(2)}/{sub.billingCycle}
									</p>
								</div>
							</div>
							<svg
								class="w-5 h-5 text-secondary transition-transform group-open:rotate-180"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</summary>

						<div class="px-4 pb-4 space-y-4 border-t border-zinc-700">
							<div class="pt-4 grid grid-cols-2 gap-4">
								<!-- Cost -->
								<div>
									<label class="block text-sm text-secondary mb-2">Cost</label>
									<input
										type="number"
										value={sub.cost}
										onchange={(e) =>
											updateSubscriptionField(templateId, "cost", parseFloat(e.currentTarget.value) || 0)}
										min="0"
										step="0.01"
										class="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
									/>
								</div>

								<!-- Currency -->
								<div>
									<label class="block text-sm text-secondary mb-2">Currency</label>
									<select
										value={sub.currency}
										onchange={(e) => updateSubscriptionField(templateId, "currency", e.currentTarget.value)}
										class="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
									>
										<option value="USD">USD</option>
										<option value="EUR">EUR</option>
										<option value="GBP">GBP</option>
										<option value="CAD">CAD</option>
										<option value="AUD">AUD</option>
									</select>
								</div>

								<!-- Billing Cycle -->
								<div>
									<label class="block text-sm text-secondary mb-2">Billing Cycle</label>
									<select
										value={sub.billingCycle}
										onchange={(e) =>
											updateSubscriptionField(
												templateId,
												"billingCycle",
												e.currentTarget.value as "monthly" | "yearly" | "weekly" | "daily"
											)}
										class="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
									>
										<option value="monthly">Monthly</option>
										<option value="yearly">Yearly</option>
										<option value="weekly">Weekly</option>
										<option value="daily">Daily</option>
									</select>
								</div>

								<!-- Next Billing Date -->
								<div>
									<label class="block text-sm text-secondary mb-2">Next Billing Date</label>
									<input
										type="date"
										value={sub.nextBillingDate}
										onchange={(e) =>
											updateSubscriptionField(templateId, "nextBillingDate", e.currentTarget.value)}
										class="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
									/>
								</div>
							</div>

							<!-- Payment Method -->
							<div>
								<label class="block text-sm text-secondary mb-2">Payment Method</label>
								{#if paymentMethodsQuery.data && paymentMethodsQuery.data.length > 0}
									<select
										value={sub.paymentMethodId}
										onchange={(e) =>
											updateSubscriptionField(
												templateId,
												"paymentMethodId",
												e.currentTarget.value as Id<"paymentMethods">
											)}
										class="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
									>
										{#each paymentMethodsQuery.data as pm}
											<option value={pm._id}>
												{pm.name}
												{#if pm.lastFourDigits}(*{pm.lastFourDigits}){/if}
											</option>
										{/each}
									</select>
								{:else}
									<p class="text-sm text-secondary">No payment methods - create one above</p>
								{/if}
							</div>

							<!-- Remove button -->
							<button
								onclick={() => removeSubscription(templateId)}
								class="text-red-400 text-sm hover:text-red-300 transition-colors"
							>
								Remove
							</button>
						</div>
					</details>
				{/each}
			</div>

			<!-- Total Summary -->
			<div class="p-4 bg-surface-elevated rounded-xl">
				<div class="flex items-center justify-between">
					<span class="text-secondary">Estimated monthly total</span>
					<span class="text-xl font-bold text-white">${totalMonthlyCost().toFixed(2)}/mo</span>
				</div>
			</div>
		</div>

		<!-- Bottom Action Bar -->
		<div class="fixed bottom-0 left-0 right-0 bg-surface border-t border-zinc-800 p-4 safe-area-inset-bottom">
			<div class="max-w-2xl mx-auto">
				<button
					onclick={handleSubmit}
					disabled={isSubmitting || selectedTemplates.size === 0 || (paymentMethodsQuery.data?.length === 0)}
					class="w-full py-4 bg-primary hover:bg-primary-hover disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-medium rounded-xl transition-colors"
				>
					{#if isSubmitting}
						Adding subscriptions...
					{:else}
						Add {selectedTemplates.size} subscription{selectedTemplates.size !== 1 ? "s" : ""}
					{/if}
				</button>
			</div>
		</div>
	{:else if wizard?.step === 3}
		<!-- Step 3: Success -->
		<div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
			<!-- Success Icon -->
			<div class="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
				<svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>

			<div class="space-y-2">
				<h2 class="text-2xl font-bold text-white">You're all set!</h2>
				{#if successData}
					<p class="text-secondary">
						Added {successData.count} subscription{successData.count !== 1 ? "s" : ""} totaling ${successData.total.toFixed(2)}/mo
					</p>
				{/if}
			</div>

			<button
				onclick={() => goto("/dashboard")}
				class="px-8 py-4 bg-primary hover:bg-primary-hover text-black font-medium rounded-xl transition-colors"
			>
				Go to Dashboard
			</button>
		</div>
	{/if}
</div>

<style>
	/* Add padding at bottom to account for fixed action bar */
	:global(main) {
		padding-bottom: 100px !important;
	}
</style>
