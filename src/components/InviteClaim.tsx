import { Authenticated, Unauthenticated } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInviteInfo, useSharingMutations } from "../lib/useSubscriptionData";
import { SignInForm } from "../SignInForm";

interface InviteClaimProps {
  token: string;
  onClose: () => void;
}

export function InviteClaim({ token, onClose }: InviteClaimProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const inviteInfo = useInviteInfo(token);
  const { claimInvite } = useSharingMutations();

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const result = await claimInvite(token);
      if (result.success) {
        toast.success("Subscription added to your list!");
        // Redirect to dashboard
        window.history.pushState({}, "", "/");
        onClose();
      } else {
        toast.error(result.reason);
      }
    } catch (_error) {
      toast.error("Failed to claim invite");
    } finally {
      setIsClaiming(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Loading state
  if (inviteInfo === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  // Invalid invite
  if (!inviteInfo.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-coral/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-accent-coral"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Invalid Invite</h2>
          <p className="text-secondary mb-6">{inviteInfo.reason}</p>
          <button onClick={onClose} className="btn-primary w-full">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Valid invite - show preview
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full overflow-hidden">
        <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)]">
          <h2 className="text-xl font-semibold text-white">You've been invited!</h2>
        </div>

        <div className="p-6">
          {/* Subscription Preview */}
          <div className="p-4 rounded-xl bg-white/5 border border-[rgba(113,113,122,0.15)] mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">{inviteInfo.subscriptionName}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary">Cost</span>
                <span className="text-white">
                  {formatCurrency(inviteInfo.cost, inviteInfo.currency)} / {inviteInfo.billingCycle}
                </span>
              </div>
              {inviteInfo.ownerName && (
                <div className="flex justify-between">
                  <span className="text-secondary">Paid by</span>
                  <span className="text-white">{inviteInfo.ownerName}</span>
                </div>
              )}
              {inviteInfo.maxSlots && (
                <div className="flex justify-between">
                  <span className="text-secondary">Plan type</span>
                  <span className="text-white">Family ({inviteInfo.maxSlots} slots)</span>
                </div>
              )}
            </div>
          </div>

          <Authenticated>
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isClaiming ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add to My Subscriptions
                </>
              )}
            </button>
            <p className="text-xs text-secondary/60 text-center mt-3">
              This subscription will appear in your list with limited details
            </p>
          </Authenticated>

          <Unauthenticated>
            <div className="text-center mb-4">
              <p className="text-secondary text-sm">Sign in to accept this invite</p>
            </div>
            <SignInForm />
          </Unauthenticated>
        </div>

        <div className="px-6 py-4 border-t border-[rgba(113,113,122,0.15)] bg-white/[0.02]">
          <button
            onClick={onClose}
            className="text-secondary hover:text-white text-sm transition-colors"
          >
            Cancel and go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
