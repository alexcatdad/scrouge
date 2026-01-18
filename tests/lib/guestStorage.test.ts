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
});
