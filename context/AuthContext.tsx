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
  
  const [role, setRole] = useState<'superadmin' | 'franchise' | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("milkow_role");
      if (saved === 'superadmin' || saved === 'franchise') return saved;
    }
    return null;
  });
  
  const [franchiseId, setFranchiseId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("milkow_franchise_id");
    }
    return null;
  });
  
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
        if (typeof window !== 'undefined') {
          localStorage.setItem("milkow_role", data.role);
          localStorage.setItem("milkow_franchise_id", data.franchise_id);
        }
        return { role: data.role, franchiseId: data.franchise_id };
      } else {
        // Fallback for user created before migration or default seed user
        setRole('franchise');
        setFranchiseId('00000000-0000-0000-0000-000000000000');
        if (typeof window !== 'undefined') {
          localStorage.setItem("milkow_role", 'franchise');
          localStorage.setItem("milkow_franchise_id", '00000000-0000-0000-0000-000000000000');
        }
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
    let isMounted = true;
    let initialFetchDone = false;

    // 1. Get initial session
    supabase.auth.getSession().then(async (res: any) => {
      if (!isMounted) return;
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
        const cachedRole = localStorage.getItem("milkow_role");
        const cachedFranchiseId = localStorage.getItem("milkow_franchise_id");
        
        if (cachedRole && cachedFranchiseId) {
          // Unblock immediately to prevent irritating loading screen
          setLoading(false);
          // Fetch silently in background
          fetchUserRole(currentUser.id).then(result => {
             initialFetchDone = true;
             const activeFranchiseId = result?.role === 'superadmin' ? ((impersonatedFranchiseId || result.franchiseId || '00000000-0000-0000-0000-000000000000')) : (result?.franchiseId || '00000000-0000-0000-0000-000000000000');
             checkAndRunAutomations(activeFranchiseId).catch((err) =>
               console.error("[Automation] Unhandled error:", err)
             );
          });
        } else {
          // If no cache, we must wait
          const result = await fetchUserRole(currentUser.id);
          initialFetchDone = true;
          const activeFranchiseId = result?.role === 'superadmin' ? ((impersonatedFranchiseId || result.franchiseId || '00000000-0000-0000-0000-000000000000')) : (result?.franchiseId || '00000000-0000-0000-0000-000000000000');
          
          checkAndRunAutomations(activeFranchiseId).catch((err) =>
            console.error("[Automation] Unhandled error:", err)
          );
          if (isMounted) setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return;
      // Skip SIGNED_IN or INITIAL_SESSION if we already processed getSession to avoid duplicate fetches
      if ((_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN') && initialFetchDone) {
         return;
      }

      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      let currentFranchiseId = franchiseId;
      if (currentUser) {
        // Fetch role asynchronously to prevent blocking if possible
        fetchUserRole(currentUser.id).then(result => {
          if (!isMounted) return;
          currentFranchiseId = result?.franchiseId || null;
          if (_event === 'SIGNED_IN') {
             const activeFranchiseId = role === 'superadmin' ? ((impersonatedFranchiseId || result?.franchiseId || '00000000-0000-0000-0000-000000000000')) : (currentFranchiseId || '00000000-0000-0000-0000-000000000000');
             checkAndRunAutomations(activeFranchiseId).catch((err) =>
                console.error("[Automation] Unhandled error:", err)
             );
          }
        });
      } else {
        setRole(null);
        setFranchiseId(null);
        handleSetImpersonatedFranchiseId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem("milkow_role");
          localStorage.removeItem("milkow_franchise_id");
        }
      }
      setLoading(false);
    });

    return () => {
       isMounted = false;
       subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setRole(null);
      setFranchiseId(null);
      handleSetImpersonatedFranchiseId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem("milkow_role");
        localStorage.removeItem("milkow_franchise_id");
      }
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
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

