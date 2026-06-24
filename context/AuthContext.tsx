"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkAndRunAutomations } from "@/lib/automation";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'superadmin' | 'franchise' | null;
  franchiseId: string | null;
  impersonatedFranchiseId: string | null;
  setImpersonatedFranchiseId: (id: string | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  franchiseId: null,
  impersonatedFranchiseId: null,
  setImpersonatedFranchiseId: () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'superadmin' | 'franchise' | null>(null);
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [impersonatedFranchiseId, setImpersonatedFranchiseId] = useState<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, franchise_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setRole(data.role);
        setFranchiseId(data.franchise_id);
        return { role: data.role, franchiseId: data.franchise_id };
      } else {
        // Fallback for user created before migration or default seed user
        setRole('franchise');
        setFranchiseId('00000000-0000-0000-0000-000000000000');
        return { role: 'franchise', franchiseId: '00000000-0000-0000-0000-000000000000' };
      }
    } catch (e) {
      console.error("[Auth] Error fetching user role:", e);
      setRole('franchise');
      setFranchiseId('00000000-0000-0000-0000-000000000000');
      return { role: 'franchise', franchiseId: '00000000-0000-0000-0000-000000000000' };
    }
  };

  useEffect(() => {
    // Load local storage impersonation preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("milkow_impersonated_franchise_id");
      if (saved) setImpersonatedFranchiseId(saved);
    }
  }, []);

  const handleSetImpersonatedFranchiseId = (id: string | null) => {
    setImpersonatedFranchiseId(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem("milkow_impersonated_franchise_id", id);
      } else {
        localStorage.removeItem("milkow_impersonated_franchise_id");
      }
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(async (res: any) => {
      const { data: { session }, error } = res;
      if (error) {
        console.error("[Auth] Error getting initial session:", error.message);
        
        if (error.message?.includes("Refresh Token Not Found") || error.message?.includes("invalid_grant")) {
          console.warn("[Auth] Stale session detected, clearing storage...");
          supabase.auth.signOut().catch((e: any) => console.error("[Auth] Error clearing stale session:", e));
        }
        
        setLoading(false);
        return;
      }

      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const result = await fetchUserRole(currentUser.id);
        const fId = result?.franchiseId;
        // Determine active franchise ID logic (similar to hooks)
        const activeFranchiseId = result?.role === 'superadmin' ? ((impersonatedFranchiseId || franchiseId || '00000000-0000-0000-0000-000000000000')) : (fId || '00000000-0000-0000-0000-000000000000');
        
        // 🤖 Run automations on login
        checkAndRunAutomations(activeFranchiseId).catch((err) =>
          console.error("[Automation] Unhandled error:", err)
        );
      }
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      let currentFranchiseId = franchiseId;
      if (currentUser) {
        const result = await fetchUserRole(currentUser.id);
        currentFranchiseId = result?.franchiseId || null;
      } else {
        setRole(null);
        setFranchiseId(null);
        handleSetImpersonatedFranchiseId(null);
      }
      setLoading(false);

      if (_event === 'SIGNED_IN' && currentUser) {
        // Determine active franchise ID logic (similar to hooks)
        const activeFranchiseId = role === 'superadmin' ? ((impersonatedFranchiseId || franchiseId || '00000000-0000-0000-0000-000000000000')) : (currentFranchiseId || '00000000-0000-0000-0000-000000000000');
        
        checkAndRunAutomations(activeFranchiseId).catch((err) =>
           console.error("[Automation] Unhandled error:", err)
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setRole(null);
      setFranchiseId(null);
      handleSetImpersonatedFranchiseId(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      role, 
      franchiseId, 
      impersonatedFranchiseId, 
      setImpersonatedFranchiseId: handleSetImpersonatedFranchiseId, 
      logout 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
