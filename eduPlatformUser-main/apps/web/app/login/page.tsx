"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signInWithOAuth, updateUserProviders, checkSurveyCompleted } from "../lib/supabase";
import { logAudit } from "../lib/audit";
import { useAccessibility } from "../context/AccessibilityContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { announce } = useAccessibility();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const failLogin = (msg: string) => {
    setError(msg);
    announce(`Sign in failed. ${msg}`, "assertive");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await signIn(email, password);
      if (signInError) {
        const msg = signInError.message || "";
        logAudit({ action: "user_logged_in", category: "auth", status: "failure", error_msg: msg, metadata: { method: "email" } });
        if (msg.toLowerCase().includes("invalid login credentials")) {
          failLogin("Incorrect email or password.");
        } else {
          failLogin(msg);
        }
      } else if (data?.user) {
        logAudit({ action: "user_logged_in", category: "auth", metadata: { method: "email" } });
        updateUserProviders(data.user.id);
        const surveyDone = await checkSurveyCompleted(data.user.id);
        router.push(surveyDone ? redirectTo : "/survey");
      }
    } catch {
      failLogin("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google") => {
    setError(null);
    setOauthLoading(provider);
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("auth_redirect", redirectTo);
      }
      logAudit({ action: "oauth_initiated", category: "auth", metadata: { provider } });
      const { error: oauthError } = await signInWithOAuth(provider);
      if (oauthError) {
        failLogin(oauthError.message);
        setOauthLoading(null);
      }
    } catch {
      failLogin("An unexpected error occurred. Please try again.");
      setOauthLoading(null);
    }
  };

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

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8" style={{ boxShadow: "0 4px 24px 0 rgba(124, 58, 237, 0.08), 0 1px 4px 0 rgba(0,0,0,0.06)", border: "1px solid rgba(140, 140, 170, 0.2)" }}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to continue learning</p>

          {/* Error summary — role="alert" makes screen readers announce it the moment it appears */}
          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <svg aria-hidden="true" className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <p>{error}</p>
                {error.toLowerCase().includes("incorrect email or password") && (
                  <p className="text-xs text-red-400 mt-1">
                    If you signed up with Google, use{" "}
                    <button
                      type="button"
                      onClick={() => handleOAuthLogin("google")}
                      className="font-semibold underline hover:text-red-600"
                    >
                      Continue with Google
                    </button>{" "}
                    instead. Or{" "}
                    <Link href="/forgot-password" className="font-semibold underline hover:text-red-600">
                      reset your password.
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Google */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              disabled={!!oauthLoading || loading}
              aria-label="Sign in with Google"
              className="w-full py-3 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {oauthLoading === "google" ? (
                <div aria-hidden="true" className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span aria-hidden="true">Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-600">or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 focus:outline-none transition-shadow"
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)"; e.target.style.borderColor = "#7a12fa"; }}
                onBlur={(e) => { e.target.style.boxShadow = ""; e.target.style.borderColor = ""; }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: "#7a12fa" }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 focus:outline-none transition-shadow"
                  onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)"; e.target.style.borderColor = "#7a12fa"; }}
                  onBlur={(e) => { e.target.style.boxShadow = ""; e.target.style.borderColor = ""; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.243M9.878 9.878L4.222 4.222m5.656 5.656L19.778 19.778M14.12 14.12L19.778 19.778" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
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
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold hover:underline" style={{ color: "#7a12fa" }}>
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
