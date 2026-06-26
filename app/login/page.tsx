"use client";

import { useLoginLogic } from "@/hooks/useLoginLogic";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
   const {
      email,
      setEmail,
      password,
      setPassword,
      isLoading,
      error,
      handleLogin
   } = useLoginLogic();

   return (
      <div className="min-h-screen w-full bg-mono-bg flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-mono-text/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -right-24 w-64 h-64 bg-mono-text/5 rounded-full blur-3xl" />
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
                     className="object-contain min-w-[150px] w-auto"
                     priority
                  />
               </motion.div>


            </div>

            {/* Login Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-radius-2xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] border border-white relative group overflow-visible">
               {/* Subtle background glow for the card */}
               <div className="absolute -inset-1 bg-linear-to-br from-primary/20 to-emerald-400/20 rounded-radius-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity -z-10" />
               <div className="absolute inset-0 bg-white/60 rounded-radius-2xl -z-10 backdrop-blur-3xl" />

               <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-mono-text tracking-tight">Welcome Back</h2>
                  <p className="text-xs font-medium text-mono-text-muted mt-1.5">Sign in</p>
               </div>

               <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5 relative group/input">
                     <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent rounded-radius-md opacity-0 group-focus-within/input:opacity-100 transition-opacity -z-10 blur-md" />
                     <div className="relative flex items-center">
                        <div className="absolute left-4 z-10 flex items-center justify-center text-mono-text-disabled group-focus-within/input:text-mono-text transition-colors pointer-events-none">
                           <Mail size={18} strokeWidth={2} />
                        </div>
                        <input
                           type="email"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           className="w-full bg-mono-bg/50 backdrop-blur-sm border-2  border-mono-border shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] hover:border-mono-border focus:border-mono-text focus:bg-white rounded-radius-md pl-12 pr-4 py-4 text-sm font-bold text-mono-text focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-mono-text-disabled"
                           placeholder="Email address"
                           required
                        />
                     </div>
                  </div>

                  


                  <div className="flex flex-col gap-1.5 relative group/input">
                     <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent rounded-radius-md opacity-0 group-focus-within/input:opacity-100 transition-opacity -z-10 blur-md" />
                     <div className="relative flex items-center">
                        <div className="absolute left-4 z-10 flex items-center justify-center text-mono-text-disabled group-focus-within/input:text-mono-text transition-colors pointer-events-none">
                           <Lock size={18} strokeWidth={2.5} />
                        </div>
                        <input
                           type="password"
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="w-full bg-mono-bg/50 backdrop-blur-sm border-2 border-mono-border shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] hover:border-mono-border focus:border-mono-text focus:bg-white rounded-radius-md pl-12 pr-4 py-4 text-sm font-bold text-mono-text focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-mono-text-disabled"
                           placeholder="Password"
                           required
                        />
                     </div>
                  </div>

                  <AnimatePresence>
                     {error && (
                        <motion.div
                           initial={{ opacity: 0, height: 0, y: -10 }}
                           animate={{ opacity: 1, height: "auto", y: 0 }}
                           exit={{ opacity: 0, height: 0, y: -10 }}
                           className="bg-mono-surface/80 backdrop-blur-md border border-rose-100 text-rose-600 px-4 py-3 rounded-radius text-xs font-bold flex items-center gap-2 overflow-hidden"
                        >
                           <div className="w-1.5 h-1.5 rounded-full bg-mono-surface0 animate-pulse shrink-0" />
                           {error}
                        </motion.div>
                     )}
                  </AnimatePresence>

                  <button
                     disabled={isLoading}
                     type="submit"
                     className="w-full bg-mono-text hover:bg-mono-text/80 text-white font-bold py-4 rounded-radius-md shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn disabled:opacity-70 mt-2"
                  >
                     <div className="absolute inset-0 bg-linear-to-br from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                     {isLoading ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     ) : (
                        <>
                           Sign in
                           <ArrowRight size={18} className="group-hover/btn:translate-x-1 group-hover/btn:scale-110 transition-all" />
                        </>
                     )}
                  </button>
               </form>

               <div className="flex justify-center mt-6 pt-4 border-t border-mono-divider">
                  <Link
                     href="/bill"
                     className="text-xs font-bold text-mono-text-muted hover:text-mono-text transition-colors flex items-center gap-1 active:scale-95"
                  >
                     Looking for your bill? View Client Bill
                  </Link>
               </div>
            </div>

            {/* Copyright */}
            <p className="text-center mt-10 text-mono-text-disabled text-[10px] font-medium tracking-wide uppercase">
               &copy; 2026 Milkow &bull; <a href="https://shihabsaleem.site" target="_blank" rel="noopener noreferrer" className="hover:text-mono-text transition-colors">shihab saleem</a>
            </p>
         </motion.div>
      </div>
   );
}
