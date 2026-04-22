"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Milk, ArrowRight, Mail, Lock, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
   const router = useRouter();
   const { user, loading } = useAuth();
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState("");

   useEffect(() => {
      if (!loading && user) {
         router.push("/");
      }
   }, [user, loading, router]);

   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError("");

      try {
         const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
         });

         if (authError) throw authError;
         router.push("/");
      } catch (err: any) {
         setError(err.message || "Invalid credentials. Please try again.");
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
         </div>

         <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md z-10"
         >
            {/* Logo Section */}
            <div className="flex flex-col items-center mb-10">
               <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className=" flex items-center justify-center mb-4 "
               >
                  <Image
                     src="/assets/logo.svg"
                     alt="Milkow Logo"
                     width={192}
                     height={40}
                     className="object-contain h-auto"
                     priority
                  />
               </motion.div>


            </div>

            {/* Login Card */}
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-zinc-100 relative group overflow-hidden">
               {/* Accent line */}
               <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary/10" />

               <form onSubmit={handleLogin} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Email</label>
                     <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                        <input
                           type="email"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           className="w-full bg-slate-50 border border-zinc-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-zinc-300 placeholder:font-medium"
                           placeholder="info@milkow.in"
                           required
                        />
                     </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Password</label>
                     <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                        <input
                           type="password"
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="w-full bg-slate-50 border border-zinc-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-zinc-300"
                           placeholder="••••••••"
                           required
                        />
                     </div>
                  </div>

                  <AnimatePresence>
                     {error && (
                        <motion.div
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: "auto" }}
                           exit={{ opacity: 0, height: 0 }}
                           className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold"
                        >
                           {error}
                        </motion.div>
                     )}
                  </AnimatePresence>

                  <button
                     disabled={isLoading}
                     type="submit"
                     className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn disabled:opacity-70"
                  >
                     {isLoading ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     ) : (
                        <>
                           Login
                           <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                        </>
                     )}
                  </button>
               </form>

            </div>

            {/* Copyright */}
            <p className="text-center mt-10 text-zinc-400 text-[10px] font-medium tracking-wide uppercase">
               &copy; 2026 Milkow &bull; <a href="https://shihabsaleem.site" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">shihab saleem</a>
            </p>
         </motion.div>
      </div>
   );
}
