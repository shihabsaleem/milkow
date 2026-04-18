"use client";
import { Home, Users, Truck, Milk } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Milk, label: "Inventory", href: "/inventory" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: Truck, label: "Delivery", href: "/route" },
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-[#5D55F3] rounded-t-3xl shadow-lg"
    >
      <div className="flex items-center justify-between mx-auto pb-safe">
        {navItems.map((nav, i) => {
          const isActive = pathname === nav.href;
          return (
            <Link href={nav.href} key={i}>
              <div className="flex flex-col items-center gap-1.5 cursor-pointer">
                <nav.icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={`transition-colors ${isActive ? "text-white" : "text-white/70"}`} 
                />
                <span
                  className={`text-[11px] transition-colors ${
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
    </motion.div>
  );
}
