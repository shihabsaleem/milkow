"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Milk, ArrowRight, Mail, Lock, ShieldCheck, Sparkles } from "lucide-react";
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
            email: email.trim(),
            password: password,
         });

         if (authError) throw authError;
         
         router.push("/");
         router.refresh();
      } catch (err: unknown) {
         const error = err as Error;
         console.error("Login Error:", error.message);
         setError(error.message || "Authentication failed. Check credentials.");
         setIsLoading(false);
      }
   };

   return (
      <div className="relative min-h-screen w-full bg-[#09090B] flex flex-col items-center justify-center p-6 overflow-hidden select-none">
         {/* Dynamic Abstract Background Elements */}
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
         
         {/* Subtle Grid Overlay */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

         <main className="w-full max-w-[420px] z-10">
            {/* Logo Section */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex flex-col items-center mb-12"
            >
               <div className="relative">
                  <div className="absolute inset-0 bg-primary blur-2xl opacity-20 animate-pulse" />
                  <motion.div 
                     whileHover={{ rotate: 10, scale: 1.1 }}
                     className="relative bg-zinc-900 border border-white/10 p-5 rounded-[2rem] shadow-2xl"
                  >
                     <Milk size={44} className="text-primary fill-primary/20" />
                  </motion.div>
                  <motion.div 
                     animate={{ rotate: 360 }}
                     transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                     className="absolute -top-1 -right-1 text-primary/40"
                  >
                     <Sparkles size={16} />
                  </motion.div>
               </div>
               
               <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mt-6"
               >
                  <h1 className="text-4xl font-black text-white tracking-tighter italic leading-none">MILKOW.</h1>
                  <div className="mt-2 inline-block">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">System OS v2.0</span>
                  </div>
               </motion.div>
            </motion.div>

            {/* Glass Box */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.3 }}
               className="bg-zinc-900/40 border border-white/10 backdrop-blur-3xl rounded-[3rem] p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col gap-8 relative overflow-hidden"
            >
               {/* Inner Gloss Edge */}
               <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

               <div>
                  <h2 className="text-2xl font-bold text-white leading-tight flex items-center gap-2">
                     Authorize Access <ShieldCheck size={20} className="text-primary" />
                  </h2>
                  <p className="text-sm text-zinc-400 font-medium mt-1">Enter your console credentials</p>
               </div>

               <form onSubmit={handleLogin} className="flex flex-col gap-6">
                  <AnimatePresence>
                     {error && (
                        <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl border border-rose-500/20 text-[12px] font-bold text-center flex items-center justify-center gap-2"
                        >
                           <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" /> {error}
                        </motion.div>
                     )}
                  </AnimatePresence>

                  <div className="space-y-5">
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Command Identity</label>
                        <div className="relative group">
                           <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" />
                           <input 
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="admin@milkow.com"
                              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-zinc-600 shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Security Key</label>
                        <div className="relative group">
                           <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" />
                           <input 
                              type="password" 
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-lg font-bold text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-zinc-700 shadow-inner"
                           />
                        </div>
                     </div>
                  </div>

                  <motion.button 
                     type="submit"
                     disabled={isLoading}
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     className="w-full bg-primary text-white font-black py-4.5 rounded-2xl mt-2 transition-all shadow-[0_20px_40px_-12px_rgba(91,82,240,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale overflow-hidden relative group"
                  >
                     {/* Button Gloss */}
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                     
                     {isLoading ? (
                        <div className="flex items-center gap-2">
                           <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           <span>Authenticating...</span>
                        </div>
                     ) : (
                        <>
                           <span>Initialize Dashboard</span>
                           <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                     )}
                  </motion.button>
               </form>
            </motion.div>
            
            {/* Footer */}
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.6 }}
               className="mt-12 flex flex-col items-center gap-4"
            >
               <div className="flex items-center gap-4 opacity-50">
                  <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-white" />
                  <p className="text-white text-[10px] font-bold uppercase tracking-[0.4em]">Proprietary Technology</p>
                  <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-white" />
               </div>
               <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
                  &copy; {new Date().getFullYear()} Milkow Operations
               </p>
            </motion.div>
         </main>
      </div>
   );
}
