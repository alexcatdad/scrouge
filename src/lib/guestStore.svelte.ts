/**
 * Svelte 5 runes store for guest mode
 * Provides reactive state management for guest subscriptions and payment methods
 */

import {
	type GuestSubscription,
	type GuestPaymentMethod,
	type GuestData,
	getGuestData,
	saveGuestData,
	clearGuestData as clearStorage,
	generateLocalId,
	initGuestData,
	hasGuestData,
} from "./guestStorage";

// Re-export hasGuestData for convenience
export { hasGuestData };

// Reactive state using Svelte 5 runes
let isGuestMode = $state(false);
let guestSubscriptions = $state<GuestSubscription[]>([]);
let guestPaymentMethods = $state<GuestPaymentMethod[]>([]);
let initialized = $state(false);

/**
 * Initialize guest store from localStorage
 * Should be called on mount in the root layout
 */
export function initGuestStore(): void {
	if (typeof window === "undefined") return;

	const data = getGuestData();
	if (data) {
		isGuestMode = data.isGuestMode;
		guestSubscriptions = data.subscriptions;
		guestPaymentMethods = data.paymentMethods;
	}
	initialized = true;
}

/**
 * Enable guest mode and initialize empty data
 */
export function enableGuestMode(): void {
	const data = initGuestData();
	isGuestMode = true;
	guestSubscriptions = data.subscriptions;
	guestPaymentMethods = data.paymentMethods;
}

/**
 * Disable guest mode and clear all data
 */
export function disableGuestMode(): void {
	clearStorage();
	isGuestMode = false;
	guestSubscriptions = [];
	guestPaymentMethods = [];
}

/**
 * Sync current state to localStorage
 */
function syncToStorage(): void {
	if (!isGuestMode) return;

	const data: GuestData = {
		subscriptions: guestSubscriptions,
		paymentMethods: guestPaymentMethods,
		isGuestMode: true,
		createdAt: getGuestData()?.createdAt ?? Date.now(),
	};
	saveGuestData(data);
}

// ----- Payment Method Operations -----

export function addPaymentMethod(
	pm: Omit<GuestPaymentMethod, "localId">,
): GuestPaymentMethod {
	const newPm: GuestPaymentMethod = {
		...pm,
		localId: generateLocalId(),
	};

	// If this is default, unset other defaults
	if (newPm.isDefault) {
		guestPaymentMethods = guestPaymentMethods.map((p) => ({
			...p,
			isDefault: false,
		}));
	}

	// If this is the first payment method, make it default
	if (guestPaymentMethods.length === 0) {
		newPm.isDefault = true;
	}

	guestPaymentMethods = [...guestPaymentMethods, newPm];
	syncToStorage();
	return newPm;
}

export function updatePaymentMethod(
	localId: string,
	updates: Partial<Omit<GuestPaymentMethod, "localId">>,
): void {
	// If setting as default, unset other defaults
	if (updates.isDefault) {
		guestPaymentMethods = guestPaymentMethods.map((p) => ({
			...p,
			isDefault: p.localId === localId,
		}));
	} else {
		guestPaymentMethods = guestPaymentMethods.map((p) =>
			p.localId === localId ? { ...p, ...updates } : p,
		);
	}
	syncToStorage();
}

export function removePaymentMethod(localId: string): void {
	const wasDefault = guestPaymentMethods.find(
		(p) => p.localId === localId,
	)?.isDefault;
	guestPaymentMethods = guestPaymentMethods.filter((p) => p.localId !== localId);

	// If we removed the default, make the first one default
	if (wasDefault && guestPaymentMethods.length > 0) {
		guestPaymentMethods = guestPaymentMethods.map((p, i) => ({
			...p,
			isDefault: i === 0,
		}));
	}

	syncToStorage();
}

// ----- Subscription Operations -----

export function addSubscription(
	sub: Omit<GuestSubscription, "localId">,
): GuestSubscription {
	const newSub: GuestSubscription = {
		...sub,
		localId: generateLocalId(),
	};
	guestSubscriptions = [...guestSubscriptions, newSub];
	syncToStorage();
	return newSub;
}

export function updateSubscription(
	localId: string,
	updates: Partial<Omit<GuestSubscription, "localId">>,
): void {
	guestSubscriptions = guestSubscriptions.map((s) =>
		s.localId === localId ? { ...s, ...updates } : s,
	);
	syncToStorage();
}

export function removeSubscription(localId: string): void {
	guestSubscriptions = guestSubscriptions.filter((s) => s.localId !== localId);
	syncToStorage();
}

// ----- Computed Values -----

export function getActiveSubscriptions(): GuestSubscription[] {
	return guestSubscriptions.filter((s) => s.isActive);
}

export function getUpcomingSubscriptions(days: number = 7): GuestSubscription[] {
	const cutoff = Date.now() + days * 24 * 60 * 60 * 1000;
	return guestSubscriptions
		.filter((s) => s.isActive && s.nextBillingDate <= cutoff)
		.sort((a, b) => a.nextBillingDate - b.nextBillingDate);
}

export function getTotalMonthlyCost(): Record<string, number> {
	const totals: Record<string, number> = {};

	for (const sub of guestSubscriptions.filter((s) => s.isActive)) {
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

		totals[sub.currency] = (totals[sub.currency] ?? 0) + monthlyCost;
	}

	return totals;
}

export function getDefaultPaymentMethod(): GuestPaymentMethod | undefined {
	return guestPaymentMethods.find((p) => p.isDefault);
}

export function getPaymentMethodById(
	localId: string,
): GuestPaymentMethod | undefined {
	return guestPaymentMethods.find((p) => p.localId === localId);
}

export function getSubscriptionById(
	localId: string,
): GuestSubscription | undefined {
	return guestSubscriptions.find((s) => s.localId === localId);
}

// ----- Export getters for reactive access -----

export function getIsGuestMode(): boolean {
	return isGuestMode;
}

export function getGuestSubscriptions(): GuestSubscription[] {
	return guestSubscriptions;
}

export function getGuestPaymentMethods(): GuestPaymentMethod[] {
	return guestPaymentMethods;
}

export function getIsInitialized(): boolean {
	return initialized;
}

/**
 * Get all guest data for migration
 */
export function getAllGuestDataForMigration(): {
	subscriptions: GuestSubscription[];
	paymentMethods: GuestPaymentMethod[];
} {
	return {
		subscriptions: [...guestSubscriptions],
		paymentMethods: [...guestPaymentMethods],
	};
}
