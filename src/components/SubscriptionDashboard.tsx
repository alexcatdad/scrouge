import { useState } from "react";
import { useGuestMode } from "../lib/guestMode";
import {
  usePaymentMethods,
  useSubscriptions,
  useTotalCosts,
  useUpcomingBills,
} from "../lib/useSubscriptionData";
import { AddSubscriptionForm } from "./AddSubscriptionForm";
import { AISettingsPage } from "./AISettingsPage";
import { ChatInterface } from "./ChatInterface";
import { DashboardStats } from "./DashboardStats";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { SubscriptionList } from "./SubscriptionList";

export function SubscriptionDashboard() {
  const { isGuest } = useGuestMode();
  const [activeTab, setActiveTab] = useState<
    "overview" | "subscriptions" | "payments" | "chat" | "settings"
  >("overview");

  const subscriptions = useSubscriptions();
  const paymentMethods = usePaymentMethods();
  const upcomingBills = useUpcomingBills(30);
  const totalCosts = useTotalCosts();

  // Filter out settings tab for guest users
  const allTabs = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      id: "subscriptions",
      label: "Subscriptions",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      id: "payments",
      label: "Payments",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      id: "chat",
      label: "AI Assistant",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      guestHidden: false,
    },
    {
      id: "settings",
      label: "Settings",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      guestHidden: true,
    },
  ];

  // Filter tabs based on guest mode
  const tabs = isGuest ? allTabs.filter((tab) => !tab.guestHidden) : allTabs;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Tab Navigation */}
      <div className="tab-nav overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`tab-button ${activeTab === tab.id ? "tab-active" : ""}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up">
        {activeTab === "overview" && (
          <div className="space-y-8">
            <DashboardStats
              subscriptions={subscriptions}
              upcomingBills={upcomingBills}
              totalCosts={totalCosts}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Subscriptions */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Recent Subscriptions</h3>
                    <button
                      onClick={() => setActiveTab("subscriptions")}
                      className="text-primary text-sm font-medium hover:text-primary-hover transition-colors"
                    >
                      View all
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-[rgba(113,113,122,0.1)]">
                  {subscriptions?.length === 0 ? (
                    <div className="p-6 text-center text-secondary">
                      <p>No subscriptions yet</p>
                    </div>
                  ) : (
                    subscriptions?.slice(0, 5).map((sub) => (
                      <div
                        key={sub._id}
                        className="px-6 py-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors"
                      >
                        <div>
                          <p className="font-medium text-white">{sub.name}</p>
                          <p className="text-sm text-secondary">{sub.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: sub.currency,
                            }).format(sub.cost)}
                          </p>
                          <p className="text-sm text-secondary capitalize">{sub.billingCycle}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming Bills */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Upcoming Bills</h3>
                    <span className="badge badge-coral">Next 30 days</span>
                  </div>
                </div>
                <div className="divide-y divide-[rgba(113,113,122,0.1)]">
                  {upcomingBills?.length === 0 ? (
                    <div className="p-6 text-center text-secondary">
                      <p>No upcoming bills</p>
                    </div>
                  ) : (
                    upcomingBills?.slice(0, 5).map((sub) => (
                      <div
                        key={sub._id}
                        className="px-6 py-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors"
                      >
                        <div>
                          <p className="font-medium text-white">{sub.name}</p>
                          <p className="text-sm text-secondary">
                            {new Date(sub.nextBillingDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: sub.currency,
                            }).format(sub.cost)}
                          </p>
                          <p className="text-sm text-secondary">{sub.paymentMethod?.name}</p>
                        </div>
                      </div>
                    ))
                  )}
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

        {activeTab === "payments" && <PaymentMethodManager paymentMethods={paymentMethods || []} />}

        {activeTab === "chat" && <ChatInterface />}

        {activeTab === "settings" && <AISettingsPage />}
      </div>
    </div>
  );
}
