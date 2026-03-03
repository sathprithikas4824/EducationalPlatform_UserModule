"use client";

/**
 * Google One Tap sign-in.
 * Loads Google's Identity Services (GSI) script and calls google.accounts.id.prompt().
 * Google renders its own native popup UI — this component outputs no HTML.
 *
 * Requires:  NEXT_PUBLIC_GOOGLE_CLIENT_ID  in .env.local
 * Supabase:  Authentication → Providers → Google must be enabled with the same Client ID.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";

const EXCLUDED_PREFIXES = ["/login", "/auth", "/signup"];

// Google Identity Services type declarations
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface Props { isLoggedIn: boolean; }

export default function GoogleLoginPopup({ isLoggedIn }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    // Hide One Tap if already signed in
    if (isLoggedIn) {
      window.google?.accounts?.id?.cancel();
      return;
    }

    // Don't show on login / auth pages
    if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !supabase) return;

    const initAndPrompt = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        // Called by Google with a signed JWT credential after the user picks an account
        callback: async ({ credential }: { credential: string }) => {
          // Exchange the Google JWT for a Supabase session directly — no redirect needed
          await supabase.auth.signInWithIdToken({
            provider: "google",
            token: credential,
          });
          // AnnotationProvider's onAuthStateChange picks up the new session automatically
        },
        auto_select: false,          // don't silently sign in without showing the popup
        cancel_on_tap_outside: true, // dismiss when user clicks elsewhere
        context: "signin",
      });
      window.google?.accounts.id.prompt();
    };

    // If the GSI script was already loaded (e.g. navigating between pages), init directly
    if (window.google?.accounts?.id) {
      initAndPrompt();
      return;
    }

    // Dynamically load the GSI script once
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initAndPrompt;
    document.head.appendChild(script);

    return () => {
      // Cancel the prompt when the component unmounts or conditions change
      window.google?.accounts?.id?.cancel();
    };
  }, [isLoggedIn, pathname]);

  // Google renders its own native One Tap overlay — no custom markup needed
  return null;
}
