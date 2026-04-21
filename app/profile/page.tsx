"use client";

import { ArrowLeft, Save, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/Modal";
import * as T from "@/types/database";

// Seed data for initial migration (used only by the migration tool)
const SEED_DATA = {
   system_user: { name: "Sayas R.", pin: "123456" },
   payment_setup: { payee_name: "Sayas R.", upi_id: "sayas@upi", currency_code: "INR" },
   inventory: [
      { name: "Cow Milk", vol: "1L", count: 80, unit: "Bottles", loaded: 60 },
      { name: "Buffalo Milk", vol: "500ml", count: 40, unit: "Bottles", loaded: 30 }
   ],
   users: [
      { name: "John Doe", phone: "+1 234 567 890", area: "Downtown", frequency: "Morning & Evening", status: "Active", order: "1L Cow Milk" },
      { name: "Jane Smith", phone: "+1 234 567 891", area: "Uptown", frequency: "Morning Only", status: "Active", order: "500ml Buffalo Milk" }
   ],
   bills: [
      { id: "INV-001", name: "John Doe", type: "Monthly", amount: 1200, status: "Pending" },
      { id: "INV-002", name: "Jane Smith", type: "Weekly", amount: 300, status: "Pending" }
   ],
   products: [
      { name: "Cow Milk", size: "1L", stock: 80, price: "₹50" },
      { name: "Buffalo Milk", size: "500ml", stock: 40, price: "₹35" }
   ],
   pipeline: [
      { label: "Raw Milk Collected", value: "120", unit: "L" },
      { label: "Processed", value: "100", unit: "L" },
      { label: "Packaged", value: "90", unit: "Bottles" }
   ],
   delivered: [
      { name: "Cow Milk", vol: "1L", count: 55, unit: "Bottles" },
      { name: "Buffalo Milk", vol: "500ml", count: 28, unit: "Bottles" }
   ],
   route: [
      { id: 1, name: "John Doe", qty: "2", delivered: false },
      { id: 2, name: "Jane Smith", qty: "1", delivered: false }
   ],
   routes: ["Downtown", "Uptown", "Highlands", "Riverdale"]
};

export default function UserProfilePage() {
   const router = useRouter();
   const { logout } = useAuth();

   const [adminName, setAdminName] = useState("Sayas R.");
   const [payeeName, setPayeeName] = useState("");
   const [upiId, setUpiId] = useState("");
   const [pin, setPin] = useState("");
   const [isSaved, setIsSaved] = useState(false);
   const [isMigrating, setIsMigrating] = useState(false);
   const [migrationStatus, setMigrationStatus] = useState("");
   const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);

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

   const migrateData = async () => {
      setIsMigrateModalOpen(false);
      setIsMigrating(true);
      setMigrationStatus("Preparing migration...");

      try {
         setMigrationStatus("Uploading settings...");
         await supabase.from('system_settings').upsert({
            key: 'general',
            value: {
               payment: SEED_DATA.payment_setup,
               system_user: { name: adminName, pin: pin }
            }
         });

         setMigrationStatus("Uploading inventory...");
         await supabase.from('inventory').upsert(SEED_DATA.inventory);

         setMigrationStatus("Uploading customers...");
         await supabase.from('customers').upsert(SEED_DATA.users.map((u, i) => ({ ...u, outstanding: 0, id: i })));

         setMigrationStatus("Uploading bills...");
         await supabase.from('bills').upsert(SEED_DATA.bills.map(b => ({ ...b, customer_name: b.name })));

         setMigrationStatus("Uploading products...");
         await supabase.from('products').upsert(SEED_DATA.products);

         setMigrationStatus("Uploading routes...");
         await supabase.from('system_settings').upsert({
            key: 'routes',
            value: { names: SEED_DATA.routes }
         });

         setMigrationStatus("Success! Data is now in the Cloud.");
         setTimeout(() => { setMigrationStatus(""); setIsMigrating(false); }, 3000);
      } catch (e: unknown) {
         const err = e as Error;
         setMigrationStatus(`Error: ${err.message}`);
         setIsMigrating(false);
      }
   };

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
               <div className="h-28 w-28 rounded-3xl overflow-hidden ring-4 ring-white shadow-xl relative group">
                  <Image
                     src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop"
                     alt="Profile"
                     fill
                     className="object-cover"
                  />
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

               {/* Maintenance & Migration */}
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 flex flex-col gap-4">
                  <h3 className="font-bold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                     Maintenance & Cloud Migration
                  </h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                     Use this to push your local &quot;data.json&quot; information to the Supabase Cloud. Only do this once!
                  </p>

                  <button
                     onClick={() => setIsMigrateModalOpen(true)}
                     disabled={isMigrating}
                     className={`w-full font-bold py-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${isMigrating ? 'bg-zinc-100 text-zinc-400' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
                  >
                     {isMigrating ? "Migrating..." : "🚀 Migrate Data to Supabase"}
                  </button>
                  {migrationStatus && (
                     <p className="text-center text-[10px] font-bold text-amber-600 uppercase tracking-widest">{migrationStatus}</p>
                  )}
               </div>

               <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-bold py-4 rounded-2xl md:mt-2 active:scale-95 transition-all shadow-sm border border-rose-100 flex items-center justify-center gap-2">
                  <LogOut size={18} /> Sign Out of Milkow
               </button>

            </div>
         </main>

         <Modal 
            isOpen={isMigrateModalOpen}
            onClose={() => setIsMigrateModalOpen(false)}
            onConfirm={migrateData}
            title="Cloud Migration"
            message="Are you sure you want to push seed data to the Cloud? This will overwrite your existing setting configurations. This action should typically only be performed once during initial setup."
            confirmText="Sync to Cloud"
            cancelText="Not Now"
         />
      </div>
   );
}
