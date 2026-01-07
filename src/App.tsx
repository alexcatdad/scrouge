import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { SubscriptionDashboard } from "./components/SubscriptionDashboard";
import { GuestModeProvider, useGuestMode } from "./lib/guestMode";
import { useMigration } from "./lib/useMigration";

function AppContent() {
  const { isGuest, exitGuestMode } = useGuestMode();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background layers */}
      <div className="bg-pattern" />
      <div className="bg-noise" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(113,113,122,0.15)] bg-[rgba(9,9,11,0.8)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#c4914a] flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-5 h-5 text-[#09090b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-display text-xl font-semibold tracking-tight text-gradient-gold">
              Scrouge
            </span>
            {isGuest && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                Guest Mode
              </span>
            )}
          </div>
          {isGuest ? (
            <button
              onClick={() => void exitGuestMode()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Exit Guest Mode
            </button>
          ) : (
            <Authenticated>
              <SignOutButton />
            </Authenticated>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10">
        <Content />
      </main>

      {/* Custom Toaster styling */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(39, 39, 42, 0.95)',
            border: '1px solid rgba(113, 113, 122, 0.2)',
            color: '#fafafa',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <GuestModeProvider>
      <AppContent />
    </GuestModeProvider>
  );
}

function Content() {
  const { isGuest } = useGuestMode();
  const loggedInUser = useQuery(api.auth.loggedInUser, isGuest ? "skip" : undefined);
  
  // Handle migration when user becomes authenticated
  const isAuthenticated = loggedInUser !== undefined && loggedInUser !== null;
  const { isMigrating } = useMigration(isAuthenticated);

  // Show loading only for authenticated users (not guests)
  if (!isGuest && loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  // Show migration in progress
  if (isMigrating) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="spinner" />
        <p className="text-secondary">Migrating your guest data...</p>
      </div>
    );
  }

  // Guest mode - show dashboard with local data
  if (isGuest) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-10 animate-fade-in-up">
          <p className="text-secondary text-sm font-medium tracking-wide uppercase mb-2">
            Guest Mode
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-3">
            <span className="text-gradient-gold">Welcome, Guest</span>
          </h1>
          <p className="text-secondary text-lg">
            Your data is stored locally. Create an account to sync across devices.
          </p>
        </div>
        <SubscriptionDashboard />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Authenticated>
        <div className="mb-10 animate-fade-in-up">
          <p className="text-secondary text-sm font-medium tracking-wide uppercase mb-2">
            Welcome back
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-3">
            <span className="text-gradient-gold">{loggedInUser?.email?.split('@')[0] || "friend"}</span>
          </h1>
          <p className="text-secondary text-lg">
            Track your subscriptions, manage spending, stay in control.
          </p>
        </div>
        <SubscriptionDashboard />
      </Authenticated>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
          {/* Hero section */}
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Premium Subscription Tracker
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Master Your</span>
              <br />
              <span className="text-gradient-gold">Subscriptions</span>
            </h1>
            <p className="text-secondary text-xl max-w-xl mx-auto text-balance leading-relaxed">
              Effortlessly track every subscription, monitor spending patterns, and reclaim control of your finances.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16 w-full max-w-4xl">
            <div className="feature-card animate-fade-in-up animate-stagger-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg mb-2">Payment Tracking</h3>
              <p className="text-secondary text-sm leading-relaxed">
                Link cards and accounts. Know exactly where every dollar flows.
              </p>
            </div>

            <div className="feature-card animate-fade-in-up animate-stagger-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 border border-accent-teal/20 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg mb-2">AI Assistant</h3>
              <p className="text-secondary text-sm leading-relaxed">
                Conversational management. Add and analyze subscriptions naturally.
              </p>
            </div>

            <div className="feature-card animate-fade-in-up animate-stagger-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-coral/20 to-accent-coral/5 border border-accent-coral/20 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-accent-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg mb-2">Smart Insights</h3>
              <p className="text-secondary text-sm leading-relaxed">
                Real-time analytics and alerts before charges hit.
              </p>
            </div>
          </div>

          {/* Sign in form */}
          <div className="w-full max-w-md animate-fade-in-up animate-stagger-4">
            <div className="glass-card-elevated p-8">
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-semibold mb-2">Get Started</h2>
                <p className="text-secondary text-sm">Sign in to take control of your subscriptions</p>
              </div>
              <SignInForm />
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-secondary/60 text-sm mt-12 animate-fade-in">
            Your data is encrypted and secure. We never share your information.
          </p>
        </div>
      </Unauthenticated>
    </div>
  );
}
