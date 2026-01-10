import { useMutation, useQuery } from "convex/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { type BillingCycle, guestDb } from "./guestDb";
import { type LocalPaymentMethod, type LocalSubscription, useGuestMode } from "./guestMode";

// Unified subscription type that works for both guest and authenticated modes
export interface UnifiedSubscription {
  _id: string;
  name: string;
  description?: string;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: number;
  category: string;
  website?: string;
  isActive: boolean;
  notes?: string;
  paymentMethod?: UnifiedPaymentMethod | null;
  // For guest mode mapping
  paymentMethodLocalId?: string;
  // Family plan fields
  maxSlots?: number;
  // Sharing info (for beneficiary view)
  isSharedWithMe?: boolean;
  shareId?: string;
  ownerName?: string;
  isHidden?: boolean;
}

// Shared subscription from beneficiary perspective
export interface SharedSubscription {
  shareId: string;
  subscriptionId: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: number;
  maxSlots?: number;
  ownerName?: string;
  isHidden: boolean;
  isActive: boolean;
}

export interface UnifiedPaymentMethod {
  _id: string;
  name: string;
  type: "credit_card" | "debit_card" | "bank_account" | "paypal" | "other";
  lastFourDigits?: string;
  expiryDate?: string;
  isDefault: boolean;
}

// Convert local subscription to unified format
function toUnifiedSubscription(
  local: LocalSubscription,
  paymentMethods: LocalPaymentMethod[],
): UnifiedSubscription {
  const pm = paymentMethods.find((p) => p.localId === local.paymentMethodLocalId);
  return {
    _id: local.localId,
    name: local.name,
    description: local.description,
    cost: local.cost,
    currency: local.currency,
    billingCycle: local.billingCycle,
    nextBillingDate: local.nextBillingDate,
    category: local.category,
    website: local.website,
    isActive: local.isActive,
    notes: local.notes,
    paymentMethodLocalId: local.paymentMethodLocalId,
    paymentMethod: pm ? toUnifiedPaymentMethod(pm) : null,
  };
}

// Convert local payment method to unified format
function toUnifiedPaymentMethod(local: LocalPaymentMethod): UnifiedPaymentMethod {
  return {
    _id: local.localId,
    name: local.name,
    type: local.type,
    lastFourDigits: local.lastFourDigits,
    expiryDate: local.expiryDate,
    isDefault: local.isDefault,
  };
}

/**
 * Hook to get subscriptions - works for both guest and authenticated users
 * Includes shared subscriptions for authenticated users
 */
