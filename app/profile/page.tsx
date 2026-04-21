"use client";

import { ArrowLeft, Save, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import data from "../../data/data.json";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, writeBatch } from "firebase/firestore";

export default function UserProfilePage() {
   const router = useRouter();
   const { logout } = useAuth();

   const [adminName, setAdminName] = useState(data.system_user?.name || "Sayas R.");
   const [payeeName, setPayeeName] = useState(data.payment_setup.payee_name || "");
   const [upiId, setUpiId] = useState(data.payment_setup.upi_id || "");
   const [pin, setPin] = useState(data.system_user?.pin || "");
   const [isSaved, setIsSaved] = useState(false);
   const [isMigrating, setIsMigrating] = useState(false);
   const [migrationStatus, setMigrationStatus] = useState("");

   const migrateData = async () => {
      if (!confirm("Are you sure you want to push local data to the Cloud? This should only be done once.")) return;

      setIsMigrating(true);
      setMigrationStatus("Preparing migration...");

      try {
         const batch = writeBatch(db);

         // 1. Settings
         setMigrationStatus("Uploading settings...");
         batch.set(doc(db, "settings", "general"), {
            payment: data.payment_setup,
            system_user: { name: adminName, pin: pin }
         });

         // 2. Inventory
         setMigrationStatus("Uploading inventory...");
         data.inventory.forEach((item, i) => batch.set(doc(db, "inventory", `item_${i}`), item));

         // 3. Customers
         setMigrationStatus("Uploading customers...");
         data.users.forEach((u, i) => batch.set(doc(db, "customers", u.phone.replace(/\D/g, '')), { ...u, id: i }));

         // 4. Bills
         setMigrationStatus("Uploading bills...");
         data.bills.forEach((b) => batch.set(doc(db, "bills", b.id), b));

         // 5. Products
         setMigrationStatus("Uploading products...");
         data.products.forEach((p, i) => batch.set(doc(db, "products", `prod_${i}`), p));

         // 6. Pipeline
         setMigrationStatus("Uploading pipeline...");
         data.pipeline.forEach((stage, i) => batch.set(doc(db, "pipeline", `stage_${i}`), stage));

         // 7. Inventory (Loaded items)
         setMigrationStatus("Uploading stock...");
         data.inventory.forEach((item, i) => batch.set(doc(db, "inventory", `item_${i}`), item));

         // 8. Delivered
         setMigrationStatus("Uploading history...");
         data.delivered.forEach((item, i) => batch.set(doc(db, "delivered", `item_${i}`), item));

         // 9. BONUS: ADD TEST DATA
         setMigrationStatus("Adding extra test data...");
         const extraCustomers = [
            { name: "Alice Wonder", phone: "+91 90000 00001", area: "Highlands", frequency: "Morning Only", status: "Active", id: 101 },
            { name: "Bob Builder", phone: "+91 90000 00002", area: "Riverdale", frequency: "Morning & Evening", status: "Active", id: 102 },
            { name: "Charlie Brown", phone: "+91 90000 00003", area: "Downtown", frequency: "Evening Only", status: "Active", id: 103 }
         ];
         extraCustomers.forEach(u => batch.set(doc(db, "customers", u.phone.replace(/\D/g, '')), u));

         const extraBills = [
            { id: "INV-201", name: "Alice Wonder", type: "Weekly", amount: 250, status: "Pending" },
            { id: "INV-202", name: "Bob Builder", type: "Monthly", amount: 1500, status: "Paid" }
         ];
         extraBills.forEach(b => batch.set(doc(db, "bills", b.id), b));

         const extraProducts = [
            { name: "Lassi", size: "200ml", stock: 50, price: "₹25" },
            { name: "Butter", size: "100g", stock: 30, price: "₹60" }
         ];
         extraProducts.forEach((p, i) => batch.set(doc(db, "products", `test_prod_${i}`), p));

         await batch.commit();
         setMigrationStatus("Success! Data is now in the Cloud.");
         setTimeout(() => { setMigrationStatus(""); setIsMigrating(false); }, 3000);
      } catch (e: any) {
         setMigrationStatus(`Error: ${e.message}`);
         setIsMigrating(false);
      }
   };

   const handleSave = () => {
      // Mutate cached app context globally (simulating persistence before Firebase)
      data.payment_setup.payee_name = payeeName;
      data.payment_setup.upi_id = upiId;
      if (data.system_user) {
         data.system_user.name = adminName;
         data.system_user.pin = pin;
      }

      console.log("Profile updated local cache:", { adminName, pin });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
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
                  <img
                     src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop"
                     alt="Profile"
                     className="h-full w-full object-cover"
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
                     Use this to push your local "data.json" information to the Firebase Cloud. Only do this once!
                  </p>

                  <button
                     onClick={migrateData}
                     disabled={isMigrating}
                     className={`w-full font-bold py-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${isMigrating ? 'bg-zinc-100 text-zinc-400' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
                  >
                     {isMigrating ? "Migrating..." : "🚀 Migrate Data to Firebase"}
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
      </div>

   );
}
