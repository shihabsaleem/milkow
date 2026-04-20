"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Milk, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
   const router = useRouter();
   const [phone, setPhone] = useState("");
   const [pin, setPin] = useState("");
   const [isLoading, setIsLoading] = useState(false);

   const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      
      // Mock login delay
      setTimeout(() => {
         router.push("/");
      }, 700);
   };

   return (
      <div className="flex h-screen w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-hidden">
         {/* Top Decoration */}
         <div className="absolute top-0 left-0 w-full h-[40vh] bg-primary rounded-b-[4rem] flex flex-col items-center justify-center z-0">
            <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute top-20 left-10 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            
            <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ type: "spring", stiffness: 300, damping: 20 }}
               className="bg-white/20 p-5 rounded-3xl backdrop-blur-md mb-6 border border-white/30"
            >
               <Milk size={48} className="text-white fill-white" />
            </motion.div>
            <motion.div
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.1 }}
               className="text-center"
            >
               <h1 className="text-4xl font-black text-white tracking-tight">Milkow.</h1>
               <p className="text-white/80 font-medium text-sm mt-1">Smart Milk Operations</p>
            </motion.div>
         </div>

         {/* Form container */}
         <main className="max-w-md mx-auto w-full flex-1 px-6 pt-[30vh] relative z-10 flex flex-col pb-8">
            <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
               className="bg-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6"
            >
               <div>
                  <h2 className="text-2xl font-black text-zinc-900 leading-tight">Welcome Back</h2>
                  <p className="text-sm text-zinc-500 font-medium mt-1">Sign in to your dashboard</p>
               </div>

               <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
                  <div className="flex flex-col gap-1.5">
                     <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Phone Number</label>
                     <input 
                        type="tel" 
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full bg-slate-50 border border-zinc-200 rounded-2xl px-4 py-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:font-medium placeholder:text-zinc-400"
                     />
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Security PIN</label>
                     <input 
                        type="password" 
                        required
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="••••••"
                        className="w-full bg-slate-50 border border-zinc-200 rounded-2xl px-4 py-4 text-lg font-bold text-zinc-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:font-medium placeholder:text-zinc-400 placeholder:tracking-normal"
                     />
                  </div>

                  <button 
                     type="submit"
                     disabled={isLoading}
                     className="w-full bg-primary text-white font-bold py-4 rounded-2xl mt-4 active:scale-95 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2"
                  >
                     {isLoading ? "Authenticating..." : "Login to Dashboard"}
                     {!isLoading && <ArrowRight size={18} />}
                  </button>
               </form>
            </motion.div>
            
            <p className="text-center text-zinc-400 text-[10px] uppercase tracking-widest font-bold mt-auto pb-4">
               Milkow Enterprise OS v2.0
            </p>
         </main>
      </div>
   );
}
