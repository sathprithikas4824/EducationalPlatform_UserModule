import "./globals.css";
import { PropsWithChildren } from "react";
import type { Metadata, Viewport } from "next";
import { AnnotationProvider } from "./components/common/AnnotationProvider";
import PWARegister from "./components/common/PWARegister";
import { ThemeProvider } from "./components/common/ThemeProvider";
import GlobalOfflineGuard from "./components/common/GlobalOfflineGuard";
import { OfflineProvider } from "./components/common/OfflineContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";

export const metadata: Metadata = {
  title: "Educational Platform",
  description: "Learn programming and more with our educational platform",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EduPlatform",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect so the Google One Tap script loads as fast as possible */}
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        {/* DNS prefetch for external image sources used on landing page */}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* iOS Safari color scheme — prevents flash of unstyled chrome */}
        <meta name="color-scheme" content="light" />
        <link rel="preload" href="/fonts/PlusJakartaSans-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-Medium.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-SemiBold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-Bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        {/* Apple touch icons for iOS */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        {/* iOS standalone splash color */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="jakarta-font bg-[var(--page-bg)] text-[var(--text-primary)] transition-colors duration-300">
        <AccessibilityProvider>
          <ThemeProvider>
            <AnnotationProvider>
              <OfflineProvider>
                {children}
                <GlobalOfflineGuard />
              </OfflineProvider>
            </AnnotationProvider>
          </ThemeProvider>
        </AccessibilityProvider>
        <PWARegister />
      </body>
    </html>
  );
}
