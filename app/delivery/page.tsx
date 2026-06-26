"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, Sunrise, Sunset, CloudUpload, ChevronRight, Check, PackagePlus, PackageSearch, Search, Minus, Plus, Wallet2, MoreVertical, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import PullToRefresh from "@/components/ui/PullToRefresh";
import Modal from "@/components/ui/Modal";
import * as T from "@/types/database";
import { recordPayment, fetchCustomerBalance } from "@/lib/financials";
import { useDeliveryLogic } from "@/hooks/useDeliveryLogic";

type DeliveryWithCustomer = T.Delivery & { customer: T.Customer & { financials?: { current_balance: number } } };

export default function DeliveryPage() {
   const router = useRouter();
   const { user, loading } = useAuth();

   useEffect(() => {
      if (!loading && !user) {
         router.push("/404");
      }
   }, [user, loading, router]);

   const {
      deliveries,
      products,
      routesList,
      shift,
      manualShift,
      setManualShift,
      isLoading,
      isSyncing,
      isShiftClosed,
      isStagingCollapsed,
      setIsStagingCollapsed,
      modalConfig,
      setModalConfig,
      changedDeliveries,
      hasUnsavedChanges,
      toggleDelivery,
      updateProductQty,
      updateMilkQty,
      handleSync,
      runMarkAsPaid,
      fetchData
   } = useDeliveryLogic();

   const [searchQuery, setSearchQuery] = useState("");
   const [selectedRoute, setSelectedRoute] = useState<number | "">(() => {
      if (typeof window !== "undefined") {
         const saved = localStorage.getItem('milkow_selected_route');
         if (saved !== null) return saved === "" ? "" : parseInt(saved);
      }
      return "";
   });

   // Persist selectedRoute
   useEffect(() => {
      localStorage.setItem('milkow_selected_route', selectedRoute.toString());
   }, [selectedRoute]);

   const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
   const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
   const [editingSeqId, setEditingSeqId] = useState<string | null>(null);
   const [editSeqVal, setEditSeqVal] = useState("");
   const [isDevMenuOpen, setIsDevMenuOpen] = useState(false);

   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
   const [paymentAmount, setPaymentAmount] = useState("");
   const [paymentMethod, setPaymentMethod] = useState("Cash");
   const [paymentNotes, setPaymentNotes] = useState("");
   const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<string | null>(null);
   const [paymentTotalDue, setPaymentTotalDue] = useState<number | null>(null);

   const filteredDeliveries = deliveries.filter(d => {
      const user = d.customer;
      if (!user || user.status === 'Inactive') return false;

      // Filter by selected route (area)
      if (selectedRoute !== "" && user.area_id !== selectedRoute) return false;

      // Filter by shift: show if frequency includes current shift
      const freq = user.frequency;
      if (shift === 'morning' && freq === 'Evening Only') return false;
      if (shift === 'evening' && freq === 'Morning Only') return false;
      // Also filter by delivery shift column
      const dbShift = shift === 'morning' ? 'Morning Only' : 'Evening Only';
      if (d.shift !== dbShift) return false;

      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
   }).sort((a, b) => (Number(a.customer?.delivery_order) || 0) - (Number(b.customer?.delivery_order) || 0));

   const remainingStops = filteredDeliveries.filter(d => !d.delivered).length;

   return (
      <PullToRefresh onRefresh={() => fetchData(true)} className="bg-mono-bg pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-mono-border/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex flex-col gap-3">
               <div className="flex items-center justify-between">
                  <div className="relative">
                     <button onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)} className="flex items-center gap-1.5 group">
                        <h1 className="text-xl font-bold text-mono-text">{routesList.find(r => r.id === selectedRoute)?.name || 'All Deliveries'}</h1>
                        <ChevronDown size={18} className={`text-mono-text-disabled transition-transform duration-300 ${isRouteMenuOpen ? 'rotate-180' : ''}`} />
                     </button>

                     <AnimatePresence>
                        {isRouteMenuOpen && (
                           <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsRouteMenuOpen(false)} />
                              <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute left-0 mt-3 w-64 bg-white/90 backdrop-blur-xl border border-mono-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-radius-md overflow-hidden z-50"
                              >
                                 <div className="px-4 py-2 border-b border-mono-divider/50 bg-mono-bg/50">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-mono-text-disabled">Select Route</span>
                                 </div>
                                 <div className="py-1 max-h-80 overflow-y-auto no-scrollbar">
                                    <button
                                       onClick={() => { setSelectedRoute(""); setIsRouteMenuOpen(false); }}
                                       className={`w-full text-left px-4 py-3.5 text-sm font-bold flex items-center justify-between transition-all ${selectedRoute === "" ? 'bg-mono-text/5 text-mono-text' : 'text-mono-text-muted hover:bg-mono-bg'}`}
                                    >
                                       <span>All Deliveries</span>
                                       {selectedRoute === "" && <Check size={16} strokeWidth={3} />}
                                    </button>
                                    {routesList.map((route) => (
                                       <button
                                          key={route.id}
                                          onClick={() => { setSelectedRoute(route.id); setIsRouteMenuOpen(false); }}
                                          className={`w-full text-left px-4 py-3.5 text-sm font-bold flex items-center justify-between transition-all ${selectedRoute === route.id ? 'bg-mono-text/5 text-mono-text' : 'text-mono-text-muted hover:bg-mono-bg'}`}
                                       >
                                          <span>{route.name}</span>
                                          {selectedRoute === route.id && <Check size={16} strokeWidth={3} />}
                                       </button>
                                    ))}
                                 </div>
                              </motion.div>
                           </>
                        )}
                     </AnimatePresence>
                  </div>
                  <span className="text-xs font-bold text-mono-text tracking-wider mt-0.5 uppercase">{remainingStops} Stops Remaining</span>
               </div>

               <div className="flex items-center gap-2">
                  {/* Morning / Evening Toggle */}
                  <div className="flex-1 grid grid-cols-2 p-1 rounded-radius-md bg-mono-surface relative h-11">
                     <motion.div layout className="absolute inset-y-1 rounded-radius shadow-sm z-0 bg-white" style={{ left: shift === 'morning' ? '4px' : '50%', width: 'calc(50% - 4px)' }} transition={{ type: 'spring', stiffness: 450, damping: 35 }} />
                     <button onClick={() => setManualShift('morning')} className={`relative z-10 flex items-center justify-center gap-1.5 rounded-radius transition-all text-sm font-bold ${shift === 'morning' ? 'text-mono-text' : 'text-mono-text-disabled'}`}>
                        <Sunrise size={15} strokeWidth={2.5} /><span>Morning</span>
                     </button>
                     <button onClick={() => setManualShift('evening')} className={`relative z-10 flex items-center justify-center gap-1.5 rounded-radius transition-all text-sm font-bold ${shift === 'evening' ? 'text-mono-text' : 'text-mono-text-disabled'}`}>
                        <Sunset size={15} strokeWidth={2.5} /><span>Evening</span>
                     </button>
                  </div>

                  {/* Dev Options Menu */}
                  <div className="relative">
                     <button
                        onClick={() => setIsDevMenuOpen(!isDevMenuOpen)}
                        className="h-11 w-11 rounded-radius-md bg-mono-bg border border-mono-border flex items-center justify-center text-mono-text-muted hover:bg-mono-surface transition-colors"
                     >
                        <MoreVertical size={20} />
                     </button>
                     <AnimatePresence>
                        {isDevMenuOpen && (
                           <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsDevMenuOpen(false)} />
                              <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute right-0 mt-3 w-48 bg-white border border-mono-border shadow-sm rounded-radius-md overflow-hidden z-50 p-2"
                              >
                                 <button
                                    onClick={() => router.push('/billing')}
                                    className="w-full text-left px-3 py-2 text-sm font-bold text-mono-text hover:bg-mono-bg rounded-radius transition-colors"
                                 >
                                    Billing
                                 </button>
                                 <div className="h-px bg-mono-surface my-1 mx-2" />
                                 <button
                                    onClick={async () => {
                                       setIsDevMenuOpen(false);
                                       const { data } = await supabase.from('system_settings').select('value').eq('key', 'automation').single();
                                       if (data) {
                                          const val = data.value as any;
                                          delete val.lastMorningClose;
                                          delete val.lastEveningClose;
                                          const { error } = await supabase.from('system_settings').update({ value: val }).eq('key', 'automation');
                                          if (error) {
                                             alert('Reset failed: ' + error.message);
                                          } else {
                                             alert('Shift reset successfully!');
                                             window.location.reload();
                                          }
                                       }
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-radius transition-colors"
                                 >
                                    Reset Shift
                                 </button>
                              </motion.div>
                           </>
                        )}
                     </AnimatePresence>
                  </div>
               </div>
            </div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-mono-text-disabled" size={18} />
               <input type="text" placeholder="Search customers..." className="w-full bg-white border border-mono-border rounded-radius-md py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {isLoading ? (
               [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="bg-white border border-mono-border shadow-sm rounded-radius animate-pulse">
                     <div className="p-4">
                        <div className="flex flex-row items-start justify-between gap-4">
                           <div className="flex flex-col flex-1">
                              <div className="flex items-start gap-3">
                                 <div className="mt-0.5 shrink-0 w-8 h-8 rounded-radius-xs bg-mono-border" />
                                 <div className="flex flex-col w-full">
                                    <div className="h-5 bg-mono-border rounded-md w-3/4 max-w-[160px] mb-1.5" />
                                    <div className="h-4 bg-mono-surface rounded-md w-1/2 max-w-[100px]" />
                                 </div>
                              </div>
                           </div>
                           <div className="flex flex-col justify-center ml-2">
                              <div className="h-12 w-12 rounded-radius bg-mono-border" />
                           </div>
                        </div>
                     </div>
                     <div className="px-4 pb-2.5 pt-2.5 border-t border-mono-divider flex items-center justify-between">
                        <div className="h-6 w-24 bg-mono-surface rounded-radius-xs" />
                        <div className="flex items-center gap-2">
                           <div className="h-8 w-20 bg-mono-surface rounded-md" />
                           <div className="h-8 w-8 bg-mono-surface rounded-md" />
                        </div>
                     </div>
                  </div>
               ))
            ) : filteredDeliveries.length > 0 ? (
               filteredDeliveries.map((delivery, index) => {
                  const isExpanded = expandedStopId === delivery.id;
                  const activeItems = delivery.misc_items || [];
                  return (
                     <motion.div key={delivery.id} layout className={` rounded-radius transition-all ${delivery.delivered ? 'bg-mono-bg border-mono-border opacity-70 shadow' : 'bg-white border-mono-border shadow-sm'}`}>
                        <div className="p-4">

                           <div className="flex flex-row items-start justify-between gap-4">

                              <div className="flex flex-col flex-1">
                                 <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-radius-xs font-bold text-xs text-center transition-all ${delivery.delivered ? 'bg-mono-border text-mono-text-muted' : 'bg-mono-text text-white shadow-md'}`}>
                                       {index + 1}
                                    </div>
                                    <div className="flex flex-col">
                                       <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className={`font-bold text-lg leading-tight ${delivery.delivered ? 'text-mono-text-muted line-through' : 'text-mono-text'}`}>{delivery.customer?.name}</h3>
                                          {delivery.customer?.financials && delivery.customer.financials.current_balance !== 0 && (
                                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${delivery.customer.financials.current_balance < 0
                                                ? 'bg-mono-text/10 text-mono-text'
                                                : 'bg-mono-text/10 text-mono-text'
                                                }`}>
                                                {delivery.customer.financials.current_balance < 0 ? 'Adv: ' : 'Bal: '}
                                                ₹{Math.abs(delivery.customer.financials.current_balance).toLocaleString()}
                                             </span>
                                          )}
                                       </div>
                                       {(() => {
                                          const prod = products.find(p => p.id === delivery.product_id);
                                          return (
                                             <p className="font-semibold text-mono-text text-sm mt-0.5">
                                                {delivery.milk_qty} {prod ? `${prod.name} (${prod.size})` : 'Milk'}
                                             </p>
                                          );
                                       })()}
                                    </div>
                                 </div>

                                 {!isExpanded && activeItems.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2 mb-2 pl-11">
                                       {activeItems.map((item: any) => (<span key={item.name} className="bg-mono-text/10 text-mono-text text-[10px] font-bold px-2 py-1 rounded-md">{item.qty}x {item.name}</span>))}
                                    </div>
                                 )}
                              </div>

                              <div className="flex flex-col justify-center ml-2">
                                 <button onClick={(e) => { e.stopPropagation(); toggleDelivery(delivery.id); }} className={`h-12 w-12 flex items-center justify-center rounded-radius shadow-xs transition-all ${delivery.delivered ? 'bg-mono-text text-white shadow-emerald-500/20 shadow-md' : 'bg-mono-bg text-mono-text-disabled hover:bg-mono-surface hover:text-mono-text hover:border-mono-text border border-mono-border'} ${isShiftClosed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <Check size={24} strokeWidth={3} />
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="px-4 pb-2 pt-1 border-t border-mono-divider flex items-center justify-between">
                           <button onClick={(e) => { e.stopPropagation(); setExpandedStopId(delivery.id); }} className={`flex items-center gap-1.5 text-xs font-bold transition-colors py-2 px-3 rounded-radius ${isExpanded ? 'text-mono-text' : ' text-mono-text-muted'}`}><PackagePlus size={14} />{activeItems.length > 0 ? 'Edit Extras' : 'Add Products'}</button>

                           <div className="flex items-center gap-2">
                              <button onClick={(e) => {
                                 e.stopPropagation();
                                 if (confirm(`Settle all dues for ${delivery.customer?.name}?`)) {
                                    runMarkAsPaid(delivery.customer_id);
                                 }
                              }} className="flex items-center gap-1.5 text-xs font-bold transition-colors py-2 px-3 rounded-md bg-mono-surface text-mono-text hover:bg-orange-100 border border-mono-border/50" title="Settle Full Amount">
                                 <Wallet2 size={14} /><div className="hidden md:block">Settle</div>
                              </button>
                              <button onClick={async (e) => {
                                 e.stopPropagation();
                                 router.push(`/customers/${delivery.customer_id}`);
                              }} className="flex items-center justify-center h-8 w-8 rounded-md bg-mono-surface text-mono-text hover:bg-mono-border border border-mono-border transition-colors"><ArrowRight size={16} strokeWidth={2.5} /></button>
                           </div>
                        </div>
                     </motion.div>
                  );
               })
            ) : (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <PackageSearch size={48} className="mb-4" />
                  <p className="font-bold">No deliveries scheduled</p>
               </div>
            )}
         </main>

         <AnimatePresence>
            {expandedStopId !== null && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-5">
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl pt-6 pb-12 px-6 flex flex-col relative">
                     <button onClick={() => setExpandedStopId(null)} className="absolute top-4 right-4 p-2 bg-mono-surface rounded-full text-mono-text-muted"><X size={20} /></button>
                     <div className="mb-6"><h2 className="text-xl font-bold text-mono-text">Add Products</h2><p className="text-sm text-mono-text-muted">For {deliveries.find(d => d.id === expandedStopId)?.customer?.name}</p></div>
                     <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar py-1">
                        {/* Milk Control */}
                        {(() => {
                           const stop = deliveries.find(d => d.id === expandedStopId);
                           const milkQty = stop?.milk_qty || 0;
                           const prod = products.find(p => p.id === stop?.product_id);
                           return (
                              <div className={`flex items-center justify-between p-3.5 rounded-radius-md border-2 transition-all ${milkQty > 0 ? 'bg-mono-text/5 border-mono-border' : 'bg-white border-mono-divider'}`}>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-mono-text">{prod ? prod.name : 'Fresh Milk'}</span>
                                    <span className="text-[11px] font-medium text-mono-text-muted">{prod ? prod.size : 'Standard Delivery'}</span>
                                 </div>
                                 <div className="flex items-center gap-3 bg-white border border-mono-divider rounded-radius p-1 shadow-sm">
                                    <button onClick={() => updateMilkQty(expandedStopId!, -1)} className="h-8 w-8 flex items-center justify-center text-mono-text-disabled hover:text-mono-text"><Minus size={16} /></button>
                                    <span className="text-sm font-bold w-5 text-center">{milkQty}</span>
                                    <button onClick={() => updateMilkQty(expandedStopId!, 1)} className="h-8 w-8 flex items-center justify-center text-mono-text-disabled hover:text-mono-text"><Plus size={16} /></button>
                                 </div>
                              </div>
                           );
                        })()}

                        <div className="h-px bg-mono-surface my-1" />

                        {products.filter(p => {
                           const stop = deliveries.find(d => d.id === expandedStopId);
                           return p.id !== stop?.product_id;
                        }).map((product) => {
                           const stopItems = deliveries.find(d => d.id === expandedStopId)?.misc_items || [];
                           const item = stopItems.find((i: any) => i.name === product.name);
                           const qty = item ? item.qty : 0;
                           return (
                              <div key={product.name} className={`flex items-center justify-between p-3.5 rounded-radius-md border-2 transition-all ${qty > 0 ? 'bg-mono-text/10 border-mono-border' : 'bg-white border-mono-divider'}`}>
                                 <div className="flex flex-col"><span className="text-sm font-bold text-mono-text">{product.name}</span><span className="text-[11px] font-medium text-mono-text-muted">{product.size} • {product.price}</span></div>
                                 <div className="flex items-center gap-3 bg-white border border-mono-divider rounded-radius p-1 shadow-sm">
                                    <button onClick={() => updateProductQty(expandedStopId!, product.name, -1)} className="h-8 w-8 flex items-center justify-center text-mono-text-disabled hover:text-mono-text"><Minus size={16} /></button>
                                    <span className="text-sm font-bold w-5 text-center">{qty}</span>
                                    <button onClick={() => updateProductQty(expandedStopId!, product.name, 1)} className="h-8 w-8 flex items-center justify-center text-mono-text-disabled hover:text-mono-text"><Plus size={16} /></button>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                     <button onClick={() => setExpandedStopId(null)} className="w-full bg-mono-text text-white py-4 rounded-radius-md font-bold mt-8 shadow-sm">Done</button>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/*
         <AnimatePresence>
            {isPaymentModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-md flex flex-col gap-6 text-mono-text">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-bold text-mono-text">Record Payment</p><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-mono-surface rounded-radius text-mono-text-muted"><X size={18} /></button></div>

                     {paymentTotalDue !== null ? (
                        <div className="bg-mono-surface border border-mono-border p-4 rounded-radius flex items-center justify-between">
                           <span className="text-mono-text text-xs font-bold uppercase tracking-widest">Total Outstanding</span>
                           <span className="text-mono-text font-bold text-lg">₹{paymentTotalDue.toFixed(2)}</span>
                        </div>
                     ) : (
                        <div className="bg-mono-bg border border-mono-divider p-4 rounded-radius flex items-center justify-center animate-pulse h-14" />
                     )}

                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(paymentAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        // runRecordPayment(amt, paymentMethod, paymentNotes);
                     }} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Payment Amount (₹)</label>
                           <input
                              autoFocus
                              type="number"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                              className="bg-mono-bg border border-mono-divider rounded-radius px-4 py-3 text-sm focus:ring-2 transition-all font-bold"
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Payment Method</label>
                           <div className="grid grid-cols-2 gap-2">
                              {['Cash', 'UPI', 'Bank Transfer', 'Other'].map(method => (
                                 <button
                                    type="button"
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-2 text-sm font-bold rounded-radius border transition-all ${paymentMethod === method ? 'bg-mono-text/5 border-mono-border text-mono-text' : 'bg-white border-mono-border text-mono-text-muted hover:bg-mono-bg'}`}
                                 >
                                    {method}
                                 </button>
                              ))}
                           </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Notes (Optional)</label>
                           <input
                              type="text"
                              placeholder="e.g. Received at door"
                              value={paymentNotes}
                              onChange={e => setPaymentNotes(e.target.value)}
                              className="bg-mono-bg border border-mono-divider rounded-radius px-4 py-3 text-sm focus:ring-2 transition-all"
                           />
                        </div>
                        <button disabled={isLoading} type="submit" className="w-full bg-mono-text text-white font-bold py-4 rounded-radius-md mt-2 active:scale-95 transition-all shadow-sm disabled:opacity-50">
                           {isLoading ? "Saving..." : "Record Payment"}
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
         */}

         <AnimatePresence>
            {hasUnsavedChanges && !isStagingCollapsed && (
               <motion.div
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 80, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-md bg-linear-to-r from-mono-text via-primary/95 to-zinc-950 backdrop-blur-xl text-white rounded-radius-md py-3.5 px-4 shadow-[0_20px_50px_rgba(5,0,68,0.3)] z-110 flex items-center justify-between border border-white/10"
               >
                  <div className="flex items-center gap-3">
                     <div className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-mono-text"></span>
                     </div>
                     <div className="flex flex-col text-left">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-mono-text-disabled">Offline Staging</span>
                        <span className="text-sm font-bold text-white">{changedDeliveries.length} {changedDeliveries.length === 1 ? 'Change' : 'Changes'} Pending</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-radius flex items-center gap-1.5 active:scale-95 transition-all shadow-[0_8px_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                     >
                        {isSyncing ? (
                           <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                              <span>Syncing...</span>
                           </>
                        ) : (
                           <>
                              <CloudUpload size={14} strokeWidth={2.5} />
                              <span>Sync</span>
                           </>
                        )}
                     </button>
                     <button
                        onClick={() => setIsStagingCollapsed(true)}
                        className="p-2 hover:bg-white/10 text-mono-text-disabled hover:text-white rounded-full transition-colors"
                        title="Collapse"
                     >
                        <ChevronRight size={18} />
                     </button>
                  </div>
               </motion.div>
            )}

            {hasUnsavedChanges && isStagingCollapsed && (
               <motion.button
                  key="collapsed-staging"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={() => setIsStagingCollapsed(false)}
                  className="fixed bottom-24 right-5 z-110 bg-linear-to-r from-primary/95 to-primary/95 backdrop-blur-md text-white py-2.5 px-4 rounded-full shadow-[0_12px_30px_rgba(5,0,68,0.4)] border border-white/10 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  title="Expand Staging Banner"
               >
                  <CloudUpload size={18} className="text-emerald-400 animate-bounce" />
                  <div className="w-px h-4 bg-white/20" />
                  <span className="text-xs font-bold text-white">{changedDeliveries.length} Pending</span>
               </motion.button>
            )}
         </AnimatePresence>

         <Modal
            isOpen={modalConfig.isOpen}
            onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            onConfirm={(dontShow) => {
               if (modalConfig.onConfirm) {
                  modalConfig.onConfirm(dontShow);
               } else {
                  setModalConfig(prev => ({ ...prev, isOpen: false }));
               }
            }}
            title={modalConfig.title}
            message={modalConfig.message}
            type={modalConfig.type}
            confirmText="Okay"
            showDontShowAgain={modalConfig.showDontShowAgain}
         />
      </PullToRefresh>
   );
}
