import { useState } from "react";
import { toast } from "sonner";
import type { BillingCycle } from "../lib/guestDb";
import { type UnifiedPaymentMethod, useSubscriptionMutations } from "../lib/useSubscriptionData";

interface AddSubscriptionFormProps {
  paymentMethods: UnifiedPaymentMethod[];
}

export function AddSubscriptionForm({ paymentMethods }: AddSubscriptionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cost: "",
    currency: "USD",
    billingCycle: "monthly" as BillingCycle,
    paymentMethodId: "",
    category: "",
    website: "",
    notes: "",
    isFamilyPlan: false,
    maxSlots: "",
  });

  const { create: createSubscription } = useSubscriptionMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.paymentMethodId) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      const now = new Date();
      switch (formData.billingCycle) {
        case "monthly":
          now.setMonth(now.getMonth() + 1);
          break;
        case "yearly":
          now.setFullYear(now.getFullYear() + 1);
          break;
        case "weekly":
          now.setDate(now.getDate() + 7);
          break;
        case "daily":
          now.setDate(now.getDate() + 1);
          break;
      }

      await createSubscription({
        name: formData.name,
        description: formData.description || undefined,
        cost: Number.parseFloat(formData.cost),
        currency: formData.currency,
        billingCycle: formData.billingCycle,
        nextBillingDate: now.getTime(),
        paymentMethodId: formData.paymentMethodId,
        category: formData.category,
        website: formData.website || undefined,
        notes: formData.notes || undefined,
        maxSlots:
          formData.isFamilyPlan && formData.maxSlots
            ? Number.parseInt(formData.maxSlots)
            : undefined,
      });

      toast.success("Subscription added successfully!");
      setIsOpen(false);
      setFormData({
        name: "",
        description: "",
        cost: "",
        currency: "USD",
        billingCycle: "monthly" as BillingCycle,
        paymentMethodId: "",
        category: "",
        website: "",
        notes: "",
        isFamilyPlan: false,
        maxSlots: "",
      });
    } catch (error) {
      toast.error("Failed to add subscription");
      console.error(error);
    }
  };

  const categories = [
    "Entertainment",
    "Software",
    "Cloud Services",
    "News & Media",
    "Fitness",
    "Food & Delivery",
    "Transportation",
    "Education",
    "Finance",
    "Productivity",
    "Gaming",
    "Other",
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-4 px-6 glass-card flex items-center justify-center gap-3 text-primary font-medium hover:border-primary/30 transition-all group"
      >
        <svg
          className="w-5 h-5 transition-transform group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add New Subscription
      </button>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)] flex justify-between items-center">
        <h3 className="font-semibold text-white">Add New Subscription</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-white hover:bg-white/5 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Service Name <span className="text-accent-coral">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Netflix, Spotify, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Category <span className="text-accent-coral">*</span>
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-field"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Cost <span className="text-accent-coral">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              className="input-field"
              placeholder="9.99"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="input-field"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Billing Cycle <span className="text-accent-coral">*</span>
            </label>
            <select
              required
              value={formData.billingCycle}
              onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any })}
              className="input-field"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Payment Method <span className="text-accent-coral">*</span>
            </label>
            <select
              required
              value={formData.paymentMethodId}
              onChange={(e) => setFormData({ ...formData, paymentMethodId: e.target.value })}
              className="input-field"
            >
              <option value="">Select payment method</option>
              {paymentMethods.map((method) => (
                <option key={method._id} value={method._id}>
                  {method.name} ({method.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Family Plan Section */}
        <div className="border-t border-[rgba(113,113,122,0.15)] pt-5 mt-2">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, isFamilyPlan: !formData.isFamilyPlan, maxSlots: "" })
              }
              className={`relative w-11 h-6 rounded-full transition-colors ${
                formData.isFamilyPlan ? "bg-primary" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  formData.isFamilyPlan ? "translate-x-5" : ""
                }`}
              />
            </button>
            <label className="text-sm font-medium text-secondary">Family/Shared Plan</label>
          </div>

          {formData.isFamilyPlan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Max Slots <span className="text-accent-coral">*</span>
                </label>
                <input
                  type="number"
                  min="2"
                  required={formData.isFamilyPlan}
                  value={formData.maxSlots}
                  onChange={(e) => setFormData({ ...formData, maxSlots: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 5 for a family plan"
                />
                <p className="text-xs text-secondary/60 mt-1">
                  Total number of people who can use this subscription
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Website</label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="input-field"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-field"
            placeholder="Brief description of the service"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="input-field resize-none"
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            Add Subscription
          </button>
          <button type="button" onClick={() => setIsOpen(false)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
