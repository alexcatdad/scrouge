import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SubscriptionList } from "./SubscriptionList";
import { AddSubscriptionForm } from "./AddSubscriptionForm";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { ChatInterface } from "./ChatInterface";
import { DashboardStats } from "./DashboardStats";

export function SubscriptionDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "subscriptions" | "payments" | "chat">("overview");
  
  const subscriptions = useQuery(api.subscriptions.list, {});
  const paymentMethods = useQuery(api.paymentMethods.list, {});
  const upcomingBills = useQuery(api.subscriptions.getUpcoming, { days: 30 });
  const totalCosts = useQuery(api.subscriptions.getTotalCost, {});

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "subscriptions", label: "Subscriptions", icon: "📱" },
    { id: "payments", label: "Payment Methods", icon: "💳" },
    { id: "chat", label: "AI Assistant", icon: "🤖" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <DashboardStats 
            subscriptions={subscriptions}
            upcomingBills={upcomingBills}
            totalCosts={totalCosts}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Subscriptions</h3>
              <div className="space-y-3">
                {subscriptions?.slice(0, 5).map((sub) => (
                  <div key={sub._id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-sm text-gray-500">{sub.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{sub.currency} {sub.cost}</p>
                      <p className="text-sm text-gray-500">{sub.billingCycle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Upcoming Bills</h3>
              <div className="space-y-3">
                {upcomingBills?.slice(0, 5).map((sub) => (
                  <div key={sub._id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(sub.nextBillingDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{sub.currency} {sub.cost}</p>
                      <p className="text-sm text-gray-500">{sub.paymentMethod?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "subscriptions" && (
        <div className="space-y-6">
          <AddSubscriptionForm paymentMethods={paymentMethods || []} />
          <SubscriptionList subscriptions={subscriptions || []} />
        </div>
      )}

      {activeTab === "payments" && (
        <PaymentMethodManager paymentMethods={paymentMethods || []} />
      )}

      {activeTab === "chat" && (
        <ChatInterface />
      )}
    </div>
  );
}
