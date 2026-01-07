"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useGuestMode } from "./lib/guestMode";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const { enterGuestMode } = useGuestMode();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  const handleGuestMode = () => {
    enterGuestMode();
    toast.success("Welcome! You're browsing as a guest. Your data is stored locally.");
  };

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "Invalid password. Please try again.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "Could not sign in, did you mean to sign up?"
                  : "Could not sign up, did you mean to sign in?";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email address"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            flow === "signIn" ? "Sign in" : "Create account"
          )}
        </button>
        <div className="text-center text-sm text-secondary">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover font-medium transition-colors"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(113,113,122,0.3)] to-transparent" />
        <span className="text-secondary text-sm">or continue with</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(113,113,122,0.3)] to-transparent" />
      </div>

      <div className="flex flex-col gap-3">
        <button
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-[rgba(113,113,122,0.2)] text-white font-medium hover:bg-white/10 hover:border-[rgba(113,113,122,0.3)] transition-all"
          onClick={() => void signIn("github")}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          GitHub
        </button>

        <button
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#fd4f00]/10 border border-[#fd4f00]/20 text-[#fd4f00] font-medium hover:bg-[#fd4f00]/20 hover:border-[#fd4f00]/30 transition-all"
          onClick={() => void signIn("authentik")}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
          </svg>
          Authentik
        </button>

        <button
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-[rgba(113,113,122,0.2)] text-secondary font-medium hover:bg-white/10 hover:text-white hover:border-[rgba(113,113,122,0.3)] transition-all"
          onClick={handleGuestMode}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Continue as guest
        </button>
      </div>
    </div>
  );
}
