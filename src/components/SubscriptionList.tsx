import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface Subscription {
  _id: string;
  name: string;
  description?: string;
  cost: number;
  currency: string;
  billingCycle: string;
  nextBillingDate: number;
  category: string;
  website?: string;
  isActive: boolean;
  notes?: string;
  paymentMethod?: {
    _id: string;
    name: string;
    type: string;
  } | null;
}

interface SubscriptionListProps {
  subscriptions: Subscription[];
}

export function SubscriptionList({ subscriptions }: SubscriptionListProps) {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const [sortBy, setSortBy] = useState<"name" | "cost" | "nextBilling">("nextBilling");
  
  const updateSubscription = useMutation(api.subscriptions.update);
  const removeSubscription = useMutation(api.subscriptions.remove);

  const filteredSubscriptions = subscriptions.filter(sub => {
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
      await updateSubscription({ id: id as any, isActive: !isActive });
      toast.success(`Subscription ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error("Failed to update subscription");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await removeSubscription({ id: id as any });
        toast.success("Subscription deleted");
      } catch (error) {
        toast.error("Failed to delete subscription");
      }
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getDaysUntilBilling = (nextBillingDate: number) => {
    const days = Math.ceil((nextBillingDate - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-semibold">Your Subscriptions</h3>
          
          <div className="flex gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="nextBilling">Next Billing</option>
              <option value="name">Name</option>
              <option value="cost">Cost</option>
            </select>
          </div>
        </div>
      </div>

      <div className="divide-y">
        {sortedSubscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No subscriptions found.</p>
            <p className="text-sm mt-1">Add your first subscription to get started!</p>
          </div>
        ) : (
          sortedSubscriptions.map((subscription) => {
            const daysUntilBilling = getDaysUntilBilling(subscription.nextBillingDate);
            
            return (
              <div key={subscription._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{subscription.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        subscription.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {subscription.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {subscription.category}
                      </span>
                    </div>
                    
                    {subscription.description && (
                      <p className="text-gray-600 text-sm mb-2">{subscription.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>
                        <strong>Cost:</strong> {formatCurrency(subscription.cost, subscription.currency)} / {subscription.billingCycle}
                      </span>
                      <span>
                        <strong>Payment:</strong> {subscription.paymentMethod?.name} ({subscription.paymentMethod?.type})
                      </span>
                      {subscription.isActive && (
                        <span className={`${daysUntilBilling <= 7 ? 'text-red-600 font-medium' : ''}`}>
                          <strong>Next billing:</strong> {daysUntilBilling > 0 ? `in ${daysUntilBilling} days` : 'Today'}
                        </span>
                      )}
                      {subscription.website && (
                        <a 
                          href={subscription.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Visit website
                        </a>
                      )}
                    </div>
                    
                    {subscription.notes && (
                      <p className="text-gray-600 text-sm mt-2 italic">{subscription.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(subscription._id, subscription.isActive)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        subscription.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {subscription.isActive ? 'Pause' : 'Activate'}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(subscription._id, subscription.name)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
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
