"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { LogIn, Plus, Users, ShieldAlert, Sparkles, Building, Key, Mail, RefreshCw, Edit2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PullToRefresh from "@/components/ui/PullToRefresh";

interface Franchise {
  id: string;
  name: string;
  created_at: string;
}

export default function SuperadminDashboard() {
  const router = useRouter();
  const { role, impersonatedFranchiseId, setImpersonatedFranchiseId, logout } = useAuth();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFranchiseId, setEditingFranchiseId] = useState<string | null>(null);
  const [editFranchiseName, setEditFranchiseName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
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

  const handleUpdateFranchiseName = async (id: string) => {
    if (!editFranchiseName.trim() || editFranchiseName.trim() === franchises.find(f => f.id === id)?.name) {
      setEditingFranchiseId(null);
      return;
    }
    
    setIsUpdatingName(true);
    try {
      const { error } = await supabase
        .from('franchises')
        .update({ name: editFranchiseName.trim() })
        .eq('id', id);
        
      if (error) throw error;
      
      setFranchises(prev => prev.map(f => f.id === id ? { ...f, name: editFranchiseName.trim() } : f));
      setEditingFranchiseId(null);
    } catch (err: any) {
      console.error("Failed to update franchise name:", err);
      alert("Failed to update franchise name: " + err.message);
    } finally {
      setIsUpdatingName(false);
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
      <div className="min-h-screen flex items-center justify-center bg-mono-bg">
        <div className="flex flex-col items-center gap-2">
          <ShieldAlert className="w-12 h-12 text-mono-text animate-pulse" />
          <p className="text-mono-text-muted font-bold">Access Denied: Superadmin only.</p>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await fetchFranchises(); }} className="bg-mono-bg text-mono-text font-sans pb-32 min-h-screen">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-mono-border/50">
        <div className="max-w-2xl mx-auto w-full px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="bg-mono-text/10 text-mono-text text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={8} /> Superadmin
                </span>
              </div>
              <h1 className="text-xl font-semibold text-mono-text">Franchises</h1>
            </div>
            <div className="flex items-center gap-2">
              {impersonatedFranchiseId && (
                <button
                  onClick={handleClearImpersonation}
                  className="bg-mono-text text-white font-bold py-2 px-3 rounded-card text-[10px] flex items-center transition-all active:scale-[0.98]"
                >
                  Exit Dashboard
                </button>
              )}
              <button
                onClick={() => logout().then(() => router.push("/login"))}
                className="bg-mono-surface text-mono-text font-medium py-2 px-3 rounded-sm text-[10px] transition-all active:scale-[0.98]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        {/* Create Franchise Section */}
        <section className="bg-white border border-mono-border rounded-card p-5 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-mono-text flex items-center gap-2">
              <Plus className="text-mono-text" size={16} /> Create Franchise
            </h2>
            <p className="text-[11px] text-mono-text-muted mt-1">Add a new franchise branch and owner account</p>
          </div>

          <form onSubmit={handleCreateFranchise} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-mono-text-disabled uppercase tracking-wider">Franchise Name</label>
              <div className="relative flex items-center">
                <Building size={14} className="absolute left-3.5 text-mono-text-disabled" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Koduvayur"
                  className="w-full bg-mono-bg border border-mono-border focus:border-mono-text focus:ring-1 focus:ring-primary rounded-card pl-9 pr-4 py-2.5 text-[13px] font-medium text-mono-text outline-none transition-all placeholder:text-mono-text-disabled"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-mono-text-disabled uppercase tracking-wider">Owner Email</label>
              <div className="relative flex items-center">
                <Mail size={14} className="absolute left-3.5 text-mono-text-disabled" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@milkow.in"
                  className="w-full bg-mono-bg border border-mono-border focus:border-mono-text focus:ring-1 focus:ring-primary rounded-card pl-9 pr-4 py-2.5 text-[13px] font-medium text-mono-text outline-none transition-all placeholder:text-mono-text-disabled"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-mono-text-disabled uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <Key size={14} className="absolute left-3.5 text-mono-text-disabled" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-mono-bg border border-mono-border focus:border-mono-text focus:ring-1 focus:ring-primary rounded-card pl-9 pr-4 py-2.5 text-[13px] font-medium text-mono-text outline-none transition-all placeholder:text-mono-text-disabled"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-3 rounded-card bg-mono-surface text-rose-600 text-xs font-bold border border-rose-100">
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-3 rounded-card bg-mono-surface text-mono-text text-xs font-bold border border-emerald-100">
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button disabled={isSubmitting} type="submit" className="w-full bg-mono-text text-white font-bold py-3 rounded-card text-[13px] shadow-sm transition-all active:scale-[0.98] disabled:opacity-75 flex items-center justify-center mt-1">
              {isSubmitting ? "Creating..." : "Create Franchise"}
            </button>
          </form>
        </section>

        {/* Franchise List Section */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-semibold text-mono-text flex items-center gap-2">
              <Users className="text-mono-text" size={16} /> All Franchises
            </h2>
            <button onClick={() => fetchFranchises()} className="text-mono-text-disabled hover:text-mono-text-muted transition-colors p-1">
              <RefreshCw size={14} className={isLoading || isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-mono-border rounded-card p-4 shadow-sm animate-pulse h-20" />
              ))}
            </div>
          ) : franchises.length === 0 ? (
            <div className="text-center py-10 bg-white border border-mono-border rounded-card flex flex-col items-center justify-center gap-2">
              <Building className="text-mono-border w-8 h-8" />
              <p className="text-mono-text-disabled font-bold text-xs">No franchises registered.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {franchises.map((franchise) => (
                <div key={franchise.id} className={`flex justify-between items-center p-4 rounded-card border transition-all shadow-sm ${impersonatedFranchiseId === franchise.id ? "bg-mono-text/5 border-mono-border" : "bg-white border-mono-border"}`}>
                  <div>
                    <div className="font-bold text-[13px] text-mono-text flex items-center gap-2">
                      {editingFranchiseId === franchise.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editFranchiseName}
                            onChange={(e) => setEditFranchiseName(e.target.value)}
                            disabled={isUpdatingName}
                            className="bg-mono-bg border border-mono-border rounded px-2 py-1 text-xs outline-none focus:border-mono-text w-32"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateFranchiseName(franchise.id);
                              if (e.key === 'Escape') setEditingFranchiseId(null);
                            }}
                          />
                          <button 
                            onClick={() => handleUpdateFranchiseName(franchise.id)}
                            disabled={isUpdatingName}
                            className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                          >
                            <Check size={12} />
                          </button>
                          <button 
                            onClick={() => setEditingFranchiseId(null)}
                            disabled={isUpdatingName}
                            className="p-1.5 bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          {franchise.name}
                          <button 
                            onClick={() => {
                              setEditFranchiseName(franchise.name);
                              setEditingFranchiseId(franchise.id);
                            }}
                            className="text-mono-text-disabled hover:text-mono-text-muted transition-colors p-0.5"
                          >
                            <Edit2 size={10} />
                          </button>
                        </>
                      )}
                      
                      {impersonatedFranchiseId === franchise.id && (
                        <span className="bg-mono-text/10 text-mono-text text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          Active
                        </span>
                      )}
                      {franchise.id === "00000000-0000-0000-0000-000000000000" && (
                        <span className="bg-mono-surface text-mono-text-muted text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-mono-text-disabled mt-1">
                      {new Date(franchise.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleImpersonate(franchise.id)}
                    className={`font-medium py-2 px-3 rounded-sm text-[10px] flex items-center gap-1.5 shadow-xs active:scale-95 transition-all ${impersonatedFranchiseId === franchise.id
                        ? "bg-mono-text text-white"
                        : "bg-mono-bg text-mono-text border border-mono-border hover:bg-mono-surface"
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
