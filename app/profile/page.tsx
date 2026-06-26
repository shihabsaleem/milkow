"use client";

import { ArrowLeft, Save, LogOut, X, Plus, Edit2, Check, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useProfileLogic } from "@/hooks/useProfileLogic";

export default function UserProfilePage() {
   const {
      router,
      user,
      loading,
      adminName,
      setAdminName,
      payeeName,
      setPayeeName,
      upiId,
      setUpiId,
      pin,
      setPin,
      isSaved,
      autoCloseEnabled,
      setAutoCloseEnabled,
      morningCloseTime,
      setMorningCloseTime,
      eveningCloseTime,
      setEveningCloseTime,
      areas,
      newRoute,
      setNewRoute,
      isAddingRoute,
      routeSuccess,
      listEndRef,
      handleSave,
      addRoute,
      removeRoute,
      editRoute,
      editingRouteId,
      setEditingRouteId,
      editingRouteName,
      setEditingRouteName,
      handleLogout,
      fetchSettings,
      role
   } = useProfileLogic();



   if (loading || !user) {
      return (
         <div className="min-h-screen w-full flex items-center justify-center bg-mono-bg">
            <div className="w-8 h-8 border-4 border-mono-text border-t-transparent rounded-full animate-spin" />
         </div>
      );
   }

   return (
      <PullToRefresh onRefresh={() => fetchSettings(true)} className="bg-mono-bg pb-32">
         {/* HEADER */}
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-mono-border/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center gap-4">
               <button onClick={() => router.back()} className="p-2 -ml-2 text-mono-text-muted hover:bg-mono-surface rounded-full transition-colors active:scale-95">
                  <ArrowLeft size={20} />
               </button>
               <div>
                  <h1 className="text-lg font-semibold">System Profile</h1>
                  <p className="text-xs text-mono-text-muted">Edit business & security details</p>
               </div>
            </div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-8">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4 mt-4">
               <div className="h-28 w-28 rounded-hero overflow-hidden ring-4 ring-white shadow-sm relative group bg-mono-text flex items-center justify-center">
                  <span className="text-white text-4xl font-bold">{adminName.charAt(0)}</span>
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                     <p className="text-white text-[10px] font-bold uppercase tracking-widest">Change</p>
                  </div>
               </div>
               <div className="text-center">
                  <h2 className="text-2xl font-semibold text-mono-text">{adminName}</h2>
                  <p className="text-[11px] font-bold tracking-widest uppercase text-mono-text bg-mono-text/10 px-3 py-1 rounded-sm mt-1 inline-block">System Owner</p>
               </div>
            </div>

            {/* Editable Settings Blocks */}
            <div className="flex flex-col gap-6">

               {/* Superadmin Quick Access */}
               {role === 'superadmin' && (
                  <Link href="/superadmin" className="bg-mono-surface hover:bg-emerald-100/80 rounded-hero p-6 shadow-sm border border-mono-text/50 flex items-center justify-between transition-colors active:scale-95 group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-card bg-mono-text/10 flex items-center justify-center text-mono-text">
                           <ShieldAlert size={20} />
                        </div>
                        <div>
                           <h3 className="font-semibold text-emerald-900">Superadmin Dashboard</h3>
                           <p className="text-xs text-mono-text/80">Manage all franchises & system settings</p>
                        </div>
                     </div>
                     <ArrowLeft size={20} className="text-emerald-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </Link>
               )}

               {/* Account Security Section */}
               <div className="bg-white rounded-hero p-6 shadow-sm border border-mono-divider flex flex-col gap-5">
                  <h3 className="font-semibold text-mono-text border-b border-mono-divider pb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-mono-text rounded-full"></span>
                     Security & Account
                  </h3>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-bold text-mono-text-disabled uppercase tracking-widest pl-1">Full Name</label>
                     <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-mono-bg border border-mono-border rounded-card px-4 py-3 text-sm font-medium text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-mono-text transition-all"
                        placeholder="Your full name"
                     />
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-bold text-mono-text-disabled uppercase tracking-widest pl-1">Security PIN / Password</label>
                     <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full bg-mono-bg border border-mono-border rounded-card px-4 py-3 text-sm font-medium text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-mono-text transition-all"
                        placeholder="••••••"
                     />
                     <p className="text-[9px] text-mono-text-disabled mt-0.5 pl-1 italic">Used for logging into the dashboard</p>
                  </div>
               </div>

               {/* Business & Payment Section */}
               <div className="bg-white rounded-hero p-6 shadow-sm border border-mono-divider flex flex-col gap-5">
                  <h3 className="font-semibold text-mono-text border-b border-mono-divider pb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-mono-text rounded-full"></span>
                     Business & Payment Setup
                  </h3>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-bold text-mono-text-disabled uppercase tracking-widest pl-1">UPI Payee Name</label>
                     <input
                        type="text"
                        value={payeeName}
                        onChange={(e) => setPayeeName(e.target.value)}
                        className="w-full bg-mono-bg border border-mono-border rounded-card px-4 py-3 text-sm font-medium text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-mono-text transition-all"
                     />
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-bold text-mono-text-disabled uppercase tracking-widest pl-1">UPI ID (VPA)</label>
                     <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-mono-bg border border-mono-border rounded-card px-4 py-3 text-sm font-medium text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-mono-text transition-all"
                     />
                  </div>
               </div>

               {/* Automation Settings Section */}
               <div className="bg-white rounded-hero p-6 shadow-sm border border-mono-divider flex flex-col gap-5">
                  <h3 className="font-semibold text-mono-text border-b border-mono-divider pb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                     Automation & Shifts
                  </h3>

                  <div className="flex items-center justify-between">
                     <div className="flex flex-col">
                        <label className="text-sm font-bold text-mono-text">Auto-Close Shifts</label>
                        <p className="text-[10px] text-mono-text-disabled">Automatically blocks deliveries and generates bills</p>
                     </div>
                     <button
                        onClick={() => setAutoCloseEnabled(!autoCloseEnabled)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${autoCloseEnabled ? 'bg-mono-text' : 'bg-mono-border'}`}
                     >
                        <motion.div
                           className="w-4 h-4 bg-white rounded-full shadow-sm"
                           animate={{ x: autoCloseEnabled ? 24 : 0 }}
                           transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                     </button>
                  </div>

                  <AnimatePresence>
                     {autoCloseEnabled && (
                        <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: "auto", opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           className="flex flex-col gap-4 overflow-hidden"
                        >
                           <div className="flex flex-col gap-1.5 pt-2 border-t border-mono-divider">
                              <label className="text-[10px] font-bold text-mono-text-disabled uppercase tracking-widest pl-1">Morning Auto-Close Time</label>
                              <input
                                 type="time"
                                 value={morningCloseTime}
                                 onChange={(e) => setMorningCloseTime(e.target.value)}
                                 className="w-full bg-mono-bg border border-mono-border rounded-card px-4 py-3 text-sm font-medium text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-mono-text transition-all"
                              />
                           </div>
                           <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-mono-text-disabled uppercase tracking-widest pl-1">Evening Auto-Close Time</label>
                              <input
                                 type="time"
                                 value={eveningCloseTime}
                                 onChange={(e) => setEveningCloseTime(e.target.value)}
                                 className="w-full bg-mono-bg border border-mono-border rounded-card px-4 py-3 text-sm font-medium text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-mono-text transition-all"
                              />
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               {/* Delivery Routes Section */}
               <div className="bg-white rounded-hero p-6 shadow-sm border border-mono-divider flex flex-col gap-5">
                  <h3 className="font-semibold text-mono-text border-b border-mono-divider pb-3 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-mono-surface0 rounded-full"></span>
                     Delivery Routes
                  </h3>

                  <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                     <AnimatePresence initial={false}>
                        {areas.map((area) => (
                           <motion.div
                              key={area.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="flex items-center justify-between bg-mono-bg border border-mono-border rounded-card px-4 py-3"
                           >
                              {editingRouteId === area.id ? (
                                 <>
                                    <input
                                       autoFocus
                                       value={editingRouteName}
                                       onChange={e => setEditingRouteName(e.target.value)}
                                       onKeyDown={e => { if (e.key === 'Enter') editRoute(area.id, editingRouteName); if (e.key === 'Escape') { setEditingRouteId(null); setEditingRouteName(''); } }}
                                       className="flex-1 bg-white border border-mono-border rounded-sm px-3 py-1.5 text-sm font-bold text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/20 mr-2"
                                    />
                                    <button onClick={() => editRoute(area.id, editingRouteName)} className="text-mono-text hover:bg-mono-surface p-1.5 rounded-sm transition-colors">
                                       <Check size={16} />
                                    </button>
                                    <button onClick={() => { setEditingRouteId(null); setEditingRouteName(''); }} className="text-mono-text-disabled hover:bg-mono-surface p-1.5 rounded-sm transition-colors ml-1">
                                       <X size={16} />
                                    </button>
                                 </>
                              ) : (
                                 <>
                                    <span className="text-sm font-bold text-mono-text flex-1">{area.name}</span>
                                    <button onClick={() => { setEditingRouteId(area.id); setEditingRouteName(area.name); }} className="text-mono-text-disabled hover:bg-mono-surface p-1.5 rounded-sm transition-colors mr-1">
                                       <Edit2 size={15} />
                                    </button>
                                    <button onClick={() => removeRoute(area.id)} className="text-mono-text hover:bg-mono-surface p-1.5 rounded-sm transition-colors">
                                       <X size={16} />
                                    </button>
                                 </>
                              )}
                           </motion.div>
                        ))}
                     </AnimatePresence>
                     <div ref={listEndRef} />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                     <input
                        type="text"
                        value={newRoute}
                        onChange={(e) => setNewRoute(e.target.value)}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') addRoute();
                        }}
                        disabled={isAddingRoute}
                        placeholder="Add new route..."
                        className="flex-1 bg-mono-bg border border-mono-border rounded-card px-4 py-3 text-sm font-medium text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-mono-text transition-all disabled:opacity-50"
                     />
                     <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={addRoute}
                        disabled={!newRoute.trim() || isAddingRoute}
                        className={`p-3 rounded-card transition-all flex items-center justify-center min-w-[48px] ${routeSuccess ? 'bg-mono-text text-white shadow-lg shadow-emerald-500/20' :
                           'bg-mono-text text-white hover:bg-mono-text/80 disabled:opacity-50 disabled:cursor-not-allowed'
                           }`}
                     >
                        {isAddingRoute ? (
                           <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : routeSuccess ? (
                           <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                              <Plus size={20} className="rotate-45" />
                           </motion.div>
                        ) : (
                           <Plus size={20} />
                        )}
                     </motion.button>
                  </div>
               </div>

               <button
                  onClick={handleSave}
                  className={`w-full text-white font-bold py-4 rounded-card mt-2 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${isSaved ? 'bg-mono-text shadow-emerald-500/20' : 'bg-mono-text shadow-primary/20'}`}
               >
                  <Save size={18} /> {isSaved ? "Profile Updated!" : "Save All Changes"}
               </button>

               <button onClick={handleLogout} className="w-full bg-rose-600 text-white font-bold py-4 rounded-card active:scale-95 transition-all shadow-sm border border-rose-100 flex items-center justify-center gap-2">
                  <LogOut size={18} /> Sign Out
               </button>

            </div>
         </main>
      </PullToRefresh>
   );
}
