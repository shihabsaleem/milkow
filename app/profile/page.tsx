"use client";

import { ArrowLeft, Save, LogOut, X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";

export default function UserProfilePage() {
   const router = useRouter();
   const { logout, user, loading } = useAuth();

   useEffect(() => {
      if (!loading && !user) {
         router.push("/login");
      }
   }, [user, loading, router]);

   const [adminName, setAdminName] = useState("Sayas R.");
   const [payeeName, setPayeeName] = useState("");
   const [upiId, setUpiId] = useState("");
   const [pin, setPin] = useState("");
   const [isSaved, setIsSaved] = useState(false);
   
   const [areas, setAreas] = useState<T.Area[]>([]);
   const [newRoute, setNewRoute] = useState("");

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

         const { data: areaData } = await supabase.from('areas').select('*').order('name', { ascending: true });
         if (areaData) setAreas(areaData as T.Area[]);
      };
      
      fetchSettings();
      const sub = supabase.channel('profile_settings')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, fetchSettings)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, fetchSettings)
         .subscribe();
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

         // Also update the actual Supabase login password if PIN is provided
         if (pin && pin.length >= 6) {
            const { error: authError } = await supabase.auth.updateUser({ password: pin });
            if (authError) throw authError;
         }

         setIsSaved(true);
         setPin("");
         setTimeout(() => setIsSaved(false), 2000);
      } catch (e: unknown) {
         const err = e as Error;
         console.error("Failed to save settings:", err.message);
      }
   };

   const addRoute = async () => {
      const name = newRoute.trim();
      if (!name) return;
      try {
         await supabase.from('areas').insert({ name });
         setNewRoute('');
      } catch (e: unknown) {
         const err = e as Error;
         console.error("Failed to add route:", err.message);
      }
   };

   const removeRoute = async (id: number) => {
      try {
         await supabase.from('areas').delete().eq('id', id);
      } catch (e: unknown) {
         const err = e as Error;
         console.error("Failed to remove route:", err.message);
      }
   };

   const handleLogout = async () => {
      await logout();
      // Clear the session cookie
      document.cookie = "milkow_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
   };

   if (loading || !user) {
      return (
         <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
         </div>
      );
   }

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
               </div>

               {/* Delivery Routes Section */}
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 flex flex-col gap-5">
                  <h3 className="font-bold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                     Delivery Routes
                  </h3>

                  <div className="flex flex-col gap-3">
                     {areas.map((area) => (
                        <div key={area.id} className="flex items-center justify-between bg-slate-50 border border-zinc-200 rounded-xl px-4 py-3">
                           <span className="text-sm font-bold text-zinc-900">{area.name}</span>
                           <button 
                              onClick={() => removeRoute(area.id)}
                              className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                           >
                              <X size={16} />
                           </button>
                        </div>
                     ))}

                     <div className="flex items-center gap-2 mt-2">
                        <input
                           type="text"
                           value={newRoute}
                           onChange={(e) => setNewRoute(e.target.value)}
                           onKeyDown={(e) => {
                              if (e.key === 'Enter') addRoute();
                           }}
                           placeholder="Add new route..."
                           className="flex-1 bg-slate-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        <button
                           onClick={addRoute}
                           disabled={!newRoute.trim()}
                           className="bg-zinc-900 text-white p-3 rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                           <Plus size={20} />
                        </button>
                     </div>
                  </div>
               </div>

               <button
                  onClick={handleSave}
                  className={`w-full text-white font-bold py-4 rounded-xl mt-2 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${isSaved ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-primary shadow-primary/20'}`}
               >
                  <Save size={18} /> {isSaved ? "Profile Updated!" : "Save All Changes"}
               </button>

               <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-sm border border-rose-100 flex items-center justify-center gap-2">
                  <LogOut size={18} /> Sign Out of Milkow
               </button>

            </div>
         </main>
      </div>
   );
}