export function useSubscriptions(options?: {
  activeOnly?: boolean;
  includeShared?: boolean;
  includeHiddenShared?: boolean;
}): UnifiedSubscription[] | undefined {
  const { isGuest } = useGuestMode();

  // Guest mode: use Dexie live query
  const guestPaymentMethods = useLiveQuery(
    () => (isGuest ? guestDb.paymentMethods.toArray() : Promise.resolve([])),
    [isGuest],
  );

  const guestSubscriptions = useLiveQuery(() => {
    if (!isGuest) return Promise.resolve([]);
    if (options?.activeOnly) {
      return guestDb.subscriptions.where("isActive").equals(1).toArray();
    }
    return guestDb.subscriptions.toArray();
  }, [isGuest, options?.activeOnly]);

  // Authenticated mode: use Convex query
  const convexSubscriptions = useQuery(
    api.subscriptions.list,
    isGuest ? "skip" : { activeOnly: options?.activeOnly },
  );

  // Get shared subscriptions for authenticated users
  const sharedSubscriptions = useQuery(
    api.sharing.getSharedWithMe,
    isGuest || options?.includeShared === false
      ? "skip"
      : { includeHidden: options?.includeHiddenShared ?? false },
  );

  // Merge owned and shared subscriptions
  return useMemo(() => {
    if (isGuest) {
      if (!guestSubscriptions || !guestPaymentMethods) return undefined;
      return guestSubscriptions.map((sub) => toUnifiedSubscription(sub, guestPaymentMethods));
    }

    if (!convexSubscriptions) return undefined;

    const ownedSubs: UnifiedSubscription[] = convexSubscriptions.map((sub) => ({
      _id: sub._id,
      name: sub.name,
      description: sub.description,
      cost: sub.cost,
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      nextBillingDate: sub.nextBillingDate,
      category: sub.category,
      website: sub.website,
      isActive: sub.isActive,
      notes: sub.notes,
      maxSlots: sub.maxSlots,
      paymentMethod: sub.paymentMethod
        ? {
            _id: sub.paymentMethod._id,
            name: sub.paymentMethod.name,
            type: sub.paymentMethod.type,
            lastFourDigits: sub.paymentMethod.lastFourDigits,
            expiryDate: sub.paymentMethod.expiryDate,
            isDefault: sub.paymentMethod.isDefault,
          }
        : null,
    }));

    // Add shared subscriptions if available
    if (sharedSubscriptions && options?.includeShared !== false) {
      const sharedSubs: UnifiedSubscription[] = sharedSubscriptions
        .filter((s) => !options?.activeOnly || s.isActive)
        .map((shared) => ({
          _id: shared.subscriptionId,
          name: shared.name,
          cost: shared.cost,
          currency: shared.currency,
          billingCycle: shared.billingCycle,
          nextBillingDate: shared.nextBillingDate,
          category: "Shared", // Shared subscriptions don't have category for beneficiaries
          isActive: shared.isActive,
          maxSlots: shared.maxSlots,
          // Sharing-specific fields
          isSharedWithMe: true,
          shareId: shared.shareId,
          ownerName: shared.ownerName,
          isHidden: shared.isHidden,
        }));

      return [...ownedSubs, ...sharedSubs];
    }

    return ownedSubs;
  }, [
    isGuest,
    guestSubscriptions,
    guestPaymentMethods,
    convexSubscriptions,
    sharedSubscriptions,
    options?.activeOnly,
    options?.includeShared,
  ]);
}

/**
 * Hook to get payment methods - works for both guest and authenticated users
 */
export function usePaymentMethods(): UnifiedPaymentMethod[] | undefined {
  const { isGuest } = useGuestMode();

  // Guest mode: use Dexie live query
  const guestPaymentMethods = useLiveQuery(
    () => (isGuest ? guestDb.paymentMethods.toArray() : Promise.resolve([])),
    [isGuest],
  );

  // Authenticated mode: use Convex query
  const convexPaymentMethods = useQuery(api.paymentMethods.list, isGuest ? "skip" : {});

  if (isGuest) {
    if (!guestPaymentMethods) return undefined;
    return guestPaymentMethods.map(toUnifiedPaymentMethod);
  }

  if (!convexPaymentMethods) return undefined;
  return convexPaymentMethods.map((pm) => ({
    _id: pm._id,
    name: pm.name,
    type: pm.type,
    lastFourDigits: pm.lastFourDigits,
    expiryDate: pm.expiryDate,
    isDefault: pm.isDefault,
  }));
}

/**
 * Hook to get upcoming bills - works for both guest and authenticated users
 */
export function useUpcomingBills(days: number = 30): UnifiedSubscription[] | undefined {
  const { isGuest } = useGuestMode();
  const cutoffDate = Date.now() + days * 24 * 60 * 60 * 1000;

  // Guest mode: use Dexie live query
  const guestPaymentMethods = useLiveQuery(
    () => (isGuest ? guestDb.paymentMethods.toArray() : Promise.resolve([])),
    [isGuest],
  );

  const guestSubscriptions = useLiveQuery(() => {
    if (!isGuest) return Promise.resolve([]);
    return guestDb.subscriptions
      .where("isActive")
      .equals(1)
      .and((sub) => sub.nextBillingDate <= cutoffDate)
      .toArray();
  }, [isGuest, cutoffDate]);

  // Authenticated mode: use Convex query
  const convexUpcoming = useQuery(api.subscriptions.getUpcoming, isGuest ? "skip" : { days });

  if (isGuest) {
    if (!guestSubscriptions || !guestPaymentMethods) return undefined;
    return guestSubscriptions
      .map((sub) => toUnifiedSubscription(sub, guestPaymentMethods))
      .sort((a, b) => a.nextBillingDate - b.nextBillingDate);
  }

  if (!convexUpcoming) return undefined;
  return convexUpcoming.map((sub) => ({
    _id: sub._id,
    name: sub.name,
    description: sub.description,
    cost: sub.cost,
    currency: sub.currency,
    billingCycle: sub.billingCycle,
    nextBillingDate: sub.nextBillingDate,
    category: sub.category,
    website: sub.website,
    isActive: sub.isActive,
    notes: sub.notes,
    paymentMethod: sub.paymentMethod
      ? {
          _id: sub.paymentMethod._id,
          name: sub.paymentMethod.name,
          type: sub.paymentMethod.type,
          lastFourDigits: sub.paymentMethod.lastFourDigits,
          expiryDate: sub.paymentMethod.expiryDate,
          isDefault: sub.paymentMethod.isDefault,
        }
      : null,
  }));
}

