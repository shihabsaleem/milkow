"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, MessageCircle, Wallet2, CheckCircle2, X, Check, Search, Share2, Milk } from "lucide-react";
import { useSearchParams } from "next/navigation";
import data from "../../data/data.json";

export default function BillingPage() {
   const searchParams = useSearchParams();
   const qrRef = useRef<HTMLDivElement>(null);

   const [searchTerm, setSearchTerm] = useState("");
   const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
   const [paidInvoices, setPaidInvoices] = useState<string[]>([]);
   const [showToast, setShowToast] = useState(false);

   useEffect(() => {
      const search = searchParams.get("search");
      if (search) setSearchTerm(search);
   }, [searchParams]);

   const filteredBills = data.bills.filter((bill: any) =>
      bill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.id.toLowerCase().includes(searchTerm.toLowerCase())
   );

   const handleMarkAsPaid = (id: string) => {
      if (!paidInvoices.includes(id)) {
         setPaidInvoices([...paidInvoices, id]);
         setShowToast(true);
         setTimeout(() => setShowToast(false), 3000);
      }
      setSelectedInvoice(null);
   };

   const handleShareCard = async () => {
      if (!selectedInvoice) return;

      // We create a temporary canvas to draw the "Card"
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 800;
      const height = 1100;
      canvas.width = width;
      canvas.height = height;

      // 1. Draw Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#4F46E5");
      gradient.addColorStop(1, "#3730A3");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw White Card
      ctx.fillStyle = "#FFFFFF";
      const margin = 50;
      const radius = 60;
      ctx.beginPath();
      ctx.roundRect(margin, margin, width - margin * 2, height - margin * 2, radius);
      ctx.fill();

      // 3. Draw Header
      ctx.fillStyle = "#111827";
      ctx.font = "bold 50px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MILKOW", width / 2, 160);

      ctx.fillStyle = "#6B7280";
      ctx.font = "medium 30px Inter, sans-serif";
      ctx.fillText("Smart Milk Distribution", width / 2, 210);

      // 4. Draw Customer Info
      ctx.fillStyle = "#111827";
      ctx.font = "black 70px Inter, sans-serif";
      ctx.fillText(`$${selectedInvoice.amount.toFixed(2)}`, width / 2, 330);

      ctx.fillStyle = "#374151";
      ctx.font = "bold 35px Inter, sans-serif";
      ctx.fillText(`Payable by ${selectedInvoice.name}`, width / 2, 390);

      // 5. Draw the actual QR Code
      // We get the data from the rendered canvas in the UI
      const uiQrCanvas = qrRef.current?.querySelector("canvas");
      if (uiQrCanvas) {
         const qrSize = 500;
         ctx.drawImage(uiQrCanvas, (width - qrSize) / 2, 450, qrSize, qrSize);
      }

      // 6. Draw Footer Info
      ctx.fillStyle = "#111827";
      ctx.font = "bold 30px Inter, sans-serif";
      ctx.fillText("Scan with any UPI App", width / 2, 1000);

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "medium 24px Inter, sans-serif";
      ctx.fillText(`Invoice: ${selectedInvoice.id}`, width / 2, 1040);

      // 7. Share logic
      try {
         const dataUrl = canvas.toDataURL("image/png");
         const blob = await (await fetch(dataUrl)).blob();
         const file = new File([blob], `Payment_${selectedInvoice.name}.png`, { type: "image/png" });

         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
               files: [file],
               title: `Payment Card for ${selectedInvoice.name}`,
               text: `Hi ${selectedInvoice.name}, your payment card is ready.`,
            });
         } else {
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `Milkow_Card_${selectedInvoice.name}.png`;
            link.click();
         }
      } catch (e) {
         console.error(e);
      }
   };

   const handleWhatsAppShare = (invoice: any) => {
      const message = `Hi ${invoice.name}, your bill for ${invoice.type} is $${invoice.amount.toFixed(2)}. upi://pay?pa=yourvpa@upi&pn=Milkow&am=${selectedInvoice.amount}&cu=INR`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
   };

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-zinc-200/50">
            <h1 className="text-xl font-bold text-zinc-900">Billing & Collections</h1>
            <p className="text-sm text-zinc-500">Generate QR and WhatsApp links</p>
         </header>

         <main className="px-5 py-6 flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative mb-2">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-zinc-400" />
               </div>
               <input
                  type="text"
                  placeholder="Search customer or invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-zinc-200 placeholder:text-zinc-400 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all shadow-sm"
               />
               {searchTerm && (
                  <button
                     onClick={() => setSearchTerm("")}
                     className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400"
                  >
                     <X size={16} />
                  </button>
               )}
            </div>

            {filteredBills.length > 0 ? (
               filteredBills.map((bill: any) => {
                  const isPaid = paidInvoices.includes(bill.id);
                  return (
                     <div key={bill.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all duration-300">
                        <div className="flex justify-between items-start">
                           <div>
                              <h3 className="font-bold text-zinc-900">{bill.name}</h3>
                              <p className="text-xs text-zinc-500 mt-1">{bill.id} • {bill.type} Billing</p>
                           </div>
                           <div className="flex flex-col items-end">
                              <span className={`font-black text-lg ${isPaid ? 'text-emerald-500 line-through opacity-50' : 'text-rose-600'}`}>
                                 ${bill.amount.toFixed(2)}
                              </span>
                              {isPaid && (
                                 <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                                    Collected
                                 </span>
                              )}
                           </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                           <button
                              onClick={() => !isPaid && setSelectedInvoice(bill)}
                              disabled={isPaid}
                              className={`flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${isPaid ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-900 text-white active:scale-95'}`}
                           >
                              <QrCode size={16} /> Collect
                           </button>
                           <button
                              onClick={() => handleMarkAsPaid(bill.id)}
                              className={`flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 active:scale-95'}`}
                           >
                              {isPaid ? <Check size={16} /> : <CheckCircle2 size={16} />}
                              {isPaid ? 'Paid' : 'Mark Paid'}
                           </button>
                        </div>
                     </div>
                  );
               })) : (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <Search size={48} className="mb-4" />
                  <p className="font-bold">No bills found</p>
                  <p className="text-xs">Try searching for another customer name</p>
               </div>
            )}
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

                     <div className="mb-4 mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Payment Request</p>
                        <h2 className="text-3xl font-black text-zinc-900">${selectedInvoice.amount.toFixed(2)}</h2>
                     </div>

                     <div 
                        ref={qrRef}
                        className="bg-gradient-to-br from-primary to-primary-dim p-6 rounded-[2.5rem] shadow-2xl my-4 relative overflow-hidden"
                     >
                        <div className="bg-white p-4 rounded-[2rem] shadow-inner relative z-10">
                           <QRCodeCanvas
                              value={`upi://pay?pa=yourvpa@upi&pn=Milkow&am=${selectedInvoice.amount}&cu=INR`}
                              size={200}
                              includeMargin={false}
                              level="H"
                              imageSettings={{
                                 src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 2h8'/%3E%3Cpath d='M9 2v2a4 4 0 0 1-4 4v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a4 4 0 0 1-4-4V2'/%3E%3Cpath d='m8 12 1.33-1.33a4 4 0 1 1 5.34 0L16 12'/%3E%3C/svg%3E",
                                 x: undefined,
                                 y: undefined,
                                 height: 44,
                                 width: 44,
                                 excavate: true,
                              }}
                           />
                        </div>
                        <div className="mt-4 text-white">
                           <p className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">Milkow Fresh</p>
                           <p className="text-sm font-black">{selectedInvoice.name}</p>
                        </div>
                        {/* Decorative Circles */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary-dim rounded-full blur-2xl" />
                     </div>

                     <div className="w-full flex flex-col gap-3 mt-4">
                        <div className="flex gap-2">
                           <button
                              onClick={() => handleWhatsAppShare(selectedInvoice)}
                              className="flex-1 bg-[#E8F8EF] text-[#1E7E4E] py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                           >
                              <MessageCircle size={18} /> WhatsApp
                           </button>
                           <button 
                              onClick={handleShareCard}
                              className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                           >
                              <Share2 size={18} /> Share Card
                           </button>
                        </div>
                        <button
                           onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                           className="w-full bg-zinc-100 text-zinc-500 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                           <Wallet2 size={18} /> Manual Confirmation
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Success Toast */}
         <AnimatePresence>
            {showToast && (
               <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2"
               >
                  <CheckCircle2 size={18} />
                  Payment Recorded Successfully
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
}

