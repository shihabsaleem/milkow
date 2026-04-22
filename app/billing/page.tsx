"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, MessageCircle, Wallet2, CheckCircle2, X, Check, Search, Share2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";

export default function BillingPage() {
   const searchParams = useSearchParams();
   const qrRef = useRef<HTMLDivElement>(null);

   const [searchTerm, setSearchTerm] = useState("");
   const [selectedInvoice, setSelectedInvoice] = useState<(T.Bill & { customer: T.Customer }) | null>(null);
   const [bills, setBills] = useState<(T.Bill & { customer: T.Customer })[]>([]);
   const [paymentSettings, setPaymentSettings] = useState<T.PaymentSetup | null>(null);
   const [showToast, setShowToast] = useState(false);

   // 1. DATA LOAD & SYNC
   useEffect(() => {
      const fetchData = async () => {
         const { data: billsData } = await supabase.from('bills').select('*, customer:customers(*)').order('created_at', { ascending: false });
         if (billsData) setBills(billsData as (T.Bill & { customer: T.Customer })[]);

         const { data: settingsData } = await supabase.from('system_settings').select('value').eq('key', 'payment').single();
         if (settingsData) {
            const val = settingsData.value as T.PaymentSetup;
            setPaymentSettings(val);
         }
      };

      fetchData();

      const sub = supabase.channel('bills_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchData)
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, []);

   useEffect(() => {
      const search = searchParams.get("search");
      if (search) setSearchTerm(search);
   }, [searchParams]);

   const filteredBills = bills.filter((bill) =>
      bill.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.id.toLowerCase().includes(searchTerm.toLowerCase())
   );

   const handleMarkAsPaid = async (id: string) => {
      try {
         await supabase.from('bills').update({ status: 'Paid' }).eq('id', id);
         setShowToast(true);
         setTimeout(() => setShowToast(false), 3000);
      } catch (err) {
         console.error("Failed to mark as paid:", err);
      }
      setSelectedInvoice(null);
   };

   const handleShareCard = async () => {
      if (!selectedInvoice) return;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const width = 800; const height = 1100;
      canvas.width = width; canvas.height = height;
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#4F46E5"); gradient.addColorStop(1, "#3730A3");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.roundRect(50, 50, width - 100, height - 100, 60); ctx.fill();
      ctx.fillStyle = "#111827"; ctx.font = "bold 50px Inter"; ctx.textAlign = "center"; ctx.fillText("MILKOW", width / 2, 160);
      ctx.fillStyle = "#6B7280"; ctx.font = "medium 30px Inter"; ctx.fillText("Smart Milk Distribution", width / 2, 210);
      ctx.fillStyle = "#111827"; ctx.font = "black 70px Inter"; ctx.fillText(`₹${Number(selectedInvoice.amount).toFixed(2)}`, width / 2, 330);
      ctx.fillStyle = "#374151"; ctx.font = "bold 35px Inter"; ctx.fillText(`Payable by ${selectedInvoice.customer?.name}`, width / 2, 390);
      const uiQrCanvas = qrRef.current?.querySelector("canvas");
      if (uiQrCanvas) { ctx.drawImage(uiQrCanvas, 150, 450, 500, 500); }
      ctx.fillStyle = "#111827"; ctx.font = "bold 30px Inter"; ctx.fillText("Scan with any UPI App", width / 2, 1000);
      ctx.fillStyle = "#9CA3AF"; ctx.font = "medium 24px Inter"; ctx.fillText(`Invoice: ${selectedInvoice.id.slice(0, 8)}`, width / 2, 1040);
      try {
         const dataUrl = canvas.toDataURL("image/png");
         const blob = await (await fetch(dataUrl)).blob();
         const file = new File([blob], `Payment_${selectedInvoice.customer?.name}.png`, { type: "image/png" });
         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Payment Card for ${selectedInvoice.customer?.name}`, text: `Hi ${selectedInvoice.customer?.name}, your payment card is ready.` });
         } else {
            const link = document.createElement("a"); link.href = dataUrl; link.download = `Milkow_Card_${selectedInvoice.customer?.name}.png`; link.click();
         }
      } catch (e) { console.error(e); }
   };

   const handleWhatsAppShare = (invoice: (T.Bill & { customer: T.Customer })) => {
      if (!paymentSettings) return;
      const amount = Number(invoice.amount).toFixed(2);
      const message = `Hi ${invoice.customer?.name}, your bill for ${invoice.type} is ₹${amount}. upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(paymentSettings.payee_name)}&am=${invoice.amount}&cu=${paymentSettings.currency_code}`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`; window.open(url, "_blank");
   };

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4"><h1 className="text-xl font-bold text-zinc-900">Billing & Collections</h1><p className="text-sm text-zinc-500">Generate QR and WhatsApp links</p></div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
            <div className="relative mb-2">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={18} className="text-zinc-400" /></div>
               <input type="text" placeholder="Search customer or invoice..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 transition-all shadow-sm" />
               {searchTerm && (<button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400"><X size={16} /></button>)}
            </div>

            {filteredBills.length > 0 ? (
               filteredBills.map((bill) => {
                  const isPaid = bill.status === 'Paid';
                  return (
                     <div key={bill.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                           <div><h3 className="font-bold text-zinc-900">{bill.customer?.name}</h3><p className="text-xs text-zinc-500 mt-1">{bill.id.slice(0, 8)} • {bill.type} Billing</p></div>
                           <div className="flex flex-col items-end"><span className={`font-black text-lg ${isPaid ? 'text-emerald-500 line-through opacity-50' : 'text-primary'}`}>₹{Number(bill.amount).toFixed(2)}</span>{isPaid && (<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">Collected</span>)}</div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                           <button onClick={() => !isPaid && setSelectedInvoice(bill)} disabled={isPaid} className={`flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${isPaid ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-900 text-white active:scale-95'}`}><QrCode size={16} /> Collect</button>
                           <button onClick={() => handleMarkAsPaid(bill.id)} className={`flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${isPaid ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 border active:scale-95'}`}>{isPaid ? <Check size={16} /> : <CheckCircle2 size={16} />}{isPaid ? 'Paid' : 'Mark Paid'}</button>
                        </div>
                     </div>
                  );
               })) : (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-40"><Search size={48} className="mb-4" /><p className="font-bold">No bills found</p></div>
            )}
         </main>

         <AnimatePresence>
            {selectedInvoice && paymentSettings && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end">
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full bg-white rounded-t-3xl pt-6 pb-12 px-6 flex flex-col items-center text-center relative max-w-sm">
                     <button onClick={() => setSelectedInvoice(null)} className="absolute top-4 right-4 p-2 bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
                     <div className="mb-4 mt-4"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Payment Request</p><h2 className="text-3xl font-black text-zinc-900">₹{Number(selectedInvoice.amount).toFixed(2)}</h2></div>
                     <div ref={qrRef} className="bg-gradient-to-br from-primary to-primary-dim p-6 rounded-[2.5rem] shadow-2xl my-4 relative overflow-hidden">
                        <div className="bg-white p-4 rounded-[2rem] shadow-inner relative z-10">
                           <QRCodeCanvas value={`upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(paymentSettings.payee_name)}&am=${selectedInvoice.amount}&cu=${paymentSettings.currency_code}`} size={200} includeMargin={false} level="H" />
                        </div>
                        <div className="mt-4 text-white"><p className="text-[10px] font-bold opacity-60 uppercase text-black">{paymentSettings.payee_name}</p><p className="text-sm text-black font-black">{selectedInvoice.customer?.name}</p></div>
                     </div>
                     <div className="w-full flex flex-col gap-3 mt-4">
                        <div className="flex gap-2">
                           <button onClick={() => handleWhatsAppShare(selectedInvoice)} className="flex-1 bg-[#E8F8EF] text-[#1E7E4E] py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><MessageCircle size={18} /> WhatsApp</button>
                           <button onClick={handleShareCard} className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><Share2 size={18} /> Share Card</button>
                        </div>
                        <button onClick={() => handleMarkAsPaid(selectedInvoice.id)} className="w-full bg-zinc-100 text-zinc-500 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><Wallet2 size={18} /> Manual Confirmation</button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         <AnimatePresence>
            {showToast && (<motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2"><CheckCircle2 size={18} />Payment Recorded Successfully</motion.div>)}
         </AnimatePresence>
      </div>
   );
}
