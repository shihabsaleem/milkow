"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, PackagePlus, Search, Minus, Plus, ChevronDown, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { deductInventoryOnDelivery } from "@/lib/automation";
import * as T from "@/types/database";

export default function DeliveryPage() {
   const [deliveries, setDeliveries] = useState<T.ActiveRouteStop[]>([]);
   const [allCustomers, setAllCustomers] = useState<T.Customer[]>([]);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [routesList, setRoutesList] = useState<string[]>([]);
   
   const [searchQuery, setSearchQuery] = useState("");
   const [selectedRoute, setSelectedRoute] = useState("");
   const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
   const [expandedStopId, setExpandedStopId] = useState<number | null>(null);
   const [editingSeqId, setEditingSeqId] = useState<number | null>(null);
   const [editSeqVal, setEditSeqVal] = useState("");

   // 1. DATA LOAD & SYNC
   useEffect(() => {
      const fetchData = async () => {
         // Routes (Settings)
         const { data: routeSets } = await supabase.from('system_settings').select('value').eq('key', 'routes').single();
         if (routeSets) {
            const val = routeSets.value as { names: string[] };
            const names = val?.names || [];
            setRoutesList(names);
            // Only set default if not already set manually
            setSelectedRoute(current => current || names[0] || "");
         }

         // Products
         const { data: prodData } = await supabase.from('products').select('*');
         if (prodData) setProducts(prodData as T.Product[]);

         // Active Route
         const { data: routeData } = await supabase.from('active_route').select('*').order('sequence', { ascending: true });
         if (routeData) setDeliveries(routeData as T.ActiveRouteStop[]);

         // Customers
         const { data: custData } = await supabase.from('customers').select('*');
         if (custData) setAllCustomers(custData as T.Customer[]);
      };

      fetchData();

      // Real-time updates for active_route
      const sub = supabase.channel('route_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'active_route' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, []); // eslint-disable-line react-hooks/exhaustive-deps

   const toggleDelivery = async (id: number) => {
      const stop = deliveries.find(d => d.id === id);
      if (!stop) return;
      
      const nowDelivered = !stop.delivered;

      try {
         await supabase.from('active_route').update({ delivered: nowDelivered }).eq('id', id);

         if (nowDelivered) {
            const miscProducts = stop.extras || {};
            await deductInventoryOnDelivery(id, stop.qty, miscProducts);
         }
      } catch (err) {
         console.error("Failed to toggle delivery:", err);
      }
   };

   const updateProductQty = async (stopId: number, productName: string, delta: number) => {
      const stop = deliveries.find(d => d.id === stopId);
      if (!stop) return;

      const currentExtras = stop.extras || {};
      const newQty = Math.max(0, (currentExtras[productName] || 0) + delta);
      
      try {
         const updatedExtras = { ...currentExtras };
         if (newQty === 0) {
            delete updatedExtras[productName];
         } else {
            updatedExtras[productName] = newQty;
         }
         await supabase.from('active_route').update({ extras: updatedExtras }).eq('id', stopId);
      } catch (err) {
         console.error("Failed to update extra product qty:", err);
      }
   };

   const updateSequence = async (id: number, newSeqRaw: string) => {
      const newSeq = parseInt(newSeqRaw);
      if (isNaN(newSeq)) return;
      try {
         await supabase.from('active_route').update({ sequence: newSeq }).eq('id', id);
      } catch (err) {
         console.error("Failed to update sequence:", err);
      }
   };

   const filteredDeliveries = deliveries.filter(d => {
      const user = allCustomers.find(u => u.phone === d.phone);
      if (user && user.status === 'Inactive') return false;
      const matchesArea = user && selectedRoute === user.area;
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesArea && matchesSearch;
   });

   const remainingStops = filteredDeliveries.filter(d => !d.delivered).length;

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center justify-between">
               <div className="relative">
                  <button onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)} className="flex items-center gap-2 group">
                     <h1 className="text-xl font-black text-zinc-900">{selectedRoute}</h1>
                     <ChevronDown size={18} className={`text-zinc-400 transition-transform duration-300 ${isRouteMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <p className="text-xs font-bold text-primary tracking-wider uppercase mt-0.5">{remainingStops} Stops Remaining</p>
                  <AnimatePresence>
                     {isRouteMenuOpen && (
                        <>
                           <div className="fixed inset-0 z-40" onClick={() => setIsRouteMenuOpen(false)} />
                           <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute left-0 mt-2 w-56 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden py-2 z-50">
                              {routesList.map((route) => (
                                 <button key={route} onClick={() => { setSelectedRoute(route); setIsRouteMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-sm font-bold ${selectedRoute === route ? 'bg-primary/10 text-primary' : 'text-zinc-600 hover:bg-zinc-50'}`}>{route}</button>
                              ))}
                           </motion.div>
                        </>
                     )}
                  </AnimatePresence>
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
               const stopItems = delivery.extras || {};
               const activeItems = Object.entries(stopItems).filter(([__, qty]) => (qty as number) > 0);
               return (
                  <motion.div key={delivery.id} layout className={`border rounded-2xl transition-all ${delivery.delivered ? 'bg-zinc-50 border-zinc-200 opacity-70' : 'bg-white border-primary/20 shadow-sm'}`}>
                     <div className="p-4">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedStopId(isExpanded ? null : delivery.id)}>
                           <div className="flex items-start gap-3">
                              <input type="text" inputMode="numeric" value={editingSeqId === delivery.id ? editSeqVal : (delivery.sequence || index + 1)} 
                                 onChange={(e) => { setEditingSeqId(delivery.id); setEditSeqVal(e.target.value); }}
                                 onBlur={() => { if (editingSeqId === delivery.id) { updateSequence(delivery.id, editSeqVal); setEditingSeqId(null); } }}
                                 onClick={(e) => { e.stopPropagation(); setEditingSeqId(delivery.id); setEditSeqVal((delivery.sequence || index + 1).toString()); }}
                                 className={`mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs text-center focus:outline-none transition-all ${delivery.delivered ? 'bg-zinc-200 text-zinc-500' : 'bg-primary text-white shadow-md'}`}
                              />
                              <div>
                                 <h3 className={`font-bold text-lg ${delivery.delivered ? 'text-zinc-600 line-through' : 'text-zinc-900'}`}>{delivery.name}</h3>
                                 <p className="font-semibold text-primary text-sm mt-0.5">{delivery.qty} Milk</p>
                              </div>
                           </div>
                           <button onClick={(e) => { e.stopPropagation(); toggleDelivery(delivery.id); }} className={`h-12 w-12 flex items-center justify-center rounded-full ${delivery.delivered ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400 hover:text-emerald-500 border border-zinc-200'}`}><Check size={20} strokeWidth={3} /></button>
                        </div>
                        {!isExpanded && activeItems.length > 0 && (
                           <div className="mt-3 flex flex-wrap gap-2 mb-2">
                              {activeItems.map(([name, qty]) => (<span key={name} className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-md">{qty as number}x {name}</span>))}
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
                     <div className="mb-6"><h2 className="text-xl font-black text-zinc-900">Add Products</h2><p className="text-sm text-zinc-500">For {deliveries.find(d => d.id === expandedStopId)?.name}</p></div>
                     <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar py-1">
                        {products.map((product) => {
                           const stopItems = deliveries.find(d => d.id === expandedStopId)?.extras || {};
                           const qty = stopItems[product.name] || 0;
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
