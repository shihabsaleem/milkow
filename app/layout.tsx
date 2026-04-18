import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Milkow | Mobile First PWA",
  description: "A gorgeous progressive web app built with Next.js",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Milkow",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#EBEBEB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="flex h-full flex-col bg-[#EBEBEB] text-slate-900 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
