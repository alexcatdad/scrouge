import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { SubscriptionDashboard } from "./components/SubscriptionDashboard";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">SubTracker</h2>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 p-4">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Authenticated>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {loggedInUser?.email?.split('@')[0] || "friend"}!
          </h1>
          <p className="text-gray-600">
            Manage your subscriptions and track your spending
          </p>
        </div>
        <SubscriptionDashboard />
      </Authenticated>
      
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              SubTracker
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Track all your subscriptions in one place
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-2">💳 Payment Tracking</h3>
                <p className="text-gray-600 text-sm">Track which card or account each subscription uses</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-2">🤖 AI Chat</h3>
                <p className="text-gray-600 text-sm">Add and manage subscriptions through natural conversation</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-2">🔗 API Integration</h3>
                <p className="text-gray-600 text-sm">Automatically fetch pricing from service websites</p>
              </div>
            </div>
          </div>
          <div className="w-full max-w-md">
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
