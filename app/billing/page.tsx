"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, MessageCircle, Wallet2, CheckCircle2, X } from "lucide-react";
import data from "../../data/data.json";

export default function BillingPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);



  return (
    <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-zinc-200/50">
        <h1 className="text-xl font-bold text-zinc-900">Billing & Collections</h1>
        <p className="text-sm text-zinc-500">Generate QR and WhatsApp links</p>
      </header>

      <main className="px-5 py-6 flex flex-col gap-4">
        {data.bills.map((bill: any) => (
           <div key={bill.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-bold text-zinc-900">{bill.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{bill.id} • {bill.type} Billing</p>
                 </div>
                 <span className="font-black text-lg text-rose-600">${bill.amount.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                 <button 
                  onClick={() => setSelectedInvoice(bill)}
                  className="flex-1 bg-zinc-900 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                 >
                    <QrCode size={16} /> Collect
                 </button>
                 <button className="flex-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <CheckCircle2 size={16} /> Paid
                 </button>
              </div>
           </div>
        ))}
      </main>

      {/* QR Generation Modal */}
      <AnimatePresence>
         {selectedInvoice && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end"
            >
               <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full bg-white rounded-t-3xl pt-6 pb-12 px-6 flex flex-col items-center text-center relative max-w-sm"
               >
                  <button onClick={() => setSelectedInvoice(null)} className="absolute top-4 right-4 p-2 bg-zinc-100 rounded-full text-zinc-500">
                     <X size={20} />
                  </button>
                  
                  <h2 className="text-2xl font-black text-zinc-900 mt-4">${selectedInvoice.amount.toFixed(2)}</h2>
                  <p className="text-sm font-medium text-zinc-500 mt-1">Payment for {selectedInvoice.name}</p>
                  
                  <div className="bg-white p-4 rounded-3xl border-2 border-zinc-100 shadow-xl my-6">
                     <QRCodeSVG value={`upi://pay?pa=yourvpa@upi&pn=Milkow&am=${selectedInvoice.amount}&cu=USD`} size={200} />
                  </div>

                  <div className="w-full flex flex-col gap-3">
                     <button className="w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 active:scale-95 transition-all">
                        <MessageCircle size={18} /> Share via WhatsApp
                     </button>
                     <button className="w-full bg-zinc-100 text-zinc-700 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                        <Wallet2 size={18} /> Manual Cash Confirm
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
