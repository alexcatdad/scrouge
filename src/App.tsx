import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InviteClaim } from "./components/InviteClaim";
import { SubscriptionDashboard } from "./components/SubscriptionDashboard";
import { GuestModeProvider, useGuestMode } from "./lib/guestMode";
import { I18nProvider } from "./lib/i18n";
import { useMigration } from "./lib/useMigration";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";

// Simple URL path parser for invite links
function useInviteToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/invite\/([a-zA-Z0-9]+)$/);
      setToken(match ? match[1] : null);
    };

    checkPath();
    window.addEventListener("popstate", checkPath);
    return () => window.removeEventListener("popstate", checkPath);
  }, []);

  const clearToken = () => {
    window.history.pushState({}, "", "/");
    setToken(null);
  };

  return { token, clearToken };
}

function AppContent() {
  const { isGuest, exitGuestMode } = useGuestMode();
  const { token: inviteToken, clearToken: clearInviteToken } = useInviteToken();

  // Show invite claim page if there's an invite token
  if (inviteToken) {
    return (
      <div className="min-h-screen flex flex-col relative">
        {/* Background layers */}
        <div className="bg-pattern" />
        <div className="bg-noise" />
        <div className="bg-orb bg-orb-gold" />
        <div className="bg-orb bg-orb-teal" />

        {/* Header */}
        <header className="header-nav">
          <div className="max-w-7xl mx-auto h-16 flex justify-between items-center px-6">
            <div className="header-logo">
              <div className="header-logo-icon">
                <svg
                  className="w-4 h-4 text-[#0a0a0b]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="header-logo-text">Scrouge</span>
            </div>
          </div>
        </header>

        {/* Invite claim content */}
        <main className="flex-1 relative z-10">
          <InviteClaim token={inviteToken} onClose={clearInviteToken} />
        </main>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(39, 39, 42, 0.95)",
              border: "1px solid rgba(113, 113, 122, 0.2)",
              color: "#fafafa",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background layers */}
      <div className="bg-pattern" />
      <div className="bg-noise" />
      <div className="bg-orb bg-orb-gold" />
      <div className="bg-orb bg-orb-teal" />

      {/* Header */}
      <header className="header-nav">
        <div className="max-w-7xl mx-auto h-16 flex justify-between items-center px-6">
          <div className="header-logo">
            <div className="header-logo-icon">
              <svg
                className="w-4 h-4 text-[#0a0a0b]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="header-logo-text">Scrouge</span>
            {isGuest && <span className="guest-badge ml-3">Guest</span>}
          </div>
          {isGuest ? (
            <button
              onClick={() => void exitGuestMode()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
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
            background: "rgba(39, 39, 42, 0.95)",
            border: "1px solid rgba(113, 113, 122, 0.2)",
            color: "#fafafa",
            backdropFilter: "blur(12px)",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <GuestModeProvider>
          <AppContent />
        </GuestModeProvider>
      </I18nProvider>
    </ErrorBoundary>
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
            <span className="text-gradient-gold">
              {loggedInUser?.email?.split("@")[0] || "friend"}
            </span>
          </h1>
          <p className="text-secondary text-lg">
            Track your subscriptions, manage spending, stay in control.
          </p>
        </div>
        <SubscriptionDashboard />
      </Authenticated>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[80vh] py-16">
          {/* Hero section */}
          <div className="text-center mb-20 max-w-3xl animate-fade-in-up">
            {/* Pill badge */}
            <div className="pill-badge mb-8 animate-fade-in-scale">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Premium Subscription Tracker
            </div>

            {/* Main headline */}
            <h1 className="font-display hero-headline font-bold mb-6">
              <span className="text-white block">Master Your</span>
              <span className="text-gradient-gold-shimmer">Subscriptions</span>
            </h1>

            {/* Subtext */}
            <p className="hero-subtext max-w-xl mx-auto text-balance">
              Effortlessly track every subscription, monitor spending patterns, and reclaim control
              of your finances.
            </p>

            {/* Decorative element */}
            <div className="decorative-dots mt-8 animate-fade-in animate-stagger-2">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 w-full max-w-4xl">
            <div className="feature-card animate-fade-in-up animate-stagger-1">
              <span className="feature-number">01</span>
              <div className="icon-container icon-container-gold">
                <svg
                  className="w-5 h-5 text-primary relative z-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg mb-2 relative z-10">
                Payment Tracking
              </h3>
              <p className="text-secondary text-sm leading-relaxed relative z-10">
                Link cards and accounts. Know exactly where every dollar flows.
              </p>
            </div>

            <div className="feature-card animate-fade-in-up animate-stagger-2">
              <span className="feature-number">02</span>
              <div className="icon-container icon-container-teal">
                <svg
                  className="w-5 h-5 text-accent-teal relative z-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg mb-2 relative z-10">AI Assistant</h3>
              <p className="text-secondary text-sm leading-relaxed relative z-10">
                Conversational management. Add and analyze subscriptions naturally.
              </p>
            </div>

            <div className="feature-card animate-fade-in-up animate-stagger-3">
              <span className="feature-number">03</span>
              <div className="icon-container icon-container-coral">
                <svg
                  className="w-5 h-5 text-accent-coral relative z-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg mb-2 relative z-10">
                Smart Insights
              </h3>
              <p className="text-secondary text-sm leading-relaxed relative z-10">
                Real-time analytics and alerts before charges hit.
              </p>
            </div>
          </div>

          {/* Sign in form */}
          <div className="w-full max-w-md animate-fade-in-up animate-stagger-4">
            <div className="glass-card-elevated p-8">
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl font-semibold mb-2 text-white">Get Started</h2>
                <p className="text-secondary text-sm">
                  Sign in to take control of your subscriptions
                </p>
              </div>
              <SignInForm />
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center mt-16 animate-fade-in animate-stagger-5">
            <div className="inline-flex items-center gap-2 text-secondary/50 text-sm">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <span>Your data is encrypted and secure</span>
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