/**
 * Hook to get total monthly costs - works for both guest and authenticated users
 */
export function useTotalCosts(): Record<string, number> | undefined {
  const { isGuest } = useGuestMode();

  // Guest mode: use Dexie live query
  const guestSubscriptions = useLiveQuery(() => {
    if (!isGuest) return Promise.resolve([]);
    return guestDb.subscriptions.where("isActive").equals(1).toArray();
  }, [isGuest]);

  // Authenticated mode: use Convex query
  const convexTotals = useQuery(api.subscriptions.getTotalCost, isGuest ? "skip" : {});

  if (isGuest) {
    if (!guestSubscriptions) return undefined;

    const totals: Record<string, number> = {};
    for (const sub of guestSubscriptions) {
      let monthlyCost = sub.cost;

      switch (sub.billingCycle) {
        case "yearly":
          monthlyCost = sub.cost / 12;
          break;
        case "weekly":
          monthlyCost = sub.cost * 4.33;
          break;
        case "daily":
          monthlyCost = sub.cost * 30;
          break;
      }

      if (!totals[sub.currency]) {
        totals[sub.currency] = 0;
      }
      totals[sub.currency] += monthlyCost;
    }
    return totals;
  }

  return convexTotals;
}

/**
 * Hook to get subscription mutations - returns functions that work for both modes
 */
export function useSubscriptionMutations() {
  const { isGuest, addSubscription, updateSubscription, deleteSubscription } = useGuestMode();

  const createConvex = useMutation(api.subscriptions.create);
  const updateConvex = useMutation(api.subscriptions.update);
  const removeConvex = useMutation(api.subscriptions.remove);

  return {
    create: async (data: {
      name: string;
      description?: string;
      cost: number;
      currency: string;
      billingCycle: BillingCycle;
      nextBillingDate: number;
      paymentMethodId: string;
      category: string;
      website?: string;
      notes?: string;
      maxSlots?: number;
    }) => {
      if (isGuest) {
        return addSubscription({
          name: data.name,
          description: data.description,
          cost: data.cost,
          currency: data.currency,
          billingCycle: data.billingCycle,
          nextBillingDate: data.nextBillingDate,
          paymentMethodLocalId: data.paymentMethodId,
          category: data.category,
          website: data.website,
          notes: data.notes,
          isActive: true,
        });
      }
      return createConvex({
        ...data,
        paymentMethodId: data.paymentMethodId as Id<"paymentMethods">,
      });
    },

    update: async (
      id: string,
      data: {
        name?: string;
        description?: string;
        cost?: number;
        currency?: string;
        billingCycle?: BillingCycle;
        nextBillingDate?: number;
        paymentMethodId?: string;
        category?: string;
        website?: string;
        isActive?: boolean;
        notes?: string;
        maxSlots?: number;
      },
    ) => {
      if (isGuest) {
        const updateData: any = { ...data };
        if (data.paymentMethodId) {
          updateData.paymentMethodLocalId = data.paymentMethodId;
          updateData.paymentMethodId = undefined;
        }
        return updateSubscription(id, updateData);
      }
      return updateConvex({
        id: id as Id<"subscriptions">,
        ...data,
        paymentMethodId: data.paymentMethodId as Id<"paymentMethods"> | undefined,
      });
    },

    remove: async (id: string) => {
      if (isGuest) {
        return deleteSubscription(id);
      }
      return removeConvex({ id: id as Id<"subscriptions"> });
    },
  };
}

/**
 * Hook to get payment method mutations - returns functions that work for both modes
 */
