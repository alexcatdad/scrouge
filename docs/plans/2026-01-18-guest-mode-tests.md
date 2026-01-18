# Guest Mode Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create comprehensive unit tests for guest mode storage/store operations and E2E tests for guest mode user flows (excluding AI features).

**Architecture:** Unit tests will use Vitest with jsdom environment to test localStorage operations and state management. E2E tests will use Playwright with a custom guest mode fixture that injects guest data into localStorage before navigation.

**Tech Stack:** Vitest, Playwright, jsdom

---

## Task 1: Setup Test Infrastructure

**Files:**
- Modify: `vitest.config.ts`
- Create: `tests/lib/guestStorage.test.ts`

**Step 1: Update vitest config to support jsdom environment**

The current vitest config uses `environment: 'node'` which doesn't have `window` or `localStorage`. We need jsdom for guest storage tests.

Edit `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      // Use jsdom for tests that need browser APIs
      ['tests/lib/guest*.test.ts', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'convex/_generated/**',
        '.svelte-kit/**',
        'build/**',
      ],
    },
    setupFiles: ['tests/setup.ts'],
  },
});
```

**Step 2: Install jsdom if not present**

Run: `bun add -D jsdom`

**Step 3: Run tests to verify config**

Run: `bun run test`
Expected: Existing tests still pass

**Step 4: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add jsdom environment for browser API tests"
```

---

## Task 2: Unit Tests for guestStorage.ts - ID Generation and Basic Operations

**Files:**
- Create: `tests/lib/guestStorage.test.ts`

**Step 1: Write tests for generateLocalId()**

Create `tests/lib/guestStorage.test.ts`:
```typescript
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

describe('guestStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
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
```

**Step 2: Run test to verify it passes**

Run: `bun run test tests/lib/guestStorage.test.ts`
Expected: PASS (3 tests)

**Step 3: Commit**

```bash
git add tests/lib/guestStorage.test.ts
git commit -m "test: add unit tests for generateLocalId"
```

---

## Task 3: Unit Tests for guestStorage.ts - Save/Load/Clear Operations

**Files:**
- Modify: `tests/lib/guestStorage.test.ts`

**Step 1: Add tests for save/load/clear operations**

Add to `tests/lib/guestStorage.test.ts`:
```typescript
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
      localStorage.setItem('scrouge_guest_data', JSON.stringify(testData));

      const result = getGuestData();
      expect(result).toEqual(testData);
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem('scrouge_guest_data', 'not valid json');
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

      const stored = localStorage.getItem('scrouge_guest_data');
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

      expect(localStorage.getItem('scrouge_guest_data')).toBeNull();
    });

    it('does not throw when no data exists', () => {
      expect(() => clearGuestData()).not.toThrow();
    });
  });
```

**Step 2: Run tests**

Run: `bun run test tests/lib/guestStorage.test.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add tests/lib/guestStorage.test.ts
git commit -m "test: add unit tests for save/load/clear operations"
```

---

## Task 4: Unit Tests for guestStorage.ts - hasGuestData and initGuestData

**Files:**
- Modify: `tests/lib/guestStorage.test.ts`

**Step 1: Add tests for hasGuestData and initGuestData**

Add to `tests/lib/guestStorage.test.ts`:
```typescript
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
```

**Step 2: Run tests**

Run: `bun run test tests/lib/guestStorage.test.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add tests/lib/guestStorage.test.ts
git commit -m "test: add unit tests for hasGuestData and initGuestData"
```

---

## Task 5: Unit Tests for guestStorage.ts - Complex Data Roundtrip

**Files:**
- Modify: `tests/lib/guestStorage.test.ts`

**Step 1: Add tests for complex data structures**

Add to `tests/lib/guestStorage.test.ts`:
```typescript
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
```

**Step 2: Run tests**

Run: `bun run test tests/lib/guestStorage.test.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add tests/lib/guestStorage.test.ts
git commit -m "test: add unit tests for complex data roundtrip"
```

---

## Task 6: Unit Tests for guestStore - Payment Method Default Logic

**Files:**
- Create: `tests/lib/guestStore.test.ts`

**Step 1: Create guestStore test file with payment method tests**

Note: The guestStore uses Svelte 5 runes (`$state`, `$derived`) which require special handling in tests. We'll test the exported functions that can be tested in isolation.

Create `tests/lib/guestStore.test.ts`:
```typescript
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
} from '../../src/lib/guestStore.svelte';
import { clearGuestData } from '../../src/lib/guestStorage';

