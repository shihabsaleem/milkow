"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/bill"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, role, impersonatedFranchiseId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.replace("/login");
    } else if (!loading && user && role === 'superadmin' && !impersonatedFranchiseId) {
      if (!pathname.startsWith('/superadmin') && !isPublicRoute) {
        router.replace("/superadmin");
      }
    }
  }, [user, loading, role, impersonatedFranchiseId, pathname, isPublicRoute, router]);

  // Public routes always render
  if (isPublicRoute) return <>{children}</>;

  // While loading session, show a full-screen spinner
  if (loading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
