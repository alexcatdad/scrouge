<script lang="ts">
	import { useQuery, useConvexClient } from "convex-svelte";
	import { api } from "$convex/_generated/api";
	import type { Id } from "$convex/_generated/dataModel";
	import {
		getIsGuestMode,
		getGuestPaymentMethods,
		addPaymentMethod as addGuestPaymentMethod,
		updatePaymentMethod as updateGuestPaymentMethod,
		removePaymentMethod as removeGuestPaymentMethod,
	} from "$lib/guestStore.svelte";

	const client = useConvexClient();

	// Check if in guest mode
	const isGuestMode = $derived(getIsGuestMode());

	// Convex queries (only used when authenticated)
	const paymentMethodsQuery = useQuery(api.paymentMethods.list, {});
	const userQuery = useQuery(api.auth.loggedInUser, {});

	// Guest mode data
	const guestPaymentMethods = $derived(getGuestPaymentMethods());

	// Unified payment methods
	const paymentMethods = $derived(
		isGuestMode
			? guestPaymentMethods.map((pm) => ({
					_id: pm.localId,
					name: pm.name,
					type: pm.type,
					lastFourDigits: pm.lastFourDigits,
					expiryDate: pm.expiryDate,
					isDefault: pm.isDefault,
				}))
			: (paymentMethodsQuery.data ?? []),
	);

	const isLoading = $derived(!isGuestMode && paymentMethodsQuery.isLoading);

	// Add/Edit form state
	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let formName = $state("");
	let formType = $state<
		"credit_card" | "debit_card" | "bank_account" | "paypal" | "other"
	>("credit_card");
	let formLastFour = $state("");
	let formExpiry = $state("");
	let formIsDefault = $state(false);

	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let error = $state("");
	let deleteConfirmId = $state<string | null>(null);

	function resetForm() {
		showForm = false;
		editingId = null;
		formName = "";
		formType = "credit_card";
		formLastFour = "";
		formExpiry = "";
		formIsDefault = false;
		error = "";
	}

	function startEdit(pm: (typeof paymentMethods)[0]) {
		editingId = pm._id;
		formName = pm.name;
		formType = pm.type;
		formLastFour = pm.lastFourDigits ?? "";
		formExpiry = pm.expiryDate ?? "";
		formIsDefault = pm.isDefault;
		showForm = true;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		isSubmitting = true;
		error = "";

		try {
			if (isGuestMode) {
				if (editingId) {
					updateGuestPaymentMethod(editingId, {
						name: formName,
						type: formType,
						lastFourDigits: formLastFour || undefined,
						expiryDate: formExpiry || undefined,
						isDefault: formIsDefault,
					});
				} else {
					addGuestPaymentMethod({
						name: formName,
						type: formType,
						lastFourDigits: formLastFour || undefined,
						expiryDate: formExpiry || undefined,
						isDefault: formIsDefault,
					});
				}
				resetForm();
			} else {
				if (editingId) {
					await client.mutation(api.paymentMethods.update, {
						id: editingId as Id<"paymentMethods">,
						name: formName,
						type: formType,
						lastFourDigits: formLastFour || undefined,
						expiryDate: formExpiry || undefined,
						isDefault: formIsDefault,
					});
				} else {
					await client.mutation(api.paymentMethods.create, {
						name: formName,
						type: formType,
						lastFourDigits: formLastFour || undefined,
						expiryDate: formExpiry || undefined,
						isDefault: formIsDefault,
					});
				}
				resetForm();
			}
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Failed to save payment method";
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete(id: string) {
		isDeleting = true;
		try {
			if (isGuestMode) {
				removeGuestPaymentMethod(id);
				deleteConfirmId = null;
			} else {
				await client.mutation(api.paymentMethods.remove, {
					id: id as Id<"paymentMethods">,
				});
				deleteConfirmId = null;
			}
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Failed to delete payment method";
		} finally {
			isDeleting = false;
		}
	}

	function getTypeLabel(type: string): string {
		switch (type) {
			case "credit_card":
				return "Credit Card";
			case "debit_card":
				return "Debit Card";
			case "bank_account":
				return "Bank Account";
			case "paypal":
				return "PayPal";
			default:
				return "Other";
		}
	}

	function getTypeIcon(type: string): string {
		switch (type) {
			case "credit_card":
			case "debit_card":
				return "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z";
			case "bank_account":
				return "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4";
			case "paypal":
				return "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
			default:
				return "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z";
		}
	}
</script>

<div class="space-y-6 max-w-lg mx-auto">
	<h1 class="text-2xl font-bold text-white">Settings</h1>

	<!-- Account Section -->
	<div class="space-y-3">
		<h2 class="text-sm font-medium text-secondary uppercase tracking-wider">
			Account
		</h2>
		<div class="p-4 bg-surface rounded-xl">
			<div class="flex items-center gap-4">
				<div
					class="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center"
				>
					<span class="text-xl font-bold text-primary">
						{#if isGuestMode}
							G
						{:else}
							{(userQuery.data?.name ?? userQuery.data?.email ?? "U")
								.charAt(0)
								.toUpperCase()}
						{/if}
					</span>
				</div>
				<div>
					{#if isGuestMode}
						<p class="font-medium text-white">Guest User</p>
						<p class="text-sm text-secondary">Data stored locally</p>
					{:else}
						{#if userQuery.data?.name}
							<p class="font-medium text-white">{userQuery.data.name}</p>
						{/if}
						{#if userQuery.data?.email}
							<p class="text-sm text-secondary">{userQuery.data.email}</p>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Payment Methods Section -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-medium text-secondary uppercase tracking-wider">
				Payment Methods
			</h2>
			{#if !showForm}
				<button
					onclick={() => (showForm = true)}
					class="text-sm text-primary hover:text-primary-hover font-medium transition-colors"
				>
					+ Add
				</button>
			{/if}
		</div>

		{#if error && !showForm}
			<div
				class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
			>
				{error}
			</div>
		{/if}

		{#if showForm}
			<form onsubmit={handleSubmit} class="p-4 bg-surface rounded-xl space-y-4">
				<h3 class="font-medium text-white">
					{editingId ? "Edit Payment Method" : "Add Payment Method"}
				</h3>

				{#if error}
					<div
						class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
					>
						{error}
					</div>
				{/if}

				<div>
					<label for="name" class="block text-sm text-secondary mb-1">Name</label>
					<input
						type="text"
						id="name"
						bind:value={formName}
						required
						placeholder="e.g., Chase Sapphire"
						class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors"
					/>
				</div>

				<div>
					<label for="type" class="block text-sm text-secondary mb-1">Type</label>
					<select
						id="type"
						bind:value={formType}
						class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
					>
						<option value="credit_card">Credit Card</option>
						<option value="debit_card">Debit Card</option>
						<option value="bank_account">Bank Account</option>
						<option value="paypal">PayPal</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="lastFour" class="block text-sm text-secondary mb-1"
							>Last 4 Digits</label
						>
						<input
							type="text"
							id="lastFour"
							bind:value={formLastFour}
							maxlength={4}
							placeholder="1234"
							class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors"
						/>
					</div>
					<div>
						<label for="expiry" class="block text-sm text-secondary mb-1"
							>Expiry</label
						>
						<input
							type="text"
							id="expiry"
							bind:value={formExpiry}
							placeholder="MM/YY"
							class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors"
						/>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={() => (formIsDefault = !formIsDefault)}
						class="relative w-10 h-6 rounded-full transition-colors {formIsDefault
							? 'bg-primary'
							: 'bg-zinc-700'}"
					>
						<span
							class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform {formIsDefault
								? 'translate-x-4'
								: ''}"
						></span>
					</button>
					<span class="text-sm text-white">Set as default</span>
				</div>

				<div class="flex gap-3 pt-2">
					<button
						type="button"
						onclick={resetForm}
						class="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex-1 py-2 bg-primary hover:bg-primary-hover disabled:bg-zinc-700 text-black font-medium rounded-lg transition-colors"
					>
						{isSubmitting ? "Saving..." : "Save"}
					</button>
				</div>
			</form>
		{/if}

		{#if isLoading}
			<div class="space-y-2">
				{#each [1, 2] as _}
					<div class="p-4 bg-surface rounded-xl animate-pulse h-16"></div>
				{/each}
			</div>
		{:else if paymentMethods && paymentMethods.length > 0}
			<div class="space-y-2">
				{#each paymentMethods as pm}
					<div class="p-4 bg-surface rounded-xl">
						{#if deleteConfirmId === pm._id}
							<div class="space-y-3">
								<p class="text-sm text-red-400">Delete this payment method?</p>
								<div class="flex gap-2">
									<button
										onclick={() => (deleteConfirmId = null)}
										class="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
									>
										Cancel
									</button>
									<button
										onclick={() => handleDelete(pm._id)}
										disabled={isDeleting}
										class="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
									>
										{isDeleting ? "..." : "Delete"}
									</button>
								</div>
							</div>
						{:else}
							<div class="flex items-center gap-3">
								<div
									class="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0"
								>
									<svg
										class="w-5 h-5 text-secondary"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d={getTypeIcon(pm.type)}
										/>
									</svg>
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<p class="font-medium text-white truncate">{pm.name}</p>
										{#if pm.isDefault}
											<span
												class="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded"
												>Default</span
											>
										{/if}
									</div>
									<p class="text-sm text-secondary">
										{getTypeLabel(pm.type)}
										{#if pm.lastFourDigits}
											&bull; *{pm.lastFourDigits}
										{/if}
										{#if pm.expiryDate}
											&bull; {pm.expiryDate}
										{/if}
									</p>
								</div>
								<div class="flex gap-1 flex-shrink-0">
									<button
										onclick={() => startEdit(pm)}
										class="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
										aria-label="Edit payment method"
									>
										<svg
											class="w-4 h-4 text-secondary"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
											/>
										</svg>
									</button>
									<button
										onclick={() => (deleteConfirmId = pm._id)}
										class="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
										aria-label="Delete payment method"
									>
										<svg
											class="w-4 h-4 text-red-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else if !showForm}
			<div class="p-6 bg-surface rounded-xl text-center">
				<p class="text-secondary text-sm mb-3">No payment methods yet</p>
				<button
					onclick={() => (showForm = true)}
					class="text-primary text-sm font-medium hover:underline"
				>
					Add your first payment method
				</button>
			</div>
		{/if}
	</div>
</div>
