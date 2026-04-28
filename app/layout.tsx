import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Milkow Fresh | Distribution Management",
  description: "Manage your milk delivery routes, billing, and customers — all in one place.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/assets/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Milkow",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F0F0F3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "light",
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} style={{ colorScheme: "light" }}>
      <body className="flex h-full flex-col relative font-[family-name:var(--font-geist)]">
        <AuthProvider>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
