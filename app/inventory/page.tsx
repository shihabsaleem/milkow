"use client";

import { motion } from "framer-motion";
import { Plus, Edit2, Box, ThermometerSnowflake } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-5 sm:px-6 md:px-8 py-4 border-b border-zinc-200/50">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-zinc-900">Inventory Management</h1>
          <p className="text-xs sm:text-sm text-zinc-500">Track freezing, bottling, and products</p>
        </div>
      </header>

      <main className="px-5 sm:px-6 md:px-8 py-6 flex flex-col gap-6 sm:gap-8 max-w-3xl mx-auto w-full">
        
        {/* Production Pipeline */}
        <div>
           <h2 className="text-xs sm:text-sm font-bold text-zinc-900 mb-3 sm:mb-4 uppercase tracking-widest">Milk Supply Pipeline</h2>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="bg-blue-50 border border-blue-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col gap-1.5 sm:gap-2">
                 <Box size={18} className="text-blue-500 sm:hidden" />
                 <Box size={20} className="text-blue-500 hidden sm:block" />
                 <h3 className="font-bold text-blue-900 text-xs sm:text-sm mt-0.5 sm:mt-1">Raw Received</h3>
                 <p className="text-base sm:text-lg font-black text-blue-700">450 <span className="text-[10px] sm:text-xs font-normal">Liters</span></p>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="bg-cyan-50 border border-cyan-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col gap-1.5 sm:gap-2">
                 <ThermometerSnowflake size={18} className="text-cyan-500 sm:hidden" />
                 <ThermometerSnowflake size={20} className="text-cyan-500 hidden sm:block" />
                 <h3 className="font-bold text-cyan-900 text-xs sm:text-sm mt-0.5 sm:mt-1">In Freezing</h3>
                 <p className="text-base sm:text-lg font-black text-cyan-700">300 <span className="text-[10px] sm:text-xs font-normal">Liters</span></p>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="bg-indigo-50 border border-indigo-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col gap-1.5 sm:gap-2">
                 <span className="text-base sm:text-lg">🥛</span>
                 <h3 className="font-bold text-indigo-900 text-xs sm:text-sm mt-0.5 sm:mt-1">Bottled (Ready)</h3>
                 <p className="text-base sm:text-lg font-black text-indigo-700">150 <span className="text-[10px] sm:text-xs font-normal">Bottles</span></p>
              </motion.div>
               <motion.div whileTap={{ scale: 0.98 }} className="bg-orange-50 border border-orange-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col gap-1.5 sm:gap-2">
                 <span className="text-base sm:text-lg">🚚</span>
                 <h3 className="font-bold text-orange-900 text-xs sm:text-sm mt-0.5 sm:mt-1">Loaded for Route</h3>
                 <p className="text-base sm:text-lg font-black text-orange-700">120 <span className="text-[10px] sm:text-xs font-normal">Bottles</span></p>
              </motion.div>
           </div>
        </div>

        {/* Miscellaneous Products */}
        <div>
           <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 uppercase tracking-widest">Misc Products</h2>
              <button className="text-[10px] sm:text-xs font-bold text-blue-600 bg-blue-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 hover:bg-blue-100 transition-colors">
                 <Plus size={12} className="sm:hidden" />
                 <Plus size={14} className="hidden sm:block" />
                 Add Product
              </button>
           </div>
           
           <div className="flex flex-col gap-2 sm:gap-3">
              {[
                { name: "Fresh Curd (500g)", stock: 85, price: "₹120" },
                { name: "Ghee (250g)", stock: 20, price: "₹350" },
                { name: "Paneer (200g)", stock: 40, price: "₹180" }
              ].map((product, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-zinc-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                   <div>
                     <h4 className="font-bold text-zinc-900 text-xs sm:text-sm">{product.name}</h4>
                     <p className="text-[10px] sm:text-xs font-medium text-zinc-500 mt-0.5 sm:mt-1">Stock: {product.stock} units</p>
                   </div>
                   <div className="flex items-center gap-3 sm:gap-4">
                      <span className="font-bold text-zinc-900 text-sm sm:text-base">{product.price}</span>
                      <button className="p-1.5 sm:p-2 border border-zinc-200 rounded-lg sm:rounded-xl hover:bg-zinc-50 text-zinc-600 transition-colors">
                         <Edit2 size={14} className="sm:hidden" />
                         <Edit2 size={16} className="hidden sm:block" />
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
