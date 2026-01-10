import { useState } from "react";
import { toast } from "sonner";
import { type UnifiedSubscription, useSubscriptionMutations } from "../lib/useSubscriptionData";

interface SubscriptionListProps {
  subscriptions: UnifiedSubscription[];
}

export function SubscriptionList({ subscriptions }: SubscriptionListProps) {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const [sortBy, setSortBy] = useState<"name" | "cost" | "nextBilling">("nextBilling");

  const { update: updateSubscription, remove: removeSubscription } = useSubscriptionMutations();

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filter === "active") return sub.isActive;
    if (filter === "inactive") return !sub.isActive;
    return true;
  });

  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "cost":
        return b.cost - a.cost;
      case "nextBilling":
        return a.nextBillingDate - b.nextBillingDate;
      default:
        return 0;
    }
  });

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateSubscription(id, { isActive: !isActive });
      toast.success(`Subscription ${!isActive ? "activated" : "paused"}`);
    } catch (_error) {
      toast.error("Failed to update subscription");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await removeSubscription(id);
        toast.success("Subscription deleted");
      } catch (_error) {
        toast.error("Failed to delete subscription");
      }
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getDaysUntilBilling = (nextBillingDate: number) => {
    return Math.ceil((nextBillingDate - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-semibold text-white">Your Subscriptions</h3>

          <div className="flex gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="input-field !py-2 !px-3 !text-sm !w-auto"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-field !py-2 !px-3 !text-sm !w-auto"
            >
              <option value="nextBilling">Next Billing</option>
              <option value="name">Name</option>
              <option value="cost">Cost</option>
            </select>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[rgba(113,113,122,0.1)]">
        {sortedSubscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <p className="text-secondary">No subscriptions found</p>
            <p className="text-secondary/60 text-sm mt-1">
              Add your first subscription to get started
            </p>
          </div>
        ) : (
          sortedSubscriptions.map((subscription) => {
            const daysUntilBilling = getDaysUntilBilling(subscription.nextBillingDate);
            const isUrgent = daysUntilBilling <= 7 && daysUntilBilling > 0;

            return (
              <div key={subscription._id} className="p-6 hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg text-white">{subscription.name}</h4>
                      <span
                        className={`badge ${subscription.isActive ? "badge-teal" : "badge-muted"}`}
                      >
                        {subscription.isActive ? "Active" : "Paused"}
                      </span>
                      <span className="badge badge-gold">{subscription.category}</span>
                    </div>

                    {subscription.description && (
                      <p className="text-secondary text-sm mb-3">{subscription.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <span className="text-secondary">
                        <span className="text-white font-medium">
                          {formatCurrency(subscription.cost, subscription.currency)}
                        </span>
                        <span className="text-secondary/60"> / {subscription.billingCycle}</span>
                      </span>
                      {subscription.paymentMethod && (
                        <span className="text-secondary">{subscription.paymentMethod.name}</span>
                      )}
                      {subscription.isActive && (
                        <span
                          className={isUrgent ? "text-accent-coral font-medium" : "text-secondary"}
                        >
                          {daysUntilBilling > 0
                            ? `Due in ${daysUntilBilling} days`
                            : daysUntilBilling === 0
                              ? "Due today"
                              : "Overdue"}
                        </span>
                      )}
                      {subscription.website && (
                        <a
                          href={subscription.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-1"
                        >
                          Visit
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </div>

                    {subscription.notes && (
                      <p className="text-secondary/60 text-sm mt-2 italic">{subscription.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(subscription._id, subscription.isActive)}
                      className={subscription.isActive ? "btn-ghost" : "btn-success"}
                    >
                      {subscription.isActive ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(subscription._id, subscription.name)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
