import "./globals.css";
import { PropsWithChildren } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Educational App",
  description: "Educational application built with Next.js",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/PlusJakartaSans-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-Medium.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-SemiBold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/PlusJakartaSans-Bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body className="jakarta-font">{children}</body>
    </html>
  );
}
