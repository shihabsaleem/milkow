"use client";

import { ArrowLeft, Save, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import data from "../../data/data.json";

export default function UserProfilePage() {
   const router = useRouter();

   const [adminName, setAdminName] = useState("Sayas R.");
   const [payeeName, setPayeeName] = useState(data.payment_setup.payee_name || "");
   const [upiId, setUpiId] = useState(data.payment_setup.upi_id || "");
   const [isSaved, setIsSaved] = useState(false);

   const handleSave = () => {
      // Mutate cached app context globally
      data.payment_setup.payee_name = payeeName;
      data.payment_setup.upi_id = upiId;
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
   };

   const handleLogout = () => {
      router.push("/login");
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
                  <p className="text-xs text-zinc-500">Edit business details</p>
               </div>
            </div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-8">
            {/* Profile Picture & Editable Name */}
            <div className="flex flex-col items-center gap-4 mt-4">
               <div className="h-28 w-28 rounded-3xl overflow-hidden ring-4 ring-white shadow-xl">
                  <img
                     src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop"
                     alt="Profile"
                     className="h-full w-full object-cover"
                  />
               </div>
               <div className="text-center w-full flex flex-col items-center">
                  <input 
                     type="text" 
                     value={adminName} 
                     onChange={(e) => setAdminName(e.target.value)}
                     className="text-2xl font-black text-zinc-900 text-center bg-transparent border-none focus:ring-0 w-full focus:outline-none placeholder:text-zinc-300"
                     placeholder="Administrator Name"
                  />
                  <p className="text-[11px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-3 py-1 rounded-lg mt-1 inline-block">System Owner</p>
               </div>
            </div>

            {/* Editable Settings Block */}
            <div className="flex flex-col gap-4">
               <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex flex-col gap-4">
                  <h3 className="font-bold text-zinc-900 mb-1 border-b border-zinc-100 pb-2">Business & Payment Setup</h3>
                  
                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">UPI Payee Name</label>
                     <input 
                        type="text" 
                        value={payeeName}
                        onChange={(e) => setPayeeName(e.target.value)}
                        className="w-full bg-slate-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                     />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">UPI ID (VPA)</label>
                     <input 
                        type="text" 
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-slate-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-2"
                     />
                  </div>
                  
                  <button 
                     onClick={handleSave} 
                     className={`w-full text-white font-bold py-4 rounded-xl mt-2 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${isSaved ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-primary shadow-primary/20'}`}
                  >
                     <Save size={18} /> {isSaved ? "Settings Saved!" : "Save Settings"}
                  </button>
               </div>

               <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-bold py-4 rounded-2xl md:mt-2 active:scale-95 transition-all shadow-sm border border-rose-100 flex items-center justify-center gap-2">
                  <LogOut size={18} /> Sign Out of Milkow
               </button>

            </div>
         </main>
      </div>
   );
}
