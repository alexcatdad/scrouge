/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initGuestStore,
  enableGuestMode,
  disableGuestMode,
  addPaymentMethod,
  updatePaymentMethod,
  removePaymentMethod,
  getGuestPaymentMethods,
  getDefaultPaymentMethod,
  getIsGuestMode,
  addSubscription,
  updateSubscription,
  removeSubscription,
  getGuestSubscriptions,
  getSubscriptionById,
  getActiveSubscriptions,
  getTotalMonthlyCost,
  getUpcomingSubscriptions,
  getIsInitialized,
  getAllGuestDataForMigration,
  getPaymentMethodById,
} from '../../src/lib/guestStore.svelte';
import { clearGuestData } from '../../src/lib/guestStorage';

// Create a proper localStorage mock since happy-dom's localStorage doesn't work correctly with bun
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

// Override the global localStorage with our mock
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('guestStore - Payment Methods', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Start fresh with guest mode enabled
    enableGuestMode();
  });

  afterEach(() => {
    disableGuestMode();
    localStorageMock.clear();
  });

  describe('addPaymentMethod', () => {
    it('adds a payment method with generated localId', () => {
      const pm = addPaymentMethod({
        name: 'Test Card',
        type: 'credit_card',
        isDefault: false,
      });

      expect(pm.localId).toMatch(/^local_\d+_[a-z0-9]+$/);
      expect(pm.name).toBe('Test Card');
      expect(pm.type).toBe('credit_card');
    });

    it('makes first payment method default automatically', () => {
      const pm = addPaymentMethod({
        name: 'First Card',
        type: 'credit_card',
        isDefault: false,
      });

      expect(pm.isDefault).toBe(true);
      expect(getDefaultPaymentMethod()?.localId).toBe(pm.localId);
    });

    it('does not auto-default second payment method', () => {
      addPaymentMethod({
        name: 'First Card',
        type: 'credit_card',
        isDefault: false,
      });

      const second = addPaymentMethod({
        name: 'Second Card',
        type: 'debit_card',
        isDefault: false,
      });

      expect(second.isDefault).toBe(false);
    });

    it('unsets other defaults when adding new default', () => {
      const first = addPaymentMethod({
        name: 'First Card',
        type: 'credit_card',
        isDefault: true,
      });

      const second = addPaymentMethod({
        name: 'Second Card',
        type: 'debit_card',
        isDefault: true,
      });

      const methods = getGuestPaymentMethods();
      const firstUpdated = methods.find(m => m.localId === first.localId);

      expect(firstUpdated?.isDefault).toBe(false);
      expect(second.isDefault).toBe(true);
    });
  });

  describe('updatePaymentMethod', () => {
    it('updates payment method properties', () => {
      const pm = addPaymentMethod({
        name: 'Old Name',
        type: 'credit_card',
        isDefault: true,
      });

      updatePaymentMethod(pm.localId, { name: 'New Name' });

      const methods = getGuestPaymentMethods();
      const updated = methods.find(m => m.localId === pm.localId);
      expect(updated?.name).toBe('New Name');
    });

    it('setting as default unsets other defaults', () => {
      const first = addPaymentMethod({
        name: 'First',
        type: 'credit_card',
        isDefault: true,
      });

      const second = addPaymentMethod({
        name: 'Second',
        type: 'debit_card',
        isDefault: false,
      });

      updatePaymentMethod(second.localId, { isDefault: true });

      const methods = getGuestPaymentMethods();
      const firstUpdated = methods.find(m => m.localId === first.localId);
      const secondUpdated = methods.find(m => m.localId === second.localId);

      expect(firstUpdated?.isDefault).toBe(false);
      expect(secondUpdated?.isDefault).toBe(true);
    });
  });

  describe('removePaymentMethod', () => {
    it('removes payment method', () => {
      const pm = addPaymentMethod({
        name: 'To Remove',
        type: 'credit_card',
        isDefault: true,
      });

      removePaymentMethod(pm.localId);

      expect(getGuestPaymentMethods()).toHaveLength(0);
    });

    it('makes first remaining method default when default is removed', () => {
      const first = addPaymentMethod({
        name: 'First',
        type: 'credit_card',
        isDefault: true,
      });

      const second = addPaymentMethod({
        name: 'Second',
        type: 'debit_card',
        isDefault: false,
      });

      removePaymentMethod(first.localId);

      const methods = getGuestPaymentMethods();
      expect(methods).toHaveLength(1);
      expect(methods[0].isDefault).toBe(true);
      expect(methods[0].localId).toBe(second.localId);
    });

    it('does not change defaults when non-default is removed', () => {
      const first = addPaymentMethod({
        name: 'First',
        type: 'credit_card',
        isDefault: true,
      });

      const second = addPaymentMethod({
        name: 'Second',
        type: 'debit_card',
        isDefault: false,
      });

      removePaymentMethod(second.localId);

      const methods = getGuestPaymentMethods();
      expect(methods).toHaveLength(1);
      expect(methods[0].isDefault).toBe(true);
      expect(methods[0].localId).toBe(first.localId);
    });
  });
});

