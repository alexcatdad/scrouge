/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateLocalId,
  getGuestData,
  saveGuestData,
  clearGuestData,
  hasGuestData,
  initGuestData,
  type GuestData,
} from '../../src/lib/guestStorage';

// Use delete to clear the property from the plain object localStorage
function clearStorage() {
  delete (localStorage as Record<string, unknown>)['scrouge_guest_data'];
}

describe('guestStorage', () => {
  beforeEach(() => {
    clearStorage();
  });

  afterEach(() => {
    clearStorage();
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
});
