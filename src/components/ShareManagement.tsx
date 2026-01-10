import { useState } from "react";
import { toast } from "sonner";
import {
  usePendingInvites,
  useSharingMutations,
  useSubscriptionROI,
  useSubscriptionShares,
} from "../lib/useSubscriptionData";

interface ShareManagementProps {
  subscriptionId: string;
  subscriptionName: string;
  maxSlots?: number;
  onClose: () => void;
}

export function ShareManagement({
  subscriptionId,
  subscriptionName,
  maxSlots,
  onClose,
}: ShareManagementProps) {
  const [newMemberName, setNewMemberName] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const shares = useSubscriptionShares(subscriptionId);
  const pendingInvites = usePendingInvites(subscriptionId);
  const roi = useSubscriptionROI(subscriptionId);
  const { addAnonymousShare, createInviteLink, removeShare, revokeInvite } = useSharingMutations();

  const handleAddAnonymousMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    try {
      await addAnonymousShare(subscriptionId, newMemberName.trim());
      toast.success(`Added ${newMemberName} to the plan`);
      setNewMemberName("");
    } catch (error) {
      toast.error("Failed to add member");
      console.error(error);
    }
  };

  const handleCreateInviteLink = async () => {
    setIsCreatingInvite(true);
    try {
      const result = await createInviteLink(subscriptionId, 7);
      const inviteUrl = `${window.location.origin}/invite/${result.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard!");
      setCopiedToken(result.token);
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (error) {
      toast.error("Failed to create invite link");
      console.error(error);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRemoveShare = async (shareId: string, name?: string) => {
    if (confirm(`Remove ${name || "this member"} from the plan?`)) {
      try {
        await removeShare(shareId);
        toast.success("Member removed");
      } catch (error) {
        toast.error("Failed to remove member");
        console.error(error);
      }
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId);
      toast.success("Invite revoked");
    } catch (error) {
      toast.error("Failed to revoke invite");
      console.error(error);
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied!");
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)] flex justify-between items-center sticky top-0 bg-[#18181b]">
          <div>
            <h3 className="font-semibold text-white">Manage Sharing</h3>
            <p className="text-sm text-secondary mt-1">{subscriptionName}</p>
          </div>
          <button
            onClick={onClose}
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

        <div className="p-6 space-y-6">
          {/* ROI Section */}
          {roi && roi.hasSlots && (
            <div className="p-4 rounded-xl bg-white/5 border border-[rgba(113,113,122,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-secondary">Plan Usage</span>
                <span className="text-sm text-white">
                  {roi.usedSlots} / {roi.maxSlots} slots
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(roi.usedSlots / roi.maxSlots) * 100}%` }}
                />
              </div>
              {roi.unusedSlots > 0 && (
                <div className="flex items-center gap-2 text-accent-coral">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-sm">
                    {roi.unusedSlots} unused slot{roi.unusedSlots > 1 ? "s" : ""} -{" "}
                    {formatCurrency(roi.wastedAmount, roi.currency)}/cycle wasted
                  </span>
                </div>
              )}
              {roi.unusedSlots === 0 && (
                <div className="flex items-center gap-2 text-accent-teal">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm">All slots in use - great value!</span>
                </div>
              )}
            </div>
          )}

          {/* Current Members */}
          <div>
            <h4 className="text-sm font-medium text-secondary mb-3">
              Shared With ({shares?.length || 0})
            </h4>
            {shares && shares.length > 0 ? (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {(share.userName || share.name || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-white">{share.userName || share.name}</p>
                        <p className="text-xs text-secondary">
                          {share.type === "user" ? "App user" : "Added manually"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share._id, share.userName || share.name)}
                      className="p-2 rounded-lg text-secondary hover:text-accent-coral hover:bg-white/5 transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary/60">No one added yet</p>
            )}
          </div>

          {/* Add Anonymous Member */}
          <div>
            <h4 className="text-sm font-medium text-secondary mb-3">Add Member (by name)</h4>
            <form onSubmit={handleAddAnonymousMember} className="flex gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="e.g., Mom, Dad, Sister..."
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary" disabled={!newMemberName.trim()}>
                Add
              </button>
            </form>
            <p className="text-xs text-secondary/60 mt-2">
              For people who don't use this app - just track them by name
            </p>
          </div>

          {/* Invite Link */}
          <div>
            <h4 className="text-sm font-medium text-secondary mb-3">Invite via Link</h4>
            <button
              onClick={handleCreateInviteLink}
              disabled={isCreatingInvite}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {isCreatingInvite ? (
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
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Create Invite Link
                </>
              )}
            </button>
            <p className="text-xs text-secondary/60 mt-2">
              For people who use this app - they'll see your subscription in their list
            </p>
          </div>

          {/* Pending Invites */}
          {pendingInvites && pendingInvites.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-secondary mb-3">Pending Invites</h4>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div>
                      <p className="text-sm text-white font-mono">...{invite.token.slice(-8)}</p>
                      <p className="text-xs text-secondary">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyInviteLink(invite.token)}
                        className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white/5 transition-all"
                      >
                        {copiedToken === invite.token ? (
                          <svg
                            className="w-4 h-4 text-accent-teal"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleRevokeInvite(invite._id)}
                        className="p-2 rounded-lg text-secondary hover:text-accent-coral hover:bg-white/5 transition-all"
                      >
                        <svg
                          className="w-4 h-4"
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
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