describe('guestStore - Subscriptions', () => {
  beforeEach(() => {
    localStorageMock.clear();
    enableGuestMode();
  });

  afterEach(() => {
    disableGuestMode();
    localStorageMock.clear();
  });

  describe('addSubscription', () => {
    it('adds a subscription with generated localId', () => {
      const sub = addSubscription({
        name: 'Netflix',
        cost: 15.99,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_123',
        category: 'streaming',
        isActive: true,
      });

      expect(sub.localId).toMatch(/^local_\d+_[a-z0-9]+$/);
      expect(sub.name).toBe('Netflix');
      expect(sub.cost).toBe(15.99);
    });

    it('preserves all subscription fields', () => {
      const nextBilling = Date.now() + 86400000;
      const sub = addSubscription({
        name: 'Test Sub',
        cost: 9.99,
        currency: 'EUR',
        billingCycle: 'yearly',
        nextBillingDate: nextBilling,
        paymentMethodLocalId: 'pm_456',
        category: 'productivity',
        website: 'https://example.com',
        isActive: true,
        notes: 'Test notes',
        maxSlots: 5,
      });

      expect(sub.currency).toBe('EUR');
      expect(sub.billingCycle).toBe('yearly');
      expect(sub.nextBillingDate).toBe(nextBilling);
      expect(sub.website).toBe('https://example.com');
      expect(sub.notes).toBe('Test notes');
      expect(sub.maxSlots).toBe(5);
    });
  });

  describe('updateSubscription', () => {
    it('updates subscription properties', () => {
      const sub = addSubscription({
        name: 'Old Name',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      updateSubscription(sub.localId, {
        name: 'New Name',
        cost: 20,
      });

      const updated = getSubscriptionById(sub.localId);
      expect(updated?.name).toBe('New Name');
      expect(updated?.cost).toBe(20);
    });

    it('can deactivate subscription', () => {
      const sub = addSubscription({
        name: 'Active Sub',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      updateSubscription(sub.localId, { isActive: false });

      const updated = getSubscriptionById(sub.localId);
      expect(updated?.isActive).toBe(false);
    });
  });

  describe('removeSubscription', () => {
    it('removes subscription', () => {
      const sub = addSubscription({
        name: 'To Remove',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      removeSubscription(sub.localId);

      expect(getGuestSubscriptions()).toHaveLength(0);
      expect(getSubscriptionById(sub.localId)).toBeUndefined();
    });
  });

  describe('getActiveSubscriptions', () => {
    it('returns only active subscriptions', () => {
      addSubscription({
        name: 'Active 1',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'streaming',
        isActive: true,
      });

      addSubscription({
        name: 'Inactive',
        cost: 5,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: false,
      });

      addSubscription({
        name: 'Active 2',
        cost: 15,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'music',
        isActive: true,
      });

      const active = getActiveSubscriptions();
      expect(active).toHaveLength(2);
      expect(active.map(s => s.name)).toContain('Active 1');
      expect(active.map(s => s.name)).toContain('Active 2');
      expect(active.map(s => s.name)).not.toContain('Inactive');
    });

    it('returns empty array when no subscriptions', () => {
      expect(getActiveSubscriptions()).toEqual([]);
    });
  });
});

describe('guestStore - Calculations', () => {
  beforeEach(() => {
    localStorageMock.clear();
    enableGuestMode();
  });

  afterEach(() => {
    disableGuestMode();
    localStorageMock.clear();
  });

  describe('getTotalMonthlyCost', () => {
    it('returns empty object when no subscriptions', () => {
      expect(getTotalMonthlyCost()).toEqual({});
    });

    it('sums monthly subscriptions correctly', () => {
      addSubscription({
        name: 'Sub 1',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      addSubscription({
        name: 'Sub 2',
        cost: 15.50,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      const totals = getTotalMonthlyCost();
      expect(totals['USD']).toBe(25.50);
    });

    it('converts yearly to monthly (divides by 12)', () => {
      addSubscription({
        name: 'Yearly Sub',
        cost: 120,
        currency: 'USD',
        billingCycle: 'yearly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      const totals = getTotalMonthlyCost();
      expect(totals['USD']).toBe(10); // 120 / 12
    });

    it('converts weekly to monthly (multiplies by 4.33)', () => {
      addSubscription({
        name: 'Weekly Sub',
        cost: 10,
        currency: 'USD',
        billingCycle: 'weekly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      const totals = getTotalMonthlyCost();
      expect(totals['USD']).toBeCloseTo(43.3, 1); // 10 * 4.33
    });

    it('converts daily to monthly (multiplies by 30)', () => {
      addSubscription({
        name: 'Daily Sub',
        cost: 1,
        currency: 'USD',
        billingCycle: 'daily',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      const totals = getTotalMonthlyCost();
      expect(totals['USD']).toBe(30); // 1 * 30
    });

    it('groups by currency', () => {
      addSubscription({
        name: 'USD Sub',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      addSubscription({
        name: 'EUR Sub',
        cost: 15,
        currency: 'EUR',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      const totals = getTotalMonthlyCost();
      expect(totals['USD']).toBe(10);
      expect(totals['EUR']).toBe(15);
    });

    it('excludes inactive subscriptions', () => {
      addSubscription({
        name: 'Active',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      addSubscription({
        name: 'Inactive',
        cost: 100,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: false,
      });

      const totals = getTotalMonthlyCost();
      expect(totals['USD']).toBe(10);
    });
  });

  describe('getUpcomingSubscriptions', () => {
    it('returns subscriptions within default 7 days', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      // Due in 3 days
      addSubscription({
        name: 'Soon',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: now + 3 * day,
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      // Due in 10 days (outside default window)
      addSubscription({
        name: 'Later',
        cost: 20,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: now + 10 * day,
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      const upcoming = getUpcomingSubscriptions();
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].name).toBe('Soon');
    });

    it('accepts custom days parameter', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      addSubscription({
        name: 'Due in 10 days',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: now + 10 * day,
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      expect(getUpcomingSubscriptions(7)).toHaveLength(0);
      expect(getUpcomingSubscriptions(14)).toHaveLength(1);
    });

    it('excludes inactive subscriptions', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      addSubscription({
        name: 'Active Soon',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: now + 3 * day,
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      addSubscription({
        name: 'Inactive Soon',
        cost: 20,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: now + 2 * day,
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: false,
      });

      const upcoming = getUpcomingSubscriptions();
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].name).toBe('Active Soon');
    });

    it('sorts by next billing date ascending', () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      // Add in reverse order
      addSubscription({
        name: 'Third',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: now + 5 * day,
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      addSubscription({
        name: 'First',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: now + 1 * day,
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      addSubscription({
        name: 'Second',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: now + 3 * day,
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      const upcoming = getUpcomingSubscriptions();
      expect(upcoming.map(s => s.name)).toEqual(['First', 'Second', 'Third']);
    });
  });
});

describe('guestStore - State Management', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    disableGuestMode();
    localStorageMock.clear();
  });

  describe('enableGuestMode / disableGuestMode', () => {
    it('enableGuestMode sets isGuestMode to true', () => {
      expect(getIsGuestMode()).toBe(false);
      enableGuestMode();
      expect(getIsGuestMode()).toBe(true);
    });

    it('disableGuestMode clears all data', () => {
      enableGuestMode();
      addPaymentMethod({
        name: 'Test Card',
        type: 'credit_card',
        isDefault: true,
      });
      addSubscription({
        name: 'Test Sub',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      disableGuestMode();

      expect(getIsGuestMode()).toBe(false);
      expect(getGuestPaymentMethods()).toHaveLength(0);
      expect(getGuestSubscriptions()).toHaveLength(0);
    });
  });

  describe('initGuestStore', () => {
    it('loads existing guest data from localStorage', () => {
      // Pre-populate localStorage
      const existingData = {
        subscriptions: [{
          localId: 'existing_sub',
          name: 'Existing',
          cost: 10,
          currency: 'USD',
          billingCycle: 'monthly',
          nextBillingDate: Date.now(),
          paymentMethodLocalId: 'pm_1',
          category: 'other',
          isActive: true,
        }],
        paymentMethods: [{
          localId: 'existing_pm',
          name: 'Existing Card',
          type: 'credit_card',
          isDefault: true,
        }],
        isGuestMode: true,
        createdAt: Date.now(),
      };
      localStorageMock.setItem('scrouge_guest_data', JSON.stringify(existingData));

      initGuestStore();

      expect(getIsGuestMode()).toBe(true);
      expect(getGuestSubscriptions()).toHaveLength(1);
      expect(getGuestPaymentMethods()).toHaveLength(1);
    });
  });

  describe('getAllGuestDataForMigration', () => {
    it('returns copies of all data', () => {
      enableGuestMode();
      const pm = addPaymentMethod({
        name: 'Card',
        type: 'credit_card',
        isDefault: true,
      });
      const sub = addSubscription({
        name: 'Sub',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: pm.localId,
        category: 'other',
        isActive: true,
      });

      const migrationData = getAllGuestDataForMigration();

      expect(migrationData.subscriptions).toHaveLength(1);
      expect(migrationData.paymentMethods).toHaveLength(1);
      expect(migrationData.subscriptions[0].name).toBe('Sub');
      expect(migrationData.paymentMethods[0].name).toBe('Card');
    });

    it('returns empty arrays when no data', () => {
      enableGuestMode();
      const migrationData = getAllGuestDataForMigration();

      expect(migrationData.subscriptions).toEqual([]);
      expect(migrationData.paymentMethods).toEqual([]);
    });
  });

  describe('getter functions', () => {
    it('getPaymentMethodById returns correct method', () => {
      enableGuestMode();
      const pm = addPaymentMethod({
        name: 'Find Me',
        type: 'credit_card',
        isDefault: true,
      });

      const found = getPaymentMethodById(pm.localId);
      expect(found?.name).toBe('Find Me');
    });

    it('getPaymentMethodById returns undefined for nonexistent', () => {
      enableGuestMode();
      expect(getPaymentMethodById('nonexistent')).toBeUndefined();
    });

    it('getSubscriptionById returns correct subscription', () => {
      enableGuestMode();
      const sub = addSubscription({
        name: 'Find Me',
        cost: 10,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: Date.now(),
        paymentMethodLocalId: 'pm_1',
        category: 'other',
        isActive: true,
      });

      const found = getSubscriptionById(sub.localId);
      expect(found?.name).toBe('Find Me');
    });
  });
});
