"use client";

import { motion } from "framer-motion";
import { Plus, Edit2, Box, ThermometerSnowflake } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-zinc-200/50">
        <h1 className="text-xl font-bold text-zinc-900">Inventory Management</h1>
        <p className="text-sm text-zinc-500">Track freezing, bottling, and products</p>
      </header>

      <main className="px-5 py-6 flex flex-col gap-8">
        
        {/* Production Pipeline */}
        <div>
           <h2 className="text-sm font-bold text-zinc-900 mb-4 uppercase tracking-widest">Milk Supply Pipeline</h2>
           <div className="grid grid-cols-2 gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col gap-2">
                 <Box size={20} className="text-blue-500" />
                 <h3 className="font-bold text-blue-900 text-sm mt-1">Raw Received</h3>
                 <p className="text-lg font-black text-blue-700">450 <span className="text-xs font-normal">Liters</span></p>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="bg-cyan-50 border border-cyan-100 p-4 rounded-2xl flex flex-col gap-2">
                 <ThermometerSnowflake size={20} className="text-cyan-500" />
                 <h3 className="font-bold text-cyan-900 text-sm mt-1">In Freezing</h3>
                 <p className="text-lg font-black text-cyan-700">300 <span className="text-xs font-normal">Liters</span></p>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col gap-2">
                 <span className="text-lg">🥛</span>
                 <h3 className="font-bold text-indigo-900 text-sm mt-1">Bottled (Ready)</h3>
                 <p className="text-lg font-black text-indigo-700">150 <span className="text-xs font-normal">Bottles</span></p>
              </motion.div>
               <motion.div whileTap={{ scale: 0.98 }} className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex flex-col gap-2">
                 <span className="text-lg">🚚</span>
                 <h3 className="font-bold text-orange-900 text-sm mt-1">Loaded for Route</h3>
                 <p className="text-lg font-black text-orange-700">120 <span className="text-xs font-normal">Bottles</span></p>
              </motion.div>
           </div>
        </div>

        {/* Miscellaneous Products */}
        <div>
           <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Misc Products</h2>
              <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                 <Plus size={14} /> Add Product
              </button>
           </div>
           
           <div className="flex flex-col gap-3">
              {[
                { name: "Fresh Curd (500g)", stock: 85, price: "$2.50" },
                { name: "Ghee (250g)", stock: 20, price: "$8.00" },
                { name: "Paneer (200g)", stock: 40, price: "$3.50" }
              ].map((product, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm">
                   <div>
                     <h4 className="font-bold text-zinc-900 text-sm">{product.name}</h4>
                     <p className="text-xs font-medium text-zinc-500 mt-1">Stock: {product.stock} units</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="font-bold text-zinc-900">{product.price}</span>
                      <button className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600">
                         <Edit2 size={16} />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>

      </main>
    </div>
  );
}
