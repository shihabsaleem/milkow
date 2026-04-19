import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Milkow | Smart Milk Distribution",
  description: "Smart milk distribution management",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} style={{ colorScheme: "light" }}>
      <body className="flex h-full flex-col relative font-[family-name:var(--font-inter)]">
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
