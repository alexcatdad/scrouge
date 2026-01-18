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
