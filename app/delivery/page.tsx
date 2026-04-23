"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, PackagePlus, Search, Minus, Plus, ChevronDown, X, Sunrise, Sunset } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { deductInventoryOnDelivery } from "@/lib/automation";
import * as T from "@/types/database";

type DeliveryWithCustomer = T.Delivery & { customer: T.Customer };

export default function DeliveryPage() {
   const [deliveries, setDeliveries] = useState<DeliveryWithCustomer[]>([]);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [routesList, setRoutesList] = useState<T.Area[]>([]);
   
   const [searchQuery, setSearchQuery] = useState("");
   const [selectedRoute, setSelectedRoute] = useState<number | "">("");
   const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
   const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
   const [editingSeqId, setEditingSeqId] = useState<string | null>(null);
   const [editSeqVal, setEditSeqVal] = useState("");
   const [manualShift, setManualShift] = useState<'morning' | 'evening' | null>(null);

   // Auto-detect shift from time of day
   const shift = useMemo<'morning' | 'evening'>(() => {
      if (manualShift) return manualShift;
      return new Date().getHours() < 14 ? 'morning' : 'evening';
   }, [manualShift]);
   // 1. DATA LOAD & SYNC
   useEffect(() => {
      const fetchData = async () => {
         const today = new Date().toLocaleDateString('en-CA'); // Robust YYYY-MM-DD

         // Routes (Areas)
         const { data: routeSets } = await supabase.from('areas').select('*').order('name', { ascending: true });
         if (routeSets) {
            const areas = routeSets as T.Area[];
            setRoutesList(areas);
            // Only set default if not already set manually
            setSelectedRoute(current => current || (areas.length > 0 ? areas[0].id : ""));
         }

         // Products
         const { data: prodData } = await supabase.from('products').select('*');
         if (prodData) setProducts(prodData as T.Product[]);

         // Deliveries (with customer join, ordered by the new delivery_order)
         const { data: routeData } = await supabase
            .from('deliveries')
            .select('*, customer:customers(*)')
            .eq('delivery_date', today)
            .order('delivery_order', { foreignTable: 'customers', ascending: true });
         if (routeData) setDeliveries(routeData as (T.Delivery & { customer: T.Customer })[]);
      };

      fetchData();

      const sub = supabase.channel('route_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

   const toggleDelivery = async (id: string) => {
      const stop = deliveries.find(d => d.id === id);
      if (!stop) return;
      
      const nowDelivered = !stop.delivered;

      // Optimistic UI update
      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, delivered: nowDelivered } : d));

      try {
         await supabase.from('deliveries').update({ delivered: nowDelivered }).eq('id', id);

         if (nowDelivered) {
            const miscProducts = stop.misc_items || [];
            const extrasRecord: Record<string, number> = {};
            miscProducts.forEach((item: any) => extrasRecord[item.name] = item.qty);
            await deductInventoryOnDelivery(id, stop.milk_qty, extrasRecord);
         }
      } catch (err) {
         console.error("Failed to toggle delivery:", err);
         // Revert on error
         setDeliveries(prev => prev.map(d => d.id === id ? { ...d, delivered: stop.delivered } : d));
      }
   };

   const updateProductQty = async (stopId: string, productName: string, delta: number) => {
      const stop = deliveries.find(d => d.id === stopId);
      if (!stop) return;

      const currentExtras = stop.misc_items || [];
      const itemIndex = currentExtras.findIndex((item: any) => item.name === productName);
      let updatedExtras = [...currentExtras];

      if (itemIndex > -1) {
         const newQty = Math.max(0, updatedExtras[itemIndex].qty + delta);
         if (newQty === 0) {
            updatedExtras.splice(itemIndex, 1);
         } else {
            updatedExtras[itemIndex] = { ...updatedExtras[itemIndex], qty: newQty };
         }
      } else if (delta > 0) {
         updatedExtras.push({ name: productName, qty: delta });
      }

      // Optimistic update
      setDeliveries(prev => prev.map(d => d.id === stopId ? { ...d, misc_items: updatedExtras } : d));
      
      try {
         await supabase.from('deliveries').update({ misc_items: updatedExtras }).eq('id', stopId);
      } catch (err) {
         console.error("Failed to update extra product qty:", err);
         // Revert
         setDeliveries(prev => prev.map(d => d.id === stopId ? { ...d, misc_items: stop.misc_items } : d));
      }
   };

   const updateMilkQty = async (stopId: string, delta: number) => {
      const stop = deliveries.find(d => d.id === stopId);
      if (!stop) return;
      const newQty = Math.max(0, (stop.milk_qty || 0) + delta);
      // Optimistic update
      setDeliveries(prev => prev.map(d => d.id === stopId ? { ...d, milk_qty: newQty } : d));
      try {
         await supabase.from('deliveries').update({ milk_qty: newQty }).eq('id', stopId);
      } catch (err) {
         console.error("Failed to update milk qty:", err);
         setDeliveries(prev => prev.map(d => d.id === stopId ? { ...d, milk_qty: stop.milk_qty } : d));
      }
   };

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
      if (d.shift !== shift) return false;
      
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
   });

   const remainingStops = filteredDeliveries.filter(d => !d.delivered).length;

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex flex-col gap-3">
               <div className="flex items-center justify-between">
                  <div className="relative">
                     <button onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)} className="flex items-center gap-2 group">
                        <h1 className="text-xl font-black text-zinc-900">{routesList.find(r => r.id === selectedRoute)?.name || 'Delivery'}</h1>
                        <ChevronDown size={18} className={`text-zinc-400 transition-transform duration-300 ${isRouteMenuOpen ? 'rotate-180' : ''}`} />
                     </button>
                     <p className="text-xs font-bold text-primary tracking-wider uppercase mt-0.5">{remainingStops} Stops Remaining</p>
                     
                     <AnimatePresence>
                        {isRouteMenuOpen && (
                           <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsRouteMenuOpen(false)} />
                              <motion.div 
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                                 animate={{ opacity: 1, y: 0, scale: 1 }} 
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                                 className="absolute left-0 mt-3 w-64 bg-white/90 backdrop-blur-xl border border-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden z-50"
                              >
                                 <div className="px-4 py-2 border-b border-zinc-100/50 bg-zinc-50/50">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Route</span>
                                 </div>
                                 <div className="py-1 max-h-80 overflow-y-auto no-scrollbar">
                                    <button 
                                       onClick={() => { setSelectedRoute(""); setIsRouteMenuOpen(false); }} 
                                       className={`w-full text-left px-4 py-3.5 text-sm font-bold flex items-center justify-between transition-all ${selectedRoute === "" ? 'bg-primary/5 text-primary' : 'text-zinc-600 hover:bg-zinc-50'}`}
                                    >
                                       <span>All Deliveries</span>
                                       {selectedRoute === "" && <Check size={16} strokeWidth={3} />}
                                    </button>
                                    {routesList.map((route) => (
                                       <button 
                                          key={route.id} 
                                          onClick={() => { setSelectedRoute(route.id); setIsRouteMenuOpen(false); }} 
                                          className={`w-full text-left px-4 py-3.5 text-sm font-bold flex items-center justify-between transition-all ${selectedRoute === route.id ? 'bg-primary/5 text-primary' : 'text-zinc-600 hover:bg-zinc-50'}`}
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

                  <div className="flex bg-zinc-100 p-1 rounded-xl gap-1 h-fit">
                     <button 
                        onClick={() => setManualShift('morning')}
                        className={`p-2 rounded-lg transition-all ${shift === 'morning' ? 'bg-white text-primary shadow-sm' : 'text-zinc-400'}`}
                     >
                        <Sunrise size={18} />
                     </button>
                     <button 
                        onClick={() => setManualShift('evening')}
                        className={`p-2 rounded-lg transition-all ${shift === 'evening' ? 'bg-white text-primary shadow-sm' : 'text-zinc-400'}`}
                     >
                        <Sunset size={18} />
                     </button>
                  </div>
               </div>

               {/* Morning / Evening Toggle */}
               <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#EBEBEF] relative h-11">
                  <motion.div layout className="absolute inset-y-1 rounded-xl shadow-sm z-0 bg-white" style={{ left: shift === 'morning' ? '4px' : '50%', width: 'calc(50% - 4px)' }} transition={{ type: 'spring', stiffness: 450, damping: 35 }} />
                  <button onClick={() => setManualShift('morning')} className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl transition-all text-sm font-bold ${shift === 'morning' ? 'text-primary' : 'text-[#A1A1AA]'}`}>
                     <Sunrise size={15} strokeWidth={2.5} /><span>Morning</span>
                  </button>
                  <button onClick={() => setManualShift('evening')} className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl transition-all text-sm font-bold ${shift === 'evening' ? 'text-primary' : 'text-[#A1A1AA]'}`}>
                     <Sunset size={15} strokeWidth={2.5} /><span>Evening</span>
                  </button>
               </div>
            </div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
               <input type="text" placeholder="Search customers..." className="w-full bg-white border border-zinc-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {filteredDeliveries.map((delivery, index) => {
               const isExpanded = expandedStopId === delivery.id;
               const activeItems = delivery.misc_items || [];
               return (
                  <motion.div key={delivery.id} layout className={`border rounded-2xl transition-all ${delivery.delivered ? 'bg-zinc-50 border-zinc-200 opacity-70' : 'bg-white border-primary/20 shadow-sm'}`}>
                     <div className="p-4">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedStopId(isExpanded ? null : delivery.id)}>
                           <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs text-center transition-all ${delivery.delivered ? 'bg-zinc-200 text-zinc-500' : 'bg-primary text-white shadow-md'}`}>
                                 {index + 1}
                              </div>
                              <div>
                                 <h3 className={`font-bold text-lg ${delivery.delivered ? 'text-zinc-600 line-through' : 'text-zinc-900'}`}>{delivery.customer?.name}</h3>
                                 {(() => {
                                    const prod = products.find(p => p.id === delivery.product_id);
                                    return (
                                       <p className="font-semibold text-primary text-sm mt-0.5">
                                          {delivery.milk_qty} {prod ? `${prod.name} (${prod.size})` : 'Milk'}
                                       </p>
                                    );
                                 })()}
                              </div>
                           </div>
                           <button onClick={(e) => { e.stopPropagation(); toggleDelivery(delivery.id); }} className={`h-12 w-12 flex items-center justify-center rounded-full ${delivery.delivered ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400 hover:text-emerald-500 border border-zinc-200'}`}><Check size={20} strokeWidth={3} /></button>
                        </div>
                        {!isExpanded && activeItems.length > 0 && (
                           <div className="mt-3 flex flex-wrap gap-2 mb-2">
                              {activeItems.map((item: any) => (<span key={item.name} className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-md">{item.qty}x {item.name}</span>))}
                           </div>
                        )}
                        <div className="mt-4 pt-3 border-t border-zinc-100">
                           <button onClick={() => setExpandedStopId(delivery.id)} className={`flex items-center gap-1.5 text-xs font-bold transition-colors py-1 rounded-lg ${isExpanded ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}><PackagePlus size={14} />{activeItems.length > 0 ? 'Edit Extra Items' : 'Add Additional Products'}</button>
                        </div>
                     </div>
                  </motion.div>
               );
            })}
         </main>

         <AnimatePresence>
            {expandedStopId !== null && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-5">
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl pt-6 pb-12 px-6 flex flex-col relative">
                     <button onClick={() => setExpandedStopId(null)} className="absolute top-4 right-4 p-2 bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
                     <div className="mb-6"><h2 className="text-xl font-black text-zinc-900">Add Products</h2><p className="text-sm text-zinc-500">For {deliveries.find(d => d.id === expandedStopId)?.customer?.name}</p></div>
                     <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar py-1">
                        {/* Milk Control */}
                        {(() => {
                           const stop = deliveries.find(d => d.id === expandedStopId);
                           const milkQty = stop?.milk_qty || 0;
                           const prod = products.find(p => p.id === stop?.product_id);
                           return (
                              <div className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${milkQty > 0 ? 'bg-primary/5 border-primary/40' : 'bg-white border-zinc-100'}`}>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-black text-zinc-800">{prod ? prod.name : 'Fresh Milk'}</span>
                                    <span className="text-[11px] font-medium text-zinc-500">{prod ? prod.size : 'Standard Delivery'}</span>
                                 </div>
                                 <div className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl p-1 shadow-sm">
                                    <button onClick={() => updateMilkQty(expandedStopId!, -1)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-rose-500"><Minus size={16} /></button>
                                    <span className="text-sm font-black w-5 text-center">{milkQty}</span>
                                    <button onClick={() => updateMilkQty(expandedStopId!, 1)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-emerald-500"><Plus size={16} /></button>
                                 </div>
                              </div>
                           );
                        })()}

                        <div className="h-px bg-zinc-100 my-1" />

                        {products.filter(p => !p.name.toLowerCase().includes('milk')).map((product) => {
                           const stopItems = deliveries.find(d => d.id === expandedStopId)?.misc_items || [];
                           const item = stopItems.find((i: any) => i.name === product.name);
                           const qty = item ? item.qty : 0;
                           return (
                              <div key={product.name} className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${qty > 0 ? 'bg-primary/10 border-primary/20' : 'bg-white border-zinc-100'}`}>
                                 <div className="flex flex-col"><span className="text-sm font-bold text-zinc-800">{product.name}</span><span className="text-[11px] font-medium text-zinc-500">{product.size} • {product.price}</span></div>
                                 <div className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl p-1 shadow-sm">
                                    <button onClick={() => updateProductQty(expandedStopId!, product.name, -1)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-rose-500"><Minus size={16} /></button>
                                    <span className="text-sm font-black w-5 text-center">{qty}</span>
                                    <button onClick={() => updateProductQty(expandedStopId!, product.name, 1)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-emerald-500"><Plus size={16} /></button>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                     <button onClick={() => setExpandedStopId(null)} className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold mt-8 shadow-xl">Done</button>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
}
