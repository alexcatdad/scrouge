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
