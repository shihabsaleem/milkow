"use client";
import { Home, Users, Truck, Milk } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Milk, label: "Inventory", href: "/inventory" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: Truck, label: "Delivery", href: "/route" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#5D55F3] rounded-t-2xl sm:rounded-t-3xl shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-between max-w-3xl mx-auto px-6 sm:px-8 py-3 sm:py-4">
        {navItems.map((nav, i) => {
          const isActive = pathname === nav.href;
          return (
            <Link href={nav.href} key={i} prefetch>
              <div className="flex flex-col items-center gap-1 sm:gap-1.5 cursor-pointer min-w-[48px] py-1">
                <nav.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors ${isActive ? "text-white" : "text-white/70"}`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] transition-colors ${
                    isActive ? "text-white font-semibold" : "text-white/70 font-medium"
                  }`}
                >
                  {nav.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
