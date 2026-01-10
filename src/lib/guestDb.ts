import Dexie, { type Table } from "dexie";

// Types matching Convex schema structure for guest mode
export type BillingCycle = "monthly" | "yearly" | "weekly" | "daily";
export type PaymentMethodType = "credit_card" | "debit_card" | "bank_account" | "paypal" | "other";

export interface LocalPaymentMethod {
  id?: number;
  localId: string; // UUID for migration mapping
  name: string;
  type: PaymentMethodType;
  lastFourDigits?: string;
  expiryDate?: string;
  isDefault: boolean;
  createdAt: number;
}

export interface LocalSubscription {
  id?: number;
  localId: string; // UUID for migration mapping
  name: string;
  description?: string;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: number;
  paymentMethodLocalId: string; // References LocalPaymentMethod.localId
  category: string;
  website?: string;
  isActive: boolean;
  notes?: string;
  createdAt: number;
}

export type ChatMessageRole = "user" | "assistant";

export interface LocalChatMessage {
  id?: number;
  content: string;
  role: ChatMessageRole;
  timestamp: number;
}

export class GuestDB extends Dexie {
  subscriptions!: Table<LocalSubscription, number>;
  paymentMethods!: Table<LocalPaymentMethod, number>;
  chatMessages!: Table<LocalChatMessage, number>;

  constructor() {
    super("scrougeGuest");
    this.version(1).stores({
      subscriptions: "++id, localId, name, nextBillingDate, paymentMethodLocalId, isActive",
      paymentMethods: "++id, localId, isDefault",
    });
    this.version(2).stores({
      subscriptions: "++id, localId, name, nextBillingDate, paymentMethodLocalId, isActive",
      paymentMethods: "++id, localId, isDefault",
      chatMessages: "++id, timestamp",
    });
  }

  /**
   * Clear all guest data from tables (used after migration)
   * For complete cleanup, also call deleteDatabase()
   */
  async clearAllData(): Promise<void> {
    await this.subscriptions.clear();
    await this.paymentMethods.clear();
    await this.chatMessages.clear();
  }

  /**
   * Completely delete the database (used for full cleanup after migration)
   * More thorough than clearAllData - removes the entire IndexedDB
   */
  async deleteDatabase(): Promise<void> {
    await this.delete();
  }

  // Check if there's any guest data
  async hasData(): Promise<boolean> {
    const subCount = await this.subscriptions.count();
    const pmCount = await this.paymentMethods.count();
    return subCount > 0 || pmCount > 0;
  }

  // Clear chat messages only
  async clearChatMessages(): Promise<void> {
    await this.chatMessages.clear();
  }
}

export const guestDb = new GuestDB();

// Helper to generate UUID for local IDs
export function generateLocalId(): string {
  return crypto.randomUUID();
}
