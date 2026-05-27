"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ["/login", "/bill"];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (!isPublicRoute) {
        router.push("/login");
      }
    } else {
      // Logged in
      if (pathname === "/login") {
        if (role === "driver") {
          router.push("/delivery");
        } else {
          router.push("/");
        }
      } else if (role === "driver") {
        const allowedDriverRoutes = ["/delivery", "/profile"];
        const isAllowed = allowedDriverRoutes.some(route => pathname.startsWith(route)) || isPublicRoute;
        if (!isAllowed) {
          router.push("/delivery");
        }
      }
    }
  }, [user, role, loading, pathname, router, isPublicRoute]);

  if (loading || (!user && !isPublicRoute)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Prevent flash of protected content before redirect for drivers
  if (user && role === "driver" && !isPublicRoute) {
    const allowedDriverRoutes = ["/delivery", "/profile"];
    const isAllowed = allowedDriverRoutes.some(route => pathname.startsWith(route));
    if (!isAllowed) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
  }

  return <>{children}</>;
}
