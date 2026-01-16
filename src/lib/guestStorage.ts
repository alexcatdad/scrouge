/**
 * Guest mode localStorage utilities
 * Allows users to try the app without signing up
 */

export interface GuestSubscription {
	localId: string;
	name: string;
	cost: number;
	currency: string;
	billingCycle: "monthly" | "yearly" | "weekly" | "daily";
	nextBillingDate: number;
	paymentMethodLocalId: string;
	category: string;
	website?: string;
	isActive: boolean;
	notes?: string;
	maxSlots?: number;
}

export interface GuestPaymentMethod {
	localId: string;
	name: string;
	type: "credit_card" | "debit_card" | "bank_account" | "paypal" | "other";
	lastFourDigits?: string;
	expiryDate?: string;
	isDefault: boolean;
}

export interface GuestData {
	subscriptions: GuestSubscription[];
	paymentMethods: GuestPaymentMethod[];
	isGuestMode: boolean;
	createdAt: number;
}

const GUEST_DATA_KEY = "scrouge_guest_data";

/**
 * Generate a unique local ID for guest data items
 */
export function generateLocalId(): string {
	return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get guest data from localStorage
 */
export function getGuestData(): GuestData | null {
	if (typeof window === "undefined") return null;

	try {
		const data = localStorage.getItem(GUEST_DATA_KEY);
		if (!data) return null;
		return JSON.parse(data) as GuestData;
	} catch {
		return null;
	}
}

/**
 * Save guest data to localStorage
 */
export function saveGuestData(data: GuestData): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(data));
	} catch {
		console.error("Failed to save guest data to localStorage");
	}
}

/**
 * Clear guest data from localStorage
 */
export function clearGuestData(): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.removeItem(GUEST_DATA_KEY);
	} catch {
		console.error("Failed to clear guest data from localStorage");
	}
}

/**
 * Check if guest mode is active (has guest data)
 */
export function hasGuestData(): boolean {
	const data = getGuestData();
	return data !== null && data.isGuestMode;
}

/**
 * Initialize guest mode with empty data
 */
export function initGuestData(): GuestData {
	const data: GuestData = {
		subscriptions: [],
		paymentMethods: [],
		isGuestMode: true,
		createdAt: Date.now(),
	};
	saveGuestData(data);
	return data;
}