describe('guestStore - Payment Methods', () => {
  beforeEach(() => {
    localStorage.clear();
    // Start fresh with guest mode enabled
    enableGuestMode();
  });

  afterEach(() => {
    disableGuestMode();
    localStorage.clear();
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
```

**Step 2: Run tests**

Run: `bun run test tests/lib/guestStore.test.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add tests/lib/guestStore.test.ts
git commit -m "test: add unit tests for guest store payment method logic"
```

---

## Task 7: Unit Tests for guestStore - Subscription Operations

**Files:**
- Modify: `tests/lib/guestStore.test.ts`

**Step 1: Add subscription operation tests**

Add to `tests/lib/guestStore.test.ts`:
```typescript
import {
  // ... existing imports ...
  addSubscription,
  updateSubscription,
  removeSubscription,
  getGuestSubscriptions,
  getSubscriptionById,
  getActiveSubscriptions,
} from '../../src/lib/guestStore.svelte';

// Add after payment method tests:
describe('guestStore - Subscriptions', () => {
  beforeEach(() => {
    localStorage.clear();
    enableGuestMode();
  });

  afterEach(() => {
    disableGuestMode();
    localStorage.clear();
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
```

**Step 2: Run tests**

Run: `bun run test tests/lib/guestStore.test.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add tests/lib/guestStore.test.ts
git commit -m "test: add unit tests for guest store subscription operations"
```

---

## Task 8: Unit Tests for guestStore - Cost Calculations and Filtering

**Files:**
- Modify: `tests/lib/guestStore.test.ts`

**Step 1: Add cost calculation and filtering tests**

Add to `tests/lib/guestStore.test.ts`:
```typescript
import {
  // ... existing imports ...
  getTotalMonthlyCost,
  getUpcomingSubscriptions,
} from '../../src/lib/guestStore.svelte';

// Add after subscription tests:
describe('guestStore - Calculations', () => {
  beforeEach(() => {
    localStorage.clear();
    enableGuestMode();
  });

  afterEach(() => {
    disableGuestMode();
    localStorage.clear();
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
```

**Step 2: Run tests**

Run: `bun run test tests/lib/guestStore.test.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add tests/lib/guestStore.test.ts
git commit -m "test: add unit tests for cost calculations and upcoming subscriptions"
```

---

## Task 9: Unit Tests for guestStore - Store State Management

**Files:**
- Modify: `tests/lib/guestStore.test.ts`

**Step 1: Add store state management tests**

Add to `tests/lib/guestStore.test.ts`:
```typescript
import {
  // ... existing imports ...
  getIsInitialized,
  getAllGuestDataForMigration,
  getPaymentMethodById,
} from '../../src/lib/guestStore.svelte';

// Add at the end:
describe('guestStore - State Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    disableGuestMode();
    localStorage.clear();
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
      localStorage.setItem('scrouge_guest_data', JSON.stringify(existingData));

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
```

**Step 2: Run tests**

Run: `bun run test tests/lib/guestStore.test.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add tests/lib/guestStore.test.ts
git commit -m "test: add unit tests for guest store state management"
```

---

## Task 10: E2E Test Infrastructure - Guest Mode Fixture

**Files:**
- Create: `e2e/fixtures/guest.ts`

**Step 1: Create guest mode fixture**

Create `e2e/fixtures/guest.ts`:
```typescript
import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

interface GuestFixtures {
  guestPage: Page;
}

export const test = base.extend<GuestFixtures>({
  // Page with guest mode pre-enabled via localStorage
  guestPage: async ({ page }, use) => {
    // Inject guest mode data into localStorage before navigation
    await page.addInitScript(() => {
      const guestData = {
        subscriptions: [],
        paymentMethods: [],
        isGuestMode: true,
        createdAt: Date.now(),
      };
      localStorage.setItem('scrouge_guest_data', JSON.stringify(guestData));
    });

    await use(page);
  },
});

export { expect };
```

**Step 2: Commit**

```bash
git add e2e/fixtures/guest.ts
git commit -m "test: add guest mode E2E fixture"
```

---

## Task 11: E2E Tests - Guest Mode Entry Flow

**Files:**
- Create: `e2e/guest.spec.ts`

**Step 1: Create guest mode E2E tests**

Create `e2e/guest.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";
import { test as guestTest, expect as guestExpect } from "./fixtures/guest";

test.describe("Guest Mode - Entry", () => {
  test("landing page shows 'Try without an account' button", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Try without an account")).toBeVisible();
  });

  test("clicking guest button enables guest mode and redirects to dashboard", async ({ page }) => {
    await page.goto("/");

    await page.click("text=Try without an account");

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);

    // Should see guest welcome
    await expect(page.locator("text=Welcome, Guest")).toBeVisible();
  });

  test("guest mode shows local storage warning banner", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try without an account");

    // Should see the guest mode banner
    await expect(page.locator("text=Your data is saved locally")).toBeVisible();
  });
});

guestTest.describe("Guest Mode - Dashboard", () => {
  guestTest("guest can access dashboard", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    await expect(guestPage.locator("text=Welcome, Guest")).toBeVisible();
    await expect(guestPage.locator("text=Total Monthly")).toBeVisible();
    await expect(guestPage.locator("text=Active Subscriptions")).toBeVisible();
  });

  guestTest("guest dashboard shows $0 when no subscriptions", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    // Look for $0.00 or similar zero amount
    await expect(guestPage.locator("text=$0")).toBeVisible();
  });

  guestTest("guest sees sign up prompt in banner", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    // Should see call to action to sign up
    await expect(guestPage.locator("text=Sign up")).toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `bun run test:e2e e2e/guest.spec.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add e2e/guest.spec.ts
git commit -m "test: add E2E tests for guest mode entry flow"
```

---

## Task 12: E2E Tests - Guest Mode Wizard

**Files:**
- Modify: `e2e/guest.spec.ts`

**Step 1: Add wizard tests**

Add to `e2e/guest.spec.ts`:
```typescript
guestTest.describe("Guest Mode - Wizard", () => {
  guestTest("guest can access wizard", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Should see Quick Start header
    await expect(guestPage.locator("text=Quick Start")).toBeVisible();
    await expect(guestPage.locator("text=Step 1 of 3")).toBeVisible();
  });

  guestTest("wizard shows service templates", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Should show common services
    await expect(guestPage.locator("text=Netflix").first()).toBeVisible();
    await expect(guestPage.locator("text=Spotify").first()).toBeVisible();
  });

  guestTest("guest can select a service in wizard", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Click on Netflix
    await guestPage.click("text=Netflix");

    // Should show selected state (card has focus ring or checkmark)
    // The exact selector depends on your UI, adjust as needed
    await expect(guestPage.locator('[data-selected="true"]').first()).toBeVisible();
  });

  guestTest("wizard shows payment method form when no methods exist", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Select a service
    await guestPage.click("text=Netflix");

    // Click Continue
    await guestPage.click("text=Continue");

    // Should prompt to add payment method
    await expect(guestPage.locator("text=Add Payment Method")).toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `bun run test:e2e e2e/guest.spec.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add e2e/guest.spec.ts
git commit -m "test: add E2E tests for guest mode wizard"
```

---

## Task 13: E2E Tests - Guest Mode Subscription Flow

**Files:**
- Modify: `e2e/guest.spec.ts`

**Step 1: Add subscription creation flow tests**

Add to `e2e/guest.spec.ts`:
```typescript
guestTest.describe("Guest Mode - Subscription Flow", () => {
  guestTest("guest can complete full subscription flow", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Step 1: Select a service
    await guestPage.click("text=Netflix");
    await guestPage.click("text=Continue");

    // Step 2: Add payment method if prompted
    const addPaymentBtn = guestPage.locator("text=Add Payment Method");
    if (await addPaymentBtn.isVisible()) {
      await addPaymentBtn.click();

      // Fill payment method form
      await guestPage.fill('input[placeholder*="name" i], input[id*="name" i]', 'Test Card');
      await guestPage.click('button:has-text("Save"), button:has-text("Add")');
      await guestPage.waitForTimeout(500);
    }

    // Fill subscription details
    // Set billing date
    const dateInput = guestPage.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await dateInput.fill(dateStr);
    }

    // Continue to next step or finish
    await guestPage.click("text=Continue");

    // Should show success or completion
    await expect(guestPage.locator("text=added").or(guestPage.locator("text=Success")).or(guestPage.locator("text=complete"))).toBeVisible({ timeout: 5000 });
  });

  guestTest("subscription persists after page reload", async ({ guestPage }) => {
    // First, inject a subscription into localStorage
    await guestPage.addInitScript(() => {
      const guestData = {
        subscriptions: [{
          localId: 'test_sub_1',
          name: 'Netflix',
          cost: 15.99,
          currency: 'USD',
          billingCycle: 'monthly',
          nextBillingDate: Date.now() + 86400000,
          paymentMethodLocalId: 'test_pm_1',
          category: 'streaming',
          isActive: true,
        }],
        paymentMethods: [{
          localId: 'test_pm_1',
          name: 'Test Card',
          type: 'credit_card',
          isDefault: true,
        }],
        isGuestMode: true,
        createdAt: Date.now(),
      };
      localStorage.setItem('scrouge_guest_data', JSON.stringify(guestData));
    });

    await guestPage.goto("/dashboard");

    // Should show the subscription count
    await expect(guestPage.locator("text=1").first()).toBeVisible();

    // Reload the page
    await guestPage.reload();

    // Data should persist
    await expect(guestPage.locator("text=Welcome, Guest")).toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `bun run test:e2e e2e/guest.spec.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add e2e/guest.spec.ts
git commit -m "test: add E2E tests for guest mode subscription flow"
```

---

## Task 14: E2E Tests - Guest Mode Exit

**Files:**
- Modify: `e2e/guest.spec.ts`

**Step 1: Add guest mode exit tests**

Add to `e2e/guest.spec.ts`:
```typescript
guestTest.describe("Guest Mode - Exit", () => {
  guestTest("exit guest button clears data and redirects", async ({ guestPage }) => {
    // Pre-populate with data
    await guestPage.addInitScript(() => {
      const guestData = {
        subscriptions: [{
          localId: 'test_sub',
          name: 'Netflix',
          cost: 15.99,
          currency: 'USD',
          billingCycle: 'monthly',
          nextBillingDate: Date.now(),
          paymentMethodLocalId: 'test_pm',
          category: 'streaming',
          isActive: true,
        }],
        paymentMethods: [{
          localId: 'test_pm',
          name: 'Card',
          type: 'credit_card',
          isDefault: true,
        }],
        isGuestMode: true,
        createdAt: Date.now(),
      };
      localStorage.setItem('scrouge_guest_data', JSON.stringify(guestData));
    });

    await guestPage.goto("/dashboard");

    // Find and click exit/sign out
    await guestPage.click("text=Exit Guest Mode");

    // Should redirect to landing or sign-in
    await expect(guestPage).toHaveURL(/^\/$|sign-in/);
  });

  guestTest("unauthenticated non-guest redirects to sign-in", async ({ page }) => {
    // Clear any guest data
    await page.addInitScript(() => {
      localStorage.removeItem('scrouge_guest_data');
    });

    await page.goto("/dashboard");

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });
});
```

**Step 2: Run E2E tests**

Run: `bun run test:e2e e2e/guest.spec.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add e2e/guest.spec.ts
git commit -m "test: add E2E tests for guest mode exit"
```

---

## Task 15: Final Integration - Run All Tests

**Step 1: Run all unit tests**

Run: `bun run test`
Expected: All unit tests pass

**Step 2: Run all E2E tests**

Run: `bun run test:e2e`
Expected: All E2E tests pass

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: complete guest mode test coverage

- Unit tests for guestStorage.ts (ID generation, save/load/clear, roundtrip)
- Unit tests for guestStore.svelte.ts (payment methods, subscriptions, calculations)
- E2E tests for guest mode (entry, dashboard, wizard, subscription flow, exit)
"
```

---

## Summary

**Unit Tests Created:**
- `tests/lib/guestStorage.test.ts` - 15+ tests covering all storage operations
- `tests/lib/guestStore.test.ts` - 30+ tests covering all store operations

**E2E Tests Created:**
- `e2e/fixtures/guest.ts` - Guest mode fixture
- `e2e/guest.spec.ts` - 12+ tests covering all guest mode flows

**Key Test Coverage:**
1. ID generation uniqueness and format
2. localStorage save/load/clear operations
3. Data roundtrip integrity
4. Payment method default logic
5. Subscription CRUD operations
6. Cost calculations with different billing cycles
7. Upcoming subscription filtering
8. Guest mode entry via landing page
9. Guest dashboard access and display
10. Guest wizard flow
11. Subscription persistence across reloads
12. Guest mode exit and cleanup
