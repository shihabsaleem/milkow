"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { LogIn, Plus, Users, ShieldAlert, Sparkles, Building, Key, Mail, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const fetchFranchises = async () => {
    setIsLoading(true);
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
    }
  };

  useEffect(() => {
    if (role === "superadmin") {
      fetchFranchises();
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
    <div className="min-h-screen w-full bg-slate-50 flex flex-col p-6 font-sans relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-6xl mx-auto z-10 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-xl p-6 rounded-4xl border border-white shadow-[0_8px_32px_0_rgba(0,0,0,0.04)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles size={10} /> Superadmin Dashboard
              </span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 mt-1.5">Manage Franchises</h1>
          </div>
          <div className="flex items-center gap-2">
            {impersonatedFranchiseId && (
              <button
                onClick={handleClearImpersonation}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                Clear Impersonation
              </button>
            )}
            <button
              onClick={() => logout().then(() => router.push("/login"))}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all active:scale-[0.98]"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Franchise Column */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                <Plus className="text-primary" size={20} /> Create Franchise
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Add a new franchise branch with an owner account</p>
            </div>

            <form onSubmit={handleCreateFranchise} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">Franchise Name</label>
                <div className="relative flex items-center">
                  <Building size={16} className="absolute left-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Koduvayur"
                    className="w-full bg-slate-50/50 border border-zinc-200 focus:border-primary rounded-xl pl-11 pr-4 py-3 text-xs font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">Owner Email</label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@milkow.in"
                    className="w-full bg-slate-50/50 border border-zinc-200 focus:border-primary rounded-xl pl-11 pr-4 py-3 text-xs font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <Key size={16} className="absolute left-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50/50 border border-zinc-200 focus:border-primary rounded-xl pl-11 pr-4 py-3 text-xs font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100"
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100"
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full bg-primary hover:bg-zinc-800 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-75 flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Creating..." : "Create Franchise Owner"}
              </button>
            </form>
          </div>

          {/* Franchise List Column */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                  <Users className="text-primary" size={20} /> All Franchises
                </h2>
                <p className="text-xs text-zinc-500 mt-1">List of registered active franchise locations</p>
              </div>
              <button
                onClick={fetchFranchises}
                className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                title="Refresh List"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : franchises.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-4xl flex flex-col items-center justify-center gap-2">
                <Building className="text-zinc-300 w-10 h-10" />
                <p className="text-zinc-400 font-bold text-xs">No franchises registered yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                {franchises.map((franchise) => (
                  <div
                    key={franchise.id}
                    className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${impersonatedFranchiseId === franchise.id
                        ? "bg-primary/5 border-primary/20"
                        : "bg-slate-50/50 border-zinc-100 hover:bg-slate-50"
                      }`}
                  >
                    <div>
                      <p className="font-extrabold text-sm text-zinc-900 flex items-center gap-2">
                        {franchise.name}
                        {impersonatedFranchiseId === franchise.id && (
                          <span className="bg-amber-500/10 text-amber-600 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            Active Session
                          </span>
                        )}
                        {franchise.id === "00000000-0000-0000-0000-000000000000" && (
                          <span className="bg-zinc-200/50 text-zinc-500 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            System Default
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        ID: {franchise.id} &bull; Created: {new Date(franchise.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleImpersonate(franchise.id)}
                      className={`font-extrabold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${impersonatedFranchiseId === franchise.id
                          ? "bg-zinc-800 hover:bg-zinc-900 text-white"
                          : "bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200"
                        }`}
                    >
                      <LogIn size={13} />
                      {impersonatedFranchiseId === franchise.id ? "Enter Dashboard" : "Impersonate"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
