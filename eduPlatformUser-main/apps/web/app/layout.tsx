import "./globals.css";
import { PropsWithChildren } from "react";
import type { Metadata, Viewport } from "next";
import { AnnotationProvider } from "./components/common/AnnotationProvider";
import PWARegister from "./components/common/PWARegister";

export const metadata: Metadata = {
  title: "Educational Platform",
  description: "Learn programming and more with our educational platform",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EduPlatform",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect so the Google One Tap script loads as fast as possible */}
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="preload" href="/fonts/PlusJakartaSans-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-Medium.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-SemiBold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-Bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        {/* Apple touch icon */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="jakarta-font">
        <AnnotationProvider>{children}</AnnotationProvider>
        <PWARegister />
      </body>
    </html>
  );
}
