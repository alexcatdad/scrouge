import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface PaymentMethod {
  _id: string;
  name: string;
  type: string;
  lastFourDigits?: string;
  expiryDate?: string;
  isDefault: boolean;
}

interface PaymentMethodManagerProps {
  paymentMethods: PaymentMethod[];
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

  const createPaymentMethod = useMutation(api.paymentMethods.create);
  const updatePaymentMethod = useMutation(api.paymentMethods.update);
  const removePaymentMethod = useMutation(api.paymentMethods.remove);

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

      toast.success("Payment method added successfully!");
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
      await updatePaymentMethod({ id: id as any, isDefault: true });
      toast.success("Default payment method updated");
    } catch (error) {
      toast.error("Failed to update payment method");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await removePaymentMethod({ id: id as any });
        toast.success("Payment method deleted");
      } catch (error: any) {
        toast.error(error.message || "Failed to delete payment method");
      }
    }
  };

  const paymentTypeLabels = {
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_account: "Bank Account",
    paypal: "PayPal",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Add Payment Method
          </button>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Add Payment Method</h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Visa Card, Chase Checking, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(paymentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.lastFourDigits}
                    onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="month"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  Set as default payment method
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Payment Method
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Payment Methods</h3>
        </div>

        <div className="divide-y">
          {paymentMethods.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No payment methods added yet.</p>
              <p className="text-sm mt-1">Add a payment method to start tracking subscriptions!</p>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div key={method._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{method.name}</h4>
                      {method.isDefault && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>
                        <strong>Type:</strong> {paymentTypeLabels[method.type as keyof typeof paymentTypeLabels]}
                      </span>
                      {method.lastFourDigits && (
                        <span>
                          <strong>Ending in:</strong> ••••{method.lastFourDigits}
                        </span>
                      )}
                      {method.expiryDate && (
                        <span>
                          <strong>Expires:</strong> {new Date(method.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method._id)}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        Set Default
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDelete(method._id, method.name)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
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
