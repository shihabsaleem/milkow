"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, PackagePlus, Map, AlertCircle } from "lucide-react";

export default function RoutePage() {
  const [deliveries, setDeliveries] = useState([
    { id: 1, name: "John Doe", qty: "2 Bottles", delivered: false, misc: null },
    { id: 2, name: "Sarah Smith", qty: "1 Bottle", delivered: true, misc: "Fresh Curd (500g)" },
    { id: 3, name: "Mike Johnson", qty: "3 Bottles", delivered: false, misc: "Paneer (200g)" },
  ]);

  const toggleDelivery = (id: number) => {
    setDeliveries(deliveries.map(d => d.id === id ? { ...d, delivered: !d.delivered } : d));
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-zinc-200/50">
        <h1 className="text-xl font-bold text-zinc-900">Morning Route</h1>
        <p className="text-sm text-zinc-500">Downtown Area • 3 Stops Remaining</p>
      </header>

      <main className="px-5 py-6 flex flex-col gap-4">
         {/* Live Progress map skeleton */}
         <div className="w-full h-32 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center justify-center text-indigo-400 gap-2 mb-4">
            <Map size={32} />
            <span className="text-sm font-semibold">Live Route Optimization (Tap to view)</span>
         </div>

         {deliveries.map((delivery) => (
            <motion.div 
               key={delivery.id}
               className={`border p-4 rounded-2xl shadow-sm transition-all ${delivery.delivered ? 'bg-zinc-50 border-zinc-200 opacity-70' : 'bg-white border-blue-100'}`}
            >
               <div className="flex items-center justify-between">
                  <div>
                     <h3 className={`font-bold text-lg ${delivery.delivered ? 'text-zinc-600 line-through' : 'text-zinc-900'}`}>{delivery.name}</h3>
                     <p className="font-semibold text-blue-600 text-sm mt-0.5">{delivery.qty} Milk</p>
                  </div>
                  <button 
                     onClick={() => toggleDelivery(delivery.id)}
                     className={`h-12 w-12 flex items-center justify-center rounded-full transition-colors ${delivery.delivered ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-emerald-100 hover:text-emerald-500 border border-zinc-200'}`}
                  >
                     <Check size={20} strokeWidth={3} />
                  </button>
               </div>
               
               {/* Misc Product Section */}
               <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  {delivery.misc ? (
                     <div className="flex items-center gap-2 text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                        <AlertCircle size={14} /> Optional: {delivery.misc}
                     </div>
                  ) : (
                     <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-blue-600 transition-colors px-1 py-1">
                        <PackagePlus size={14} /> Add Misc Product
                     </button>
                  )}
               </div>
            </motion.div>
         ))}
      </main>
    </div>
  );
}
