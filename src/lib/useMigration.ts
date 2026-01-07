import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGuestMode } from "./guestMode";
import { guestDb } from "./guestDb";
import { toast } from "sonner";

/**
 * Hook to handle migration of guest data when user authenticates.
 * Should be called in a component that has access to both guest mode context
 * and authenticated state.
 */
export function useMigration(isAuthenticated: boolean) {
  const { isGuest, getDataForMigration, exitGuestMode, hasGuestData } = useGuestMode();
  const migrateFromGuest = useMutation(api.subscriptions.migrateFromGuest);
  const [isMigrating, setIsMigrating] = useState(false);
  const migrationAttempted = useRef(false);

  useEffect(() => {
    // Only run migration once when:
    // 1. User just authenticated (isAuthenticated becomes true)
    // 2. There's guest data to migrate
    // 3. We haven't already attempted migration
    const runMigration = async () => {
      if (!isAuthenticated || migrationAttempted.current) return;

      // Check if there's guest data in IndexedDB
      const hasData = await guestDb.hasData();
      if (!hasData) return;

      migrationAttempted.current = true;
      setIsMigrating(true);

      try {
        const { subscriptions, paymentMethods } = await getDataForMigration();

        if (paymentMethods.length === 0 && subscriptions.length === 0) {
          // No data to migrate
          await guestDb.clearAllData();
          localStorage.removeItem("scrouge_guest_mode");
          return;
        }

        // Prepare data for migration (strip local IDs and timestamps)
        const migratePaymentMethods = paymentMethods.map((pm) => ({
          localId: pm.localId,
          name: pm.name,
          type: pm.type,
          lastFourDigits: pm.lastFourDigits,
          expiryDate: pm.expiryDate,
          isDefault: pm.isDefault,
        }));

        const migrateSubscriptions = subscriptions.map((sub) => ({
          localId: sub.localId,
          name: sub.name,
          description: sub.description,
          cost: sub.cost,
          currency: sub.currency,
          billingCycle: sub.billingCycle,
          nextBillingDate: sub.nextBillingDate,
          paymentMethodLocalId: sub.paymentMethodLocalId,
          category: sub.category,
          website: sub.website,
          isActive: sub.isActive,
          notes: sub.notes,
        }));

        // Run the migration mutation
        const result = await migrateFromGuest({
          paymentMethods: migratePaymentMethods,
          subscriptions: migrateSubscriptions,
        });

        // Clear local data after successful migration
        await guestDb.clearAllData();
        localStorage.removeItem("scrouge_guest_mode");

        toast.success(
          `Welcome! Migrated ${result.migratedPaymentMethods} payment methods and ${result.migratedSubscriptions} subscriptions.`
        );
      } catch (error) {
        console.error("Migration failed:", error);
        toast.error("Failed to migrate your guest data. Your local data is preserved.");
        // Don't clear local data on failure - user can try again
      } finally {
        setIsMigrating(false);
      }
    };

    void runMigration();
  }, [isAuthenticated, getDataForMigration, migrateFromGuest]);

  return { isMigrating };
}

