import { useState } from "react";
import { toast } from "sonner";
import { type UnifiedPaymentMethod, usePaymentMethodMutations } from "../lib/useSubscriptionData";

interface PaymentMethodManagerProps {
  paymentMethods: UnifiedPaymentMethod[];
}

export function PaymentMethodManager({ paymentMethods }: PaymentMethodManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "credit_card" as const,
    lastFourDigits: "",
    expiryDate: "",
    isDefault: false,
  });

  const {
    create: createPaymentMethod,
    update: updatePaymentMethod,
    remove: removePaymentMethod,
  } = usePaymentMethodMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createPaymentMethod({
        name: formData.name,
        type: formData.type,
        lastFourDigits: formData.lastFourDigits || undefined,
        expiryDate: formData.expiryDate || undefined,
        isDefault: formData.isDefault,
      });

      toast.success("Payment method added!");
      setIsAdding(false);
      setFormData({
        name: "",
        type: "credit_card",
        lastFourDigits: "",
        expiryDate: "",
        isDefault: false,
      });
    } catch (error) {
      toast.error("Failed to add payment method");
      console.error(error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updatePaymentMethod(id, { isDefault: true });
      toast.success("Default payment method updated");
    } catch (_error) {
      toast.error("Failed to update payment method");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await removePaymentMethod(id);
        toast.success("Payment method deleted");
      } catch (error: any) {
        toast.error(error.message || "Failed to delete payment method");
      }
    }
  };

  const paymentTypeLabels: Record<string, string> = {
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_account: "Bank Account",
    paypal: "PayPal",
    other: "Other",
  };

  const paymentTypeIcons: Record<string, JSX.Element> = {
    credit_card: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
    debit_card: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
    bank_account: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
        />
      </svg>
    ),
    paypal: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .761-.654h6.96c2.317 0 4.027.587 5.079 1.744.98 1.082 1.376 2.607 1.176 4.533-.021.204-.047.41-.078.617-.609 4.069-2.732 6.142-6.308 6.159l-2.28.002a.77.77 0 0 0-.76.653l-.943 5.959a.642.642 0 0 1-.633.54H7.076z" />
      </svg>
    ),
    other: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
        />
      </svg>
    ),
  };

  return (
    <div className="space-y-6">
      {/* Add Payment Method Form */}
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
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
          Add Payment Method
        </button>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)] flex justify-between items-center">
            <h3 className="font-semibold text-white">Add Payment Method</h3>
            <button
              onClick={() => setIsAdding(false)}
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
                  Name <span className="text-accent-coral">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="My Visa Card, Chase Checking, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Type <span className="text-accent-coral">*</span>
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="input-field"
                >
                  {Object.entries(paymentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Last 4 Digits
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.lastFourDigits}
                  onChange={(e) =>
                    setFormData({ ...formData, lastFourDigits: e.target.value.replace(/\D/g, "") })
                  }
                  className="input-field"
                  placeholder="1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Expiry Date</label>
                <input
                  type="month"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 rounded border-[rgba(113,113,122,0.3)] bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-sm text-secondary">Set as default payment method</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Add Payment Method
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Methods List */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)]">
          <h3 className="font-semibold text-white">Payment Methods</h3>
        </div>

        <div className="divide-y divide-[rgba(113,113,122,0.1)]">
          {paymentMethods.length === 0 ? (
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
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <p className="text-secondary">No payment methods added</p>
              <p className="text-secondary/60 text-sm mt-1">
                Add a payment method to start tracking subscriptions
              </p>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div key={method._id} className="p-6 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-[rgba(113,113,122,0.15)] flex items-center justify-center text-secondary">
                      {paymentTypeIcons[method.type] || paymentTypeIcons.other}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">{method.name}</h4>
                        {method.isDefault && <span className="badge badge-teal">Default</span>}
                      </div>
                      <div className="flex gap-4 text-sm text-secondary">
                        <span>{paymentTypeLabels[method.type]}</span>
                        {method.lastFourDigits && <span>****{method.lastFourDigits}</span>}
                        {method.expiryDate && (
                          <span>
                            Exp:{" "}
                            {new Date(method.expiryDate).toLocaleDateString("en-US", {
                              year: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <button onClick={() => handleSetDefault(method._id)} className="btn-ghost">
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(method._id, method.name)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