export function usePaymentMethodMutations() {
  const { isGuest, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = useGuestMode();

  const createConvex = useMutation(api.paymentMethods.create);
  const updateConvex = useMutation(api.paymentMethods.update);
  const removeConvex = useMutation(api.paymentMethods.remove);

  return {
    create: async (data: {
      name: string;
      type: "credit_card" | "debit_card" | "bank_account" | "paypal" | "other";
      lastFourDigits?: string;
      expiryDate?: string;
      isDefault?: boolean;
    }) => {
      if (isGuest) {
        return addPaymentMethod({
          name: data.name,
          type: data.type,
          lastFourDigits: data.lastFourDigits,
          expiryDate: data.expiryDate,
          isDefault: data.isDefault ?? false,
        });
      }
      return createConvex(data);
    },

    update: async (
      id: string,
      data: {
        name?: string;
        type?: "credit_card" | "debit_card" | "bank_account" | "paypal" | "other";
        lastFourDigits?: string;
        expiryDate?: string;
        isDefault?: boolean;
      },
    ) => {
      if (isGuest) {
        return updatePaymentMethod(id, data);
      }
      return updateConvex({
        id: id as Id<"paymentMethods">,
        ...data,
      });
    },

    remove: async (id: string) => {
      if (isGuest) {
        return deletePaymentMethod(id);
      }
      return removeConvex({ id: id as Id<"paymentMethods"> });
    },
  };
}

/**
 * Hook for sharing operations
 */
export function useSharingMutations() {
  const addAnonymousShare = useMutation(api.sharing.addAnonymousShare);
  const createInviteLink = useMutation(api.sharing.createInviteLink);
  const claimInvite = useMutation(api.sharing.claimInvite);
  const removeShare = useMutation(api.sharing.removeShare);
  const toggleHideShare = useMutation(api.sharing.toggleHideShare);
  const revokeInvite = useMutation(api.sharing.revokeInvite);

  return {
    addAnonymousShare: async (subscriptionId: string, name: string) => {
      return addAnonymousShare({
        subscriptionId: subscriptionId as Id<"subscriptions">,
        name,
      });
    },
    createInviteLink: async (subscriptionId: string, expiresInDays?: number) => {
      return createInviteLink({
        subscriptionId: subscriptionId as Id<"subscriptions">,
        expiresInDays,
      });
    },
    claimInvite: async (token: string) => {
      return claimInvite({ token });
    },
    removeShare: async (shareId: string) => {
      return removeShare({ shareId: shareId as Id<"subscriptionShares"> });
    },
    toggleHideShare: async (shareId: string) => {
      return toggleHideShare({ shareId: shareId as Id<"subscriptionShares"> });
    },
    revokeInvite: async (inviteId: string) => {
      return revokeInvite({ inviteId: inviteId as Id<"shareInvites"> });
    },
  };
}

/**
 * Hook to get shares for a subscription (owner view)
 */
export function useSubscriptionShares(subscriptionId: string | undefined) {
  const { isGuest } = useGuestMode();

  const shares = useQuery(
    api.sharing.getSubscriptionShares,
    isGuest || !subscriptionId ? "skip" : { subscriptionId: subscriptionId as Id<"subscriptions"> },
  );

  return shares;
}

/**
 * Hook to get pending invites for a subscription
 */
export function usePendingInvites(subscriptionId: string | undefined) {
  const { isGuest } = useGuestMode();

  const invites = useQuery(
    api.sharing.getPendingInvites,
    isGuest || !subscriptionId ? "skip" : { subscriptionId: subscriptionId as Id<"subscriptions"> },
  );

  return invites;
}

/**
 * Hook to get ROI info for a subscription
 */
export function useSubscriptionROI(subscriptionId: string | undefined) {
  const { isGuest } = useGuestMode();

  const roi = useQuery(
    api.sharing.getSubscriptionROI,
    isGuest || !subscriptionId ? "skip" : { subscriptionId: subscriptionId as Id<"subscriptions"> },
  );

  return roi;
}

/**
 * Hook to get invite info by token
 */
export function useInviteInfo(token: string | undefined) {
  const info = useQuery(api.sharing.getInviteInfo, token ? { token } : "skip");

  return info;
}
