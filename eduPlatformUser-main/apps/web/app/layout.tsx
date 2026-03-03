import "./globals.css";
import { PropsWithChildren } from "react";
import type { Metadata } from "next";
import { AnnotationProvider } from "./components/common/AnnotationProvider";

export const metadata: Metadata = {
  title: "Educational App",
  description: "Educational application built with Next.js",
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
      </head>
      <body className="jakarta-font">
        <AnnotationProvider>{children}</AnnotationProvider>
      </body>
    </html>
  );
}
