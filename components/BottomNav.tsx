"use client";
import { Home, Truck, Wallet2, Users, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Package, label: "Inventory", href: "/inventory" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: Truck, label: "Delivery", href: "/delivery" },
    { icon: Wallet2, label: "Billing", href: "/billing" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: "var(--primary)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around max-w-2xl mx-auto h-[60px]">
        {navItems.map((item, i) => {
          const active = pathname === item.href;
          return (
            <Link href={item.href} key={i} prefetch className="flex-1">
              <div className="flex flex-col items-center justify-center gap-1 py-2">
                <item.icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  className="transition-all duration-200"
                  style={{ color: active ? "#FFFFFF" : "rgba(255,255,255,0.35)" }}
                />
                <span
                  className="text-[10px] font-semibold tracking-wide transition-all duration-200"
                  style={{ color: active ? "#FFFFFF" : "rgba(255,255,255,0.35)" }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
