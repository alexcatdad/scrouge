import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  type BillingCycle,
  generateLocalId,
  guestDb,
  type LocalPaymentMethod,
  type LocalSubscription,
  type PaymentMethodType,
} from "./guestDb";

const GUEST_MODE_KEY = "scrouge_guest_mode";

interface GuestModeContextValue {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => Promise<void>;
  // Payment method operations
  addPaymentMethod: (
    data: Omit<LocalPaymentMethod, "id" | "localId" | "createdAt">,
  ) => Promise<string>;
  updatePaymentMethod: (
    localId: string,
    data: Partial<Omit<LocalPaymentMethod, "id" | "localId" | "createdAt">>,
  ) => Promise<void>;
  deletePaymentMethod: (localId: string) => Promise<void>;
  // Subscription operations
  addSubscription: (
    data: Omit<LocalSubscription, "id" | "localId" | "createdAt">,
  ) => Promise<string>;
  updateSubscription: (
    localId: string,
    data: Partial<Omit<LocalSubscription, "id" | "localId" | "createdAt">>,
  ) => Promise<void>;
  deleteSubscription: (localId: string) => Promise<void>;
  // Migration helpers
  getDataForMigration: () => Promise<{
    subscriptions: LocalSubscription[];
    paymentMethods: LocalPaymentMethod[];
  }>;
  hasGuestData: () => Promise<boolean>;
}

const GuestModeContext = createContext<GuestModeContextValue | null>(null);

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    // Check localStorage on initial load
    if (typeof window !== "undefined") {
      return localStorage.getItem(GUEST_MODE_KEY) === "true";
    }
    return false;
  });

  // Sync guest mode state to localStorage
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem(GUEST_MODE_KEY, "true");
    } else {
      localStorage.removeItem(GUEST_MODE_KEY);
    }
  }, [isGuest]);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(async () => {
    await guestDb.clearAllData();
    setIsGuest(false);
  }, []);

  // Payment method operations
  const addPaymentMethod = useCallback(
    async (data: Omit<LocalPaymentMethod, "id" | "localId" | "createdAt">): Promise<string> => {
      const localId = generateLocalId();

      // If this is set as default, unset other defaults first
      if (data.isDefault) {
        await guestDb.paymentMethods.where("isDefault").equals(1).modify({ isDefault: false });
      }

      await guestDb.paymentMethods.add({
        ...data,
        localId,
        createdAt: Date.now(),
      });
      return localId;
    },
    [],
  );

  const updatePaymentMethod = useCallback(
    async (
      localId: string,
      data: Partial<Omit<LocalPaymentMethod, "id" | "localId" | "createdAt">>,
    ): Promise<void> => {
      // If setting as default, unset other defaults first
      if (data.isDefault) {
        await guestDb.paymentMethods.where("isDefault").equals(1).modify({ isDefault: false });
      }

      await guestDb.paymentMethods.where("localId").equals(localId).modify(data);
    },
    [],
  );

  const deletePaymentMethod = useCallback(async (localId: string): Promise<void> => {
    await guestDb.paymentMethods.where("localId").equals(localId).delete();
  }, []);

  // Subscription operations
  const addSubscription = useCallback(
    async (data: Omit<LocalSubscription, "id" | "localId" | "createdAt">): Promise<string> => {
      const localId = generateLocalId();
      await guestDb.subscriptions.add({
        ...data,
        localId,
        createdAt: Date.now(),
      });
      return localId;
    },
    [],
  );

  const updateSubscription = useCallback(
    async (
      localId: string,
      data: Partial<Omit<LocalSubscription, "id" | "localId" | "createdAt">>,
    ): Promise<void> => {
      await guestDb.subscriptions.where("localId").equals(localId).modify(data);
    },
    [],
  );

  const deleteSubscription = useCallback(async (localId: string): Promise<void> => {
    await guestDb.subscriptions.where("localId").equals(localId).delete();
  }, []);

  // Migration helpers
  const getDataForMigration = useCallback(async () => {
    const subscriptions = await guestDb.subscriptions.toArray();
    const paymentMethods = await guestDb.paymentMethods.toArray();
    return { subscriptions, paymentMethods };
  }, []);

  const hasGuestData = useCallback(async () => {
    return guestDb.hasData();
  }, []);

  const value: GuestModeContextValue = {
    isGuest,
    enterGuestMode,
    exitGuestMode,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    getDataForMigration,
    hasGuestData,
  };

  return <GuestModeContext.Provider value={value}>{children}</GuestModeContext.Provider>;
}

export function useGuestMode(): GuestModeContextValue {
  const context = useContext(GuestModeContext);
  if (!context) {
    throw new Error("useGuestMode must be used within a GuestModeProvider");
  }
  return context;
}

// Re-export types for convenience
export type { LocalSubscription, LocalPaymentMethod, BillingCycle, PaymentMethodType };
