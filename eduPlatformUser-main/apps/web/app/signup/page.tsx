"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "../lib/supabase";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      } else if (data?.user) {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}>
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl p-10" style={{ boxShadow: "0 4px 24px 0 rgba(124, 58, 237, 0.08), 0 1px 4px 0 rgba(0,0,0,0.06)", border: "1px solid rgba(140, 140, 170, 0.2)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm mb-1">We sent a confirmation link to</p>
            <p className="font-semibold text-gray-800 mb-6">{email}</p>
            <p className="text-gray-400 text-xs mb-6">
              Click the link in the email to activate your account. Check your spam folder if you don&apos;t see it.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
              style={{ color: "#7a12fa" }}
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              disabled={loading}
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
