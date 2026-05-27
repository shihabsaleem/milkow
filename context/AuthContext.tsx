"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkAndRunAutomations } from "@/lib/automation";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: 'admin' | 'driver' | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'driver' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(async (res: any) => {
      const { data: { session }, error } = res;
      if (error) {
        console.error("[Auth] Error getting initial session:", error.message);
        
        // Handle "Refresh Token Not Found" or similar by clearing session
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
        let userRole: 'admin' | 'driver' = 'driver';
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
          
          if (data && data.role) {
            userRole = data.role as 'admin' | 'driver';
          } else {
            const fallbackRole = (currentUser.email && (currentUser.email.includes('admin') || currentUser.email === 'admin@milkow.com')) ? 'admin' : 'driver';
            await supabase.from('profiles').insert({
              id: currentUser.id,
              role: fallbackRole,
              email: currentUser.email,
              name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User'
            }).select().single();
            userRole = fallbackRole;
          }
        } catch (e) {
          console.error("[Auth] Failed to load role on init:", e);
        }
        setRole(userRole);

        // 🤖 Run automations on login
        checkAndRunAutomations().catch((err) =>
          console.error("[Automation] Unhandled error:", err)
        );
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        let userRole: 'admin' | 'driver' = 'driver';
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
          
          if (data && data.role) {
            userRole = data.role as 'admin' | 'driver';
          } else {
            const fallbackRole = (currentUser.email && (currentUser.email.includes('admin') || currentUser.email === 'admin@milkow.com')) ? 'admin' : 'driver';
            await supabase.from('profiles').insert({
              id: currentUser.id,
              role: fallbackRole,
              email: currentUser.email,
              name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User'
            }).select().single();
            userRole = fallbackRole;
          }
        } catch (e) {
          console.error("[Auth] Failed to load role on state change:", e);
        }
        setRole(userRole);

        if (_event === 'SIGNED_IN') {
          checkAndRunAutomations().catch((err) =>
             console.error("[Automation] Unhandled error:", err)
          );
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setUser(null);
      setSession(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
