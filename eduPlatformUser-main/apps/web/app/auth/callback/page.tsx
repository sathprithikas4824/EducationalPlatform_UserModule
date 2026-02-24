"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, updateUserProviders } from "../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/");
  const [providerName, setProviderName] = useState("Google");

  useEffect(() => {
    const handleCallback = async () => {
      if (!supabase) {
        router.push("/login");
        return;
      }

      // Supabase JS auto-exchanges the OAuth code in the URL for a session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        router.push("/login?error=auth_failed");
        return;
      }

      // Track which auth providers this user has used
      await updateUserProviders(session.user.id);

      // Store redirect destination
      const dest =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem("auth_redirect") || "/"
          : "/";
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("auth_redirect");
      }
      setRedirectTo(dest);

      // Check if user already has email/password set up
      const { data: identitiesData } = await supabase.auth.getUserIdentities();
      const identities = identitiesData?.identities || [];
      const hasEmailProvider = identities.some((i) => i.provider === "email");

      // Find the OAuth provider name for display
      const oauthIdentity = identities.find((i) => i.provider !== "email");
      if (oauthIdentity) {
        setProviderName(
          oauthIdentity.provider.charAt(0).toUpperCase() +
          oauthIdentity.provider.slice(1)
        );
      }

      if (!hasEmailProvider) {
        // OAuth-only user — show optional password setup
        setShowPasswordSetup(true);
      } else {
        // Already has email/password — go directly
        router.push(dest);
        router.refresh();
      }
    };

    handleCallback();
  }, [router]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 2000);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push(redirectTo);
    router.refresh();
  };

  // Loading screen — while completing OAuth
  if (!showPasswordSetup) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}
      >
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "#7a12fa", borderTopColor: "transparent" }}
          />
          <p className="text-gray-500 text-sm">Completing sign in...</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold text-lg">Password set successfully!</p>
          <p className="text-gray-400 text-sm mt-1">Redirecting you now...</p>
        </div>
      </div>
    );
  }

  // Optional password setup screen
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
            >
              <img src="/logo.svg" alt="Logo" className="w-5 h-5 brightness-0 invert" />
            </div>
            <span className="text-xl font-bold text-gray-900">EduPlatform</span>
          </Link>
        </div>

        <div
          className="bg-white rounded-2xl p-8"
          style={{
            boxShadow: "0 4px 24px 0 rgba(124, 58, 237, 0.08), 0 1px 4px 0 rgba(0,0,0,0.06)",
            border: "1px solid rgba(140, 140, 170, 0.2)",
          }}
        >
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #7a12fa22, #b614ef22)" }}
          >
            <svg className="w-6 h-6" style={{ color: "#7a12fa" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a password?</h1>
          <p className="text-gray-500 text-sm mb-6">
            You signed in with <span className="font-semibold text-gray-700">{providerName}</span>.
            Optionally add a password so you can also log in with your email.
            <span className="text-gray-400"> (You can always skip this.)</span>
          </p>

          {/* Optional badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-5"
            style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Optional — not required
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-shadow"
                onFocus={(e) => {
                  e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)";
                  e.target.style.borderColor = "#7a12fa";
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = "";
                  e.target.style.borderColor = "";
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-shadow"
                onFocus={(e) => {
                  e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)";
                  e.target.style.borderColor = "#7a12fa";
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = "";
                  e.target.style.borderColor = "";
                }}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              {/* Skip */}
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1 py-3 px-4 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Skip for now
              </button>

              {/* Set Password */}
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="flex-1 py-3 px-4 text-white text-sm font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                style={{
                  backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)",
                  boxShadow: "0 2px 8px 0 rgba(122, 18, 250, 0.35)",
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Set password"
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can always set or change your password later in account settings.
        </p>
      </div>
    </div>
  );
}
