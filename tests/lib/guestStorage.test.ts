/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateLocalId,
  getGuestData,
  saveGuestData,
  clearGuestData,
  hasGuestData,
  initGuestData,
  type GuestData,
} from '../../src/lib/guestStorage';

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

describe('guestStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('generateLocalId', () => {
    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateLocalId());
      }
      expect(ids.size).toBe(100);
    });

    it('generates IDs with correct format', () => {
      const id = generateLocalId();
      expect(id).toMatch(/^local_\d+_[a-z0-9]+$/);
    });

    it('includes timestamp in ID', () => {
      const before = Date.now();
      const id = generateLocalId();
      const after = Date.now();

      const timestamp = parseInt(id.split('_')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('getGuestData', () => {
    it('returns null when no data exists', () => {
      expect(getGuestData()).toBeNull();
    });

    it('returns parsed data when data exists', () => {
      const testData: GuestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: Date.now(),
      };
      localStorageMock.setItem('scrouge_guest_data', JSON.stringify(testData));

      const result = getGuestData();
      expect(result).toEqual(testData);
    });

    it('returns null for invalid JSON', () => {
      localStorageMock.setItem('scrouge_guest_data', 'not valid json');
      expect(getGuestData()).toBeNull();
    });
  });

  describe('saveGuestData', () => {
    it('saves data to localStorage', () => {
      const testData: GuestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: Date.now(),
      };

      saveGuestData(testData);

      const stored = localStorageMock.getItem('scrouge_guest_data');
      expect(stored).toBe(JSON.stringify(testData));
    });

    it('overwrites existing data', () => {
      const data1: GuestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: 1000,
      };
      const data2: GuestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: 2000,
      };

      saveGuestData(data1);
      saveGuestData(data2);

      const result = getGuestData();
      expect(result?.createdAt).toBe(2000);
    });
  });

  describe('clearGuestData', () => {
    it('removes data from localStorage', () => {
      const testData: GuestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: Date.now(),
      };
      saveGuestData(testData);

      clearGuestData();

      expect(localStorageMock.getItem('scrouge_guest_data')).toBeNull();
    });

    it('does not throw when no data exists', () => {
      expect(() => clearGuestData()).not.toThrow();
    });
  });

  describe('hasGuestData', () => {
    it('returns false when no data exists', () => {
      expect(hasGuestData()).toBe(false);
    });

    it('returns false when data exists but isGuestMode is false', () => {
      const testData: GuestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: false,
        createdAt: Date.now(),
      };
      saveGuestData(testData);

      expect(hasGuestData()).toBe(false);
    });

    it('returns true when data exists and isGuestMode is true', () => {
      const testData: GuestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: Date.now(),
      };
      saveGuestData(testData);

      expect(hasGuestData()).toBe(true);
    });
  });

  describe('initGuestData', () => {
    it('creates initial guest data structure', () => {
      const result = initGuestData();

      expect(result.subscriptions).toEqual([]);
      expect(result.paymentMethods).toEqual([]);
      expect(result.isGuestMode).toBe(true);
      expect(typeof result.createdAt).toBe('number');
    });

    it('saves data to localStorage', () => {
      initGuestData();

      expect(hasGuestData()).toBe(true);
    });

    it('sets createdAt to current time', () => {
      const before = Date.now();
      const result = initGuestData();
      const after = Date.now();

      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('data roundtrip', () => {
    it('preserves subscription data through save/load', () => {
      const testData: GuestData = {
        subscriptions: [
          {
            localId: 'local_123_abc',
            name: 'Netflix',
            cost: 15.99,
            currency: 'USD',
            billingCycle: 'monthly',
            nextBillingDate: Date.now() + 86400000,
            paymentMethodLocalId: 'local_456_def',
            category: 'streaming',
            website: 'https://netflix.com',
            isActive: true,
            notes: 'Family plan',
            maxSlots: 5,
          },
        ],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: Date.now(),
      };

      saveGuestData(testData);
      const result = getGuestData();

      expect(result?.subscriptions[0]).toEqual(testData.subscriptions[0]);
    });

    it('preserves payment method data through save/load', () => {
      const testData: GuestData = {
        subscriptions: [],
        paymentMethods: [
          {
            localId: 'local_789_ghi',
            name: 'Visa *1234',
            type: 'credit_card',
            lastFourDigits: '1234',
            expiryDate: '12/25',
            isDefault: true,
          },
        ],
        isGuestMode: true,
        createdAt: Date.now(),
      };

      saveGuestData(testData);
      const result = getGuestData();

      expect(result?.paymentMethods[0]).toEqual(testData.paymentMethods[0]);
    });

    it('handles multiple subscriptions and payment methods', () => {
      const testData: GuestData = {
        subscriptions: [
          {
            localId: 'local_1_a',
            name: 'Netflix',
            cost: 15.99,
            currency: 'USD',
            billingCycle: 'monthly',
            nextBillingDate: Date.now(),
            paymentMethodLocalId: 'local_pm_1',
            category: 'streaming',
            isActive: true,
          },
          {
            localId: 'local_2_b',
            name: 'Spotify',
            cost: 9.99,
            currency: 'USD',
            billingCycle: 'monthly',
            nextBillingDate: Date.now(),
            paymentMethodLocalId: 'local_pm_1',
            category: 'music',
            isActive: true,
          },
          {
            localId: 'local_3_c',
            name: 'Cancelled Sub',
            cost: 5.00,
            currency: 'EUR',
            billingCycle: 'yearly',
            nextBillingDate: Date.now(),
            paymentMethodLocalId: 'local_pm_2',
            category: 'other',
            isActive: false,
          },
        ],
        paymentMethods: [
          {
            localId: 'local_pm_1',
            name: 'Main Card',
            type: 'credit_card',
            lastFourDigits: '4242',
            isDefault: true,
          },
          {
            localId: 'local_pm_2',
            name: 'PayPal',
            type: 'paypal',
            isDefault: false,
          },
        ],
        isGuestMode: true,
        createdAt: Date.now(),
      };

      saveGuestData(testData);
      const result = getGuestData();

      expect(result?.subscriptions).toHaveLength(3);
      expect(result?.paymentMethods).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('saveGuestData handles localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalSetItem = localStorageMock.setItem;

      // Make setItem throw an error
      localStorageMock.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      const testData: GuestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: Date.now(),
      };

      // Should not throw
      expect(() => saveGuestData(testData)).not.toThrow();

      // Should log error
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save guest data to localStorage');

      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('clearGuestData handles localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalRemoveItem = localStorageMock.removeItem;

      // Make removeItem throw an error
      localStorageMock.removeItem = () => {
        throw new Error('SecurityError');
      };

      // Should not throw
      expect(() => clearGuestData()).not.toThrow();

      // Should log error
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear guest data from localStorage');

      // Restore
      localStorageMock.removeItem = originalRemoveItem;
      consoleSpy.mockRestore();
    });
  });
});
