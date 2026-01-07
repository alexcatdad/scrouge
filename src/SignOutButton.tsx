"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="px-4 py-2 rounded-lg bg-white/5 text-secondary border border-[rgba(113,113,122,0.2)] font-medium text-sm hover:bg-white/10 hover:text-white hover:border-[rgba(113,113,122,0.3)] transition-all"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
