"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, PackagePlus, Map, AlertCircle, Search, Plus, Minus, ChevronDown, ChevronUp, X, Share2, MessageCircle } from "lucide-react";
import data from "../../data/data.json";

export default function RoutePage() {
   const [deliveries, setDeliveries] = useState(data.route);
   const [searchQuery, setSearchQuery] = useState("");
   const [expandedStopId, setExpandedStopId] = useState<number | null>(null);
   const [stopProducts, setStopProducts] = useState<Record<number, Record<string, number>>>({});

   const toggleDelivery = (id: number) => {
      setDeliveries(deliveries.map(d => d.id === id ? { ...d, delivered: !d.delivered } : d));
   };

   const updateProductQty = (stopId: number, productName: string, delta: number) => {
      setStopProducts(prev => {
         const currentStop = prev[stopId] || {};
         const newQty = Math.max(0, (currentStop[productName] || 0) + delta);
         return {
            ...prev,
            [stopId]: {
               ...currentStop,
               [productName]: newQty
            }
         };
      });
   };

   const getProductPrice = (name: string) => {
      const p = data.products.find(p => p.name === name);
      return p ? parseInt(p.price.replace(/\D/g, '')) : 0;
   };
   const milkPriceContext = 50; // Assume ₹50 per standardized bottle for the breakdown



   const filteredDeliveries = deliveries.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
   );

   const remainingStops = filteredDeliveries.filter(d => !d.delivered).length;

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-zinc-200/50 flex items-center justify-between">
            <div>
               <h1 className="text-xl font-bold text-zinc-900">Morning Route</h1>
               <p className="text-sm text-zinc-500">Downtown Area • {remainingStops} Stops Remaining</p>
            </div>

         </header>

         <main className="px-5 py-6 flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
               <input
                  type="text"
                  placeholder="Search customers..."
                  className="w-full bg-white border border-zinc-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>


            {filteredDeliveries.map((delivery) => {
               const isExpanded = expandedStopId === delivery.id;
               const stopItems = stopProducts[delivery.id] || {};
               const activeItems = Object.entries(stopItems).filter(([_, qty]) => qty > 0);
               
               const milkQty = parseInt(delivery.qty) || 0;
               const milkCost = milkQty * milkPriceContext;
               const extraCost = activeItems.reduce((sum, [name, qty]) => sum + (getProductPrice(name) * qty), 0);
               const totalCost = milkCost + extraCost;

               return (
                  <motion.div
                     key={delivery.id}
                     layout
                     className={`border rounded-2xl transition-all ${delivery.delivered ? 'bg-zinc-50 border-zinc-200 opacity-70' : 'bg-white border-primary/20 shadow-sm'}`}
                  >
                     <div className="p-4">
                        <div
                           className="flex items-center justify-between cursor-pointer"
                           onClick={() => setExpandedStopId(isExpanded ? null : delivery.id)}
                        >
                           <div>
                              <h3 className={`font-bold text-lg ${delivery.delivered ? 'text-zinc-600 line-through' : 'text-zinc-900'}`}>{delivery.name}</h3>
                              <p className="font-semibold text-primary text-sm mt-0.5">{delivery.qty} Milk</p>
                           </div>
                           <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 toggleDelivery(delivery.id);
                              }}
                              className={`h-12 w-12 flex items-center justify-center rounded-full transition-colors ${delivery.delivered ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-emerald-100 hover:text-emerald-500 border border-zinc-200'}`}
                           >
                              <Check size={20} strokeWidth={3} />
                           </button>
                        </div>

                        {/* Summary of added items when collapsed */}
                        {!isExpanded && activeItems.length > 0 && (
                           <div className="mt-3 flex flex-wrap gap-2 mb-2">
                              {activeItems.map(([name, qty]) => (
                                 <span key={name} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-md border border-primary/20">
                                    {qty}x {name}
                                 </span>
                              ))}
                           </div>
                        )}

                        {/* Price Breakdown */}
                        <div className="mt-3 bg-slate-50 border border-zinc-100 rounded-xl p-3 text-[11px] flex flex-col gap-1.5 shadow-sm">
                           <div className="flex justify-between text-zinc-500 font-medium">
                              <span>{milkQty}x Standard Milk @ ₹50</span>
                              <span>₹{milkCost}</span>
                           </div>
                           {activeItems.map(([name, qty]) => {
                              const cost = getProductPrice(name) * qty;
                              return (
                                 <div key={name} className="flex justify-between text-zinc-500 font-medium">
                                    <span>{qty}x {name} @ ₹{getProductPrice(name)}</span>
                                    <span>₹{cost}</span>
                                 </div>
                              );
                           })}
                           <div className="flex justify-between items-center border-t border-zinc-200 mt-1 pt-2">
                              <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Daily Total</span>
                              <span className="font-black text-sm text-zinc-900">₹{totalCost}</span>
                           </div>
                        </div>

                        {/* Misc Product Section */}
                        <div className="mt-4 pt-3 border-t border-zinc-100">
                           {delivery.misc && !isExpanded && activeItems.length === 0 && (
                              <div className="flex items-center gap-2 text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 mb-3 w-fit">
                                 <AlertCircle size={12} /> {delivery.misc}
                              </div>
                           )}

                           <button
                              onClick={() => setExpandedStopId(delivery.id)}
                              className={`flex items-center gap-1.5 text-xs font-bold transition-colors py-1 rounded-lg ${isExpanded ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                           >
                              <PackagePlus size={14} />
                              {activeItems.length > 0 ? 'Edit Extra Items' : 'Add Additional Products'}
                           </button>
                        </div>
                     </div>
                  </motion.div>
               );
            })}
         </main>

         {/* Add Product Popup */}
         <AnimatePresence>
            {expandedStopId !== null && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-5"
               >
                  <motion.div
                     initial={{ y: "100%" }}
                     animate={{ y: 0 }}
                     exit={{ y: "100%" }}
                     transition={{ type: "spring", damping: 25, stiffness: 300 }}
                     className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl pt-6 pb-12 px-6 flex flex-col relative"
                  >
                     <button
                        onClick={() => setExpandedStopId(null)}
                        className="absolute top-4 right-4 p-2 bg-zinc-100 rounded-full text-zinc-500 hover:bg-zinc-200 transition-colors"
                     >
                        <X size={20} />
                     </button>

                     <div className="mb-6">
                        <h2 className="text-xl font-black text-zinc-900">Add Products</h2>
                        <p className="text-sm text-zinc-500">For {deliveries.find(d => d.id === expandedStopId)?.name}</p>
                     </div>

                     <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar py-1">
                        {data.products.map((product) => {
                           const stopItems = stopProducts[expandedStopId!] || {};
                           const qty = stopItems[product.name] || 0;

                           return (
                              <div key={product.name} className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${qty > 0 ? 'bg-primary/10 border-primary/20' : 'bg-white border-zinc-100'}`}>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-800">{product.name}</span>
                                    <span className="text-[11px] font-medium text-zinc-500">{product.size} • {product.price}</span>
                                 </div>
                                 <div className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl p-1 shadow-sm">
                                    <button
                                       onClick={() => updateProductQty(expandedStopId!, product.name, -1)}
                                       className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-rose-500 transition-colors"
                                    >
                                       <Minus size={16} />
                                    </button>
                                    <span className="text-sm font-black w-5 text-center">{qty}</span>
                                    <button
                                       onClick={() => updateProductQty(expandedStopId!, product.name, 1)}
                                       className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-emerald-500 transition-colors"
                                    >
                                       <Plus size={16} />
                                    </button>
                                 </div>
                              </div>
                           );
                        })}
                     </div>

                     <button
                        onClick={() => setExpandedStopId(null)}
                        className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold mt-8 active:scale-95 transition-all shadow-xl shadow-zinc-900/20"
                     >
                        Done
                     </button>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
}
