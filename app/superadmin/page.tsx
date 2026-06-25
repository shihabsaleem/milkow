"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { LogIn, Plus, Users, ShieldAlert, Sparkles, Building, Key, Mail, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PullToRefresh from "@/components/ui/PullToRefresh";

interface Franchise {
  id: string;
  name: string;
  created_at: string;
}

export default function SuperadminDashboard() {
  const router = useRouter();
  const { user, role, impersonatedFranchiseId, setImpersonatedFranchiseId, logout } = useAuth();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role !== "superadmin") {
      router.push("/");
    }
  }, [role, router]);

  const fetchFranchises = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const { data, error } = await supabase
        .from("franchises")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFranchises(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (role === "superadmin") {
      fetchFranchises(true);
    }
  }, [role]);

  const handleCreateFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication session missing");

      const res = await fetch("/api/franchise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          owner_email: email,
          owner_password: password,
          franchise_name: name
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create franchise owner");
      }

      setSuccess(`Franchise "${name}" created successfully with owner account.`);
      setName("");
      setEmail("");
      setPassword("");
      fetchFranchises();
    } catch (err: any) {
      setError(err.message || "Failed to create franchise owner.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImpersonate = (franchiseId: string) => {
    setImpersonatedFranchiseId(franchiseId);
    router.push("/");
  };

  const handleClearImpersonation = () => {
    setImpersonatedFranchiseId(null);
  };

  if (role !== "superadmin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <ShieldAlert className="w-12 h-12 text-rose-500 animate-pulse" />
          <p className="text-zinc-600 font-bold">Access Denied: Superadmin only.</p>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await fetchFranchises(); }} className="bg-slate-50 text-zinc-900 font-sans pb-32 min-h-screen">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-2xl mx-auto w-full px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="bg-primary/10 text-primary text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={8} /> Superadmin
                </span>
              </div>
              <h1 className="text-xl font-black text-zinc-900">Franchises</h1>
            </div>
            <div className="flex items-center gap-2">
              {impersonatedFranchiseId && (
                <button
                  onClick={handleClearImpersonation}
                  className="bg-amber-500 text-white font-bold py-2 px-3 rounded-xl text-[10px] flex items-center transition-all active:scale-[0.98]"
                >
                  Exit Dashboard
                </button>
              )}
              <button
                onClick={() => logout().then(() => router.push("/login"))}
                className="bg-rose-50 text-rose-600 font-bold py-2 px-3 rounded-xl text-[10px] transition-all active:scale-[0.98]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        {/* Create Franchise Section */}
        <section className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-black text-zinc-900 flex items-center gap-2">
              <Plus className="text-primary" size={16} /> Create Franchise
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">Add a new franchise branch and owner account</p>
          </div>

          <form onSubmit={handleCreateFranchise} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Franchise Name</label>
              <div className="relative flex items-center">
                <Building size={14} className="absolute left-3.5 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Koduvayur"
                  className="w-full bg-slate-50 border border-zinc-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-[13px] font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Owner Email</label>
              <div className="relative flex items-center">
                <Mail size={14} className="absolute left-3.5 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@milkow.in"
                  className="w-full bg-slate-50 border border-zinc-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-[13px] font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <Key size={14} className="absolute left-3.5 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-zinc-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-[13px] font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button disabled={isSubmitting} type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl text-[13px] shadow-sm transition-all active:scale-[0.98] disabled:opacity-75 flex items-center justify-center mt-1">
              {isSubmitting ? "Creating..." : "Create Franchise"}
            </button>
          </form>
        </section>

        {/* Franchise List Section */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-black text-zinc-900 flex items-center gap-2">
              <Users className="text-primary" size={16} /> All Franchises
            </h2>
            <button onClick={() => fetchFranchises()} className="text-zinc-400 hover:text-zinc-600 transition-colors p-1">
              <RefreshCw size={14} className={isLoading || isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm animate-pulse h-20" />
              ))}
            </div>
          ) : franchises.length === 0 ? (
            <div className="text-center py-10 bg-white border border-zinc-200 rounded-3xl flex flex-col items-center justify-center gap-2">
              <Building className="text-zinc-300 w-8 h-8" />
              <p className="text-zinc-400 font-bold text-xs">No franchises registered.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {franchises.map((franchise) => (
                <div key={franchise.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all shadow-sm ${impersonatedFranchiseId === franchise.id ? "bg-primary/5 border-primary/20" : "bg-white border-zinc-200"}`}>
                  <div>
                    <p className="font-bold text-[13px] text-zinc-900 flex items-center gap-2">
                      {franchise.name}
                      {impersonatedFranchiseId === franchise.id && (
                        <span className="bg-amber-500/10 text-amber-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          Active
                        </span>
                      )}
                      {franchise.id === "00000000-0000-0000-0000-000000000000" && (
                        <span className="bg-zinc-100 text-zinc-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {new Date(franchise.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleImpersonate(franchise.id)}
                    className={`font-bold py-2 px-3 rounded-xl text-[10px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${impersonatedFranchiseId === franchise.id
                        ? "bg-zinc-900 text-white"
                        : "bg-slate-50 text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                      }`}
                  >
                    <LogIn size={12} />
                    {impersonatedFranchiseId === franchise.id ? "Enter" : "Dashboard"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </PullToRefresh>
  );
}
