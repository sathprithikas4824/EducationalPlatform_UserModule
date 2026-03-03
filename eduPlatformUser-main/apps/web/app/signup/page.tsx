"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, signIn, signInWithOAuth, supabase } from "../lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "confirm" = waiting for email verification, "done" = already logged in
  const [stage, setStage] = useState<"form" | "confirm">("form");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSignup = async (e: React.FormEvent) => {
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
      const { data, error: signUpError } = await signUp(email, password, fullName);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data?.user) {
        // Try to sign in immediately — succeeds when email confirmation is disabled in Supabase
        const { data: signInData } = await signIn(email, password);
        if (signInData?.user) {
          // Email confirmation not required → go straight to the app
          router.push("/");
          return;
        }
        // Email confirmation required → show the confirmation screen
        setStage("confirm");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !supabase) return;
    setResendStatus("sending");
    try {
      await supabase.auth.resend({ type: "signup", email });
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
    }
  };

  const handleOAuthSignup = async (provider: "google") => {
    setError(null);
    setOauthLoading(provider);
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("auth_redirect", "/");
      }
      const { error: oauthError } = await signInWithOAuth(provider);
      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading(null);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setOauthLoading(null);
    }
  };

  // ── Confirm email screen ─────────────────────────────────────────────────────
  if (stage === "confirm") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8" style={{ boxShadow: "0 4px 24px 0 rgba(124, 58, 237, 0.08), 0 1px 4px 0 rgba(0,0,0,0.06)", border: "1px solid rgba(140, 140, 170, 0.2)" }}>
            {/* Icon */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Confirm your email</h2>
            <p className="text-gray-500 text-sm text-center mb-1">We sent a link to</p>
            <p className="font-semibold text-gray-800 text-center mb-5">{email}</p>

            {/* Warning about delivery */}
            <div className="rounded-xl p-3 mb-5 text-sm" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              <p className="font-semibold text-yellow-800 mb-1">Email not arriving?</p>
              <ul className="text-yellow-700 text-xs space-y-1 list-disc list-inside">
                <li>Check your <strong>Spam / Junk</strong> folder</li>
                <li>Supabase&apos;s free email service sometimes fails to deliver — try resending below</li>
                <li>If your email is a Gmail, use <strong>Sign in with Google</strong> instead (fastest)</li>
              </ul>
            </div>

            {/* Resend */}
            <div className="text-center mb-5">
              {resendStatus === "sent" ? (
                <p className="text-sm font-medium text-green-600">Resent! Check inbox and spam folder.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendStatus === "sending"}
                  className="w-full py-2.5 px-4 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors"
                >
                  {resendStatus === "sending" ? "Sending…" : "Resend confirmation email"}
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">or skip email — use Google</span></div>
            </div>

            {/* Google login alternative */}
            <button
              type="button"
              onClick={() => handleOAuthSignup("google")}
              disabled={!!oauthLoading}
              className="w-full py-3 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 disabled:opacity-60 transition-colors mb-4"
            >
              {oauthLoading === "google" ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>

            <p className="text-center text-xs text-gray-400">
              <Link href="/login" className="hover:underline" style={{ color: "#7a12fa" }}>Back to login</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Signup form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}>
              <img src="/logo.svg" alt="Logo" className="w-5 h-5 brightness-0 invert" />
            </div>
            <span className="text-xl font-bold text-gray-900">EduPlatform</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: "0 4px 24px 0 rgba(124, 58, 237, 0.08), 0 1px 4px 0 rgba(0,0,0,0.06)", border: "1px solid rgba(140, 140, 170, 0.2)" }}>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-500 text-sm mb-6">Start your learning journey today</p>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Google */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => handleOAuthSignup("google")}
              disabled={!!oauthLoading || loading}
              className="w-full py-3 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {oauthLoading === "google" ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Sign up with Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">or sign up with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-shadow"
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)"; e.target.style.borderColor = "#7a12fa"; }}
                onBlur={(e) => { e.target.style.boxShadow = ""; e.target.style.borderColor = ""; }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-shadow"
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)"; e.target.style.borderColor = "#7a12fa"; }}
                onBlur={(e) => { e.target.style.boxShadow = ""; e.target.style.borderColor = ""; }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-shadow"
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)"; e.target.style.borderColor = "#7a12fa"; }}
                onBlur={(e) => { e.target.style.boxShadow = ""; e.target.style.borderColor = ""; }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-shadow"
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)"; e.target.style.borderColor = "#7a12fa"; }}
                onBlur={(e) => { e.target.style.boxShadow = ""; e.target.style.borderColor = ""; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="w-full py-3 px-4 text-white text-sm font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              style={{ backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)", boxShadow: "0 2px 8px 0 rgba(122, 18, 250, 0.35)" }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: "#7a12fa" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
