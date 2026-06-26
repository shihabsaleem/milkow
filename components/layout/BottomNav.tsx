"use client";
import { Home, Truck, Wallet2, Users, Package, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function BottomNav() {
  const pathname = usePathname();
  const { user, role, impersonatedFranchiseId, franchiseId } = useAuth();
  

  if (!user || pathname === "/login" || pathname === "/bill" || pathname === "/bill/") return null;

  const navItems = [];

  if (role === 'franchise' || (role === 'superadmin' && (impersonatedFranchiseId || franchiseId))) {
    navItems.push(
      { icon: Home, label: "Home", href: "/" },
      { icon: Package, label: "Inventory", href: "/inventory" },
      { icon: Users, label: "Customers", href: "/customers" },
      { icon: Truck, label: "Delivery", href: "/delivery" }
    );
  }

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] mb-2 md:w-1/2 rounded-xl"
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
