"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const EXCLUDED_PREFIXES = ["/login", "/auth", "/signup"];

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          prompt: (cb?: (n: {
            isNotDisplayed(): boolean;
            isSkippedMoment(): boolean;
            getNotDisplayedReason(): string;
            getSkippedReason(): string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
    // Global callback required by Google One Tap
    handleGoogleCredential?: (response: { credential: string }) => Promise<void>;
  }
}

interface Props { isLoggedIn: boolean; }

// Generate a cryptographic nonce: raw (for Supabase) and hashed (for Google)
async function generateNonce(): Promise<[string, string]> {
  const rawNonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawNonce));
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return [rawNonce, hashedNonce];
}

export default function GoogleLoginPopup({ isLoggedIn }: Props) {
  const pathname  = usePathname();
  const router    = useRouter();
  const clientId  = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  // Store the raw nonce so the credential callback can read it
  const rawNonceRef = useRef<string>("");

  const excluded  = EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (isLoggedIn || !clientId || !supabase || excluded) return;

    // ── Credential callback ──────────────────────────────────────────────────
    window.handleGoogleCredential = async ({ credential }: { credential: string }) => {
      console.log("[GoogleOneTap] Credential received, signing in with Supabase...");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
        nonce: rawNonceRef.current || undefined,
      });

      if (error) {
        console.error("[GoogleOneTap] signInWithIdToken error:", error.message, error);
        // Fallback: standard OAuth redirect (handles the case where Supabase's
        // Google provider is configured but One Tap token exchange fails)
        console.log("[GoogleOneTap] Falling back to Google OAuth redirect...");
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        return;
      }

      console.log("[GoogleOneTap] Signed in successfully:", data.user?.email);
      // onAuthStateChange in AnnotationProvider already updates React state instantly.
      // router.refresh() re-fetches server components without a full page reload.
      router.refresh();
    };

    // ── Initialise One Tap with nonce, then prompt ───────────────────────────
    const initAndPrompt = async () => {
      const [rawNonce, hashedNonce] = await generateNonce();
      rawNonceRef.current = rawNonce;

      window.google?.accounts.id.initialize({
        client_id:             clientId,
        callback:              window.handleGoogleCredential,
        auto_select:           false,
        cancel_on_tap_outside: true,
        itp_support:           true,   // Safari Intelligent Tracking Prevention
        context:               "signin",
        nonce:                 hashedNonce,
      });

      window.google?.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.warn(
            "[GoogleOneTap] Not displayed — reason:",
            notification.getNotDisplayedReason(),
            "\nFix: add your domain to Google Cloud Console → Credentials → Authorized JavaScript origins"
          );
        }
        if (notification.isSkippedMoment()) {
          console.info("[GoogleOneTap] Skipped:", notification.getSkippedReason());
        }
      });
    };

    // Script already loaded (e.g. navigating back to page)
    if (window.google?.accounts?.id) {
      initAndPrompt();
      return () => { window.google?.accounts?.id?.cancel(); };
    }

    // Avoid duplicate <script> tags
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script      = document.createElement("script");
      script.src        = "https://accounts.google.com/gsi/client";
      script.async      = true;
      script.defer      = true;
      script.onload     = initAndPrompt;
      document.head.appendChild(script);
    }

    return () => { window.google?.accounts?.id?.cancel(); };
  }, [isLoggedIn, pathname, clientId, excluded]);

  // Cancel One Tap when user logs in
  useEffect(() => {
    if (isLoggedIn) window.google?.accounts?.id?.cancel();
  }, [isLoggedIn]);

  // Pure JS initialisation — no HTML div so the nonce is always applied correctly
  return null;
}
