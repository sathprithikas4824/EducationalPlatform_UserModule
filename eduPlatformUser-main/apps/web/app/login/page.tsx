"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "../lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
      } else if (data?.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
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

        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: "0 4px 24px 0 rgba(124, 58, 237, 0.08), 0 1px 4px 0 rgba(0,0,0,0.06)", border: "1px solid rgba(140, 140, 170, 0.2)" }}>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to continue learning</p>

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
          <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: "#7a12fa" }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
