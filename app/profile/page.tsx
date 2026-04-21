"use client";

import { ArrowLeft, Save, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";

export default function UserProfilePage() {
   const router = useRouter();
   const { logout } = useAuth();

   const [adminName, setAdminName] = useState("Sayas R.");
   const [payeeName, setPayeeName] = useState("");
   const [upiId, setUpiId] = useState("");
   const [pin, setPin] = useState("");
   const [isSaved, setIsSaved] = useState(false);

   // Load current settings from Supabase
   useEffect(() => {
      const fetchSettings = async () => {
         const { data } = await supabase.from('system_settings').select('*').eq('key', 'general').single();
         if (data) {
            const val = data.value as T.Settings;
            setAdminName(val.system_user?.name || "Sayas R.");
            setPin(val.system_user?.pin || "");
            setPayeeName(val.payment?.payee_name || "");
            setUpiId(val.payment?.upi_id || "");
         }
      };
      
      fetchSettings();
      const sub = supabase.channel('profile_general').on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, fetchSettings).subscribe();
      return () => { sub.unsubscribe(); };
   }, []);

   const handleSave = async () => {
      try {
         await supabase.from('system_settings').upsert({
            key: 'general',
            value: {
               payment: { payee_name: payeeName, upi_id: upiId, currency_code: "INR" },
               system_user: { name: adminName, pin: pin }
            }
         });
         setIsSaved(true);
         setTimeout(() => setIsSaved(false), 2000);
      } catch (e: unknown) {
         const err = e as Error;
         console.error("Failed to save settings:", err.message);
      }
   };

   const handleLogout = async () => {
      await logout();
      // Clear the session cookie
      document.cookie = "milkow_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push("/login");
      router.refresh();
   };

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto pb-32">
         {/* HEADER */}
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center gap-4">
               <button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-full transition-colors active:scale-95">
                  <ArrowLeft size={20} />
               </button>
               <div>
                  <h1 className="text-lg font-bold">System Profile</h1>
                  <p className="text-xs text-zinc-500">Edit business & security details</p>
               </div>
            </div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-8">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4 mt-4">
               <div className="h-28 w-28 rounded-3xl overflow-hidden ring-4 ring-white shadow-xl relative group bg-zinc-900 flex items-center justify-center">
                  <span className="text-white text-4xl font-black">{adminName.charAt(0)}</span>
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                     <p className="text-white text-[10px] font-bold uppercase tracking-widest">Change</p>
                  </div>
               </div>
               <div className="text-center">
                  <h2 className="text-2xl font-black text-zinc-900">{adminName}</h2>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-3 py-1 rounded-lg mt-1 inline-block">System Owner</p>
               </div>
            </div>

            {/* Editable Settings Blocks */}
            <div className="flex flex-col gap-6">

               {/* Account Security Section */}
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 flex flex-col gap-5">
                  <h3 className="font-bold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                     Security & Account
                  </h3>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Full Name</label>
                     <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-slate-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Your full name"
                     />
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Security PIN / Password</label>
                     <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full bg-slate-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="••••••"
                     />
                     <p className="text-[9px] text-zinc-400 mt-0.5 pl-1 italic">Used for logging into the dashboard</p>
                  </div>
               </div>

               {/* Business & Payment Section */}
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 flex flex-col gap-5">
                  <h3 className="font-bold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                     Business & Payment Setup
                  </h3>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">UPI Payee Name</label>
                     <input
                        type="text"
                        value={payeeName}
                        onChange={(e) => setPayeeName(e.target.value)}
                        className="w-full bg-slate-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                     />
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">UPI ID (VPA)</label>
                     <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-slate-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                     />
                  </div>

                  <button
                     onClick={handleSave}
                     className={`w-full text-white font-bold py-4 rounded-xl mt-2 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${isSaved ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-primary shadow-primary/20'}`}
                  >
                     <Save size={18} /> {isSaved ? "Profile Updated!" : "Save All Changes"}
                  </button>
               </div>

               <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-sm border border-rose-100 flex items-center justify-center gap-2">
                  <LogOut size={18} /> Sign Out of Milkow
               </button>

            </div>
         </main>
      </div>
   );
}
