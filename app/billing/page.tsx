"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, MessageCircle, Wallet2, CheckCircle2, X, Check, Search, Share2, ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/ui/Modal";
import * as T from "@/types/database";

export default function BillingPage() {
   const searchParams = useSearchParams();
   const qrRef = useRef<HTMLDivElement>(null);

   const [searchTerm, setSearchTerm] = useState("");
   const [selectedInvoice, setSelectedInvoice] = useState<(T.Bill & { customer: T.Customer }) | null>(null);
   const [bills, setBills] = useState<(T.Bill & { customer: T.Customer })[]>([]);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [routesList, setRoutesList] = useState<T.Area[]>([]);
   const [selectedRoute, setSelectedRoute] = useState<number | "">(() => {
      if (typeof window !== "undefined") {
         const saved = localStorage.getItem('milkow_selected_route');
         if (saved !== null) return saved === "" ? "" : parseInt(saved);
      }
      return "";
   });
   const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
   const [paymentSettings, setPaymentSettings] = useState<T.PaymentSetup | null>(null);
   const [showToast, setShowToast] = useState(false);
   const [isLoading, setIsLoading] = useState(true);

   const fetchData = async () => {
      setIsLoading(true);
      const [
         { data: routeSets },
         { data: financialsData },
         { data: productList },
         { data: unbilledData },
         { data: settingsData }
      ] = await Promise.all([
         supabase.from('areas').select('*').order('name', { ascending: true }),
         supabase.from('customer_financials').select('*'),
         supabase.from('products').select('*'),
         supabase.from('deliveries').select('*, customers(*)').eq('delivered', true).eq('billed', false),
         supabase.from('system_settings').select('value').eq('key', 'general').single()
      ]);

      if (routeSets) setRoutesList(routeSets as T.Area[]);

      const prods = (productList || []) as T.Product[];
      setProducts(prods);
      const prices: Record<string, number> = {};
      prods.forEach(p => { prices[p.id] = p.price; prices[p.name] = p.price; });

      // Group unbilled by customer
      const unbilledTotals: Record<string, number> = {};
      (unbilledData || []).forEach((d: any) => {
         const milkPrice = prices[d.product_id || ""] || 0;
         let total = (d.milk_qty || 0) * milkPrice;
         (d.misc_items || []).forEach((item: { name: string; qty: number }) => {
            total += (item.qty || 0) * (prices[item.name] || 0);
         });
         unbilledTotals[d.customer_id] = (unbilledTotals[d.customer_id] || 0) + total;
      });

      // Combine with financials
      const combinedBills: (T.Bill & { customer: T.Customer })[] = [];
      (financialsData || []).forEach((fin: T.CustomerFinancials) => {
         const unbilled = unbilledTotals[fin.id] || 0;
         const grandTotal = fin.current_balance + unbilled;

         if (grandTotal > 0) {
            combinedBills.push({
               id: `TOTAL-${fin.id.slice(0, 8)}`,
               customer_id: fin.id,
               amount: grandTotal,
               type: 'Ledger' as any,
               status: 'Pending',
               created_at: new Date().toISOString(),
               customer: {
                  id: fin.id,
                  name: fin.name,
                  area_id: (financialsData as any[]).find(f => f.id === fin.id)?.area_id || null
               } as any
            });
         }
      });

      setBills(combinedBills);

      if (settingsData) {
         const general = settingsData.value as { payment?: T.PaymentSetup };
         if (general?.payment) setPaymentSettings(general.payment);
      }
      setIsLoading(false);
   };
   // 1. DATA LOAD & SYNC
   useEffect(() => {
      fetchData();

      const sub = supabase.channel('bills_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchData)
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, []);

   useEffect(() => {
      localStorage.setItem('milkow_selected_route', selectedRoute.toString());
   }, [selectedRoute]);

   useEffect(() => {
      const search = searchParams.get("search");
      if (search) setSearchTerm(search);
   }, [searchParams]);

   const filteredBills = bills.filter((bill) => {
      const matchesSearch = bill.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         bill.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRoute = selectedRoute === "" || bill.customer?.area_id === selectedRoute;
      return matchesSearch && matchesRoute && bill.status !== 'Paid';
   });

   const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: (dontShowAgain?: boolean) => void;
      type: 'danger' | 'info' | 'success';
      confirmText?: string;
      showDontShowAgain?: boolean;
   }>({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => { },
      type: 'info'
   });

   const [dontShowAgain, setDontShowAgain] = useState(false);

   const runMarkAsPaid = async (id: string) => {
      try {
         const entry = bills.find(b => b.id === id);
         if (!entry) return;

         const customerId = entry.customer_id;

         // Fetch fresh data
         const [
            { data: customer },
            { data: unbilledDeliveries },
            { data: freshFinancials }
         ] = await Promise.all([
            supabase.from('customers').select('*').eq('id', customerId).single(),
            supabase.from('deliveries').select('*').eq('customer_id', customerId).eq('delivered', true).eq('billed', false),
            supabase.from('customer_financials').select('*').eq('id', customerId).single()
         ]);

         if (!customer || !freshFinancials) return;

         const pastOutstanding = Number(customer.past_outstanding) || 0;

         // Calculate unbilled deliveries amount
         const priceMap: Record<string, number> = {};
         products.forEach(p => { priceMap[p.id] = Number(p.price); priceMap[p.name] = Number(p.price); });
         const unbilledAmount = (unbilledDeliveries || []).reduce((acc, d) => {
            const unitPrice = priceMap[d.product_id || ""] || 0;
            let t = (d.milk_qty || 0) * unitPrice;
            (d.misc_items || []).forEach((item: any) => { t += (item.qty || 0) * (priceMap[item.name] || 0); });
            return acc + t;
         }, 0);

         // The true total owed = ledger balance (from DB view) + unbilled not yet in view
         const totalOwed = Number(freshFinancials.current_balance) + unbilledAmount;
         if (totalOwed <= 0) return; // Nothing to settle

         // 1. Convert past_outstanding to a bill so billed = paid math works
         if (pastOutstanding > 0) {
            await supabase.from('bills').insert({
               customer_id: customerId,
               amount: pastOutstanding,
               type: 'Opening Balance',
               status: 'Pending',
               notes: 'Converted for settlement',
               created_at: new Date().toISOString()
            });
            await supabase.from('customers').update({ past_outstanding: 0 }).eq('id', customerId);
         }

         // 2. Bill unbilled deliveries
         if (unbilledDeliveries && unbilledDeliveries.length > 0 && unbilledAmount > 0) {
            await supabase.from('bills').insert({
               customer_id: customerId,
               amount: unbilledAmount,
               type: 'Spot',
               status: 'Pending',
               created_at: new Date().toISOString()
            });
            const ids = unbilledDeliveries.map(d => d.id);
            await supabase.from('deliveries').update({ billed: true }).in('id', ids);
         }

         // 3. Mark ALL pending bills as Paid (includes ones just created above)
         await supabase.from('bills')
            .update({ status: 'Paid' })
            .eq('customer_id', customerId)
            .eq('status', 'Pending');

         // 4. Record payment for the true total owed
         await supabase.from('payments').insert({
            customer_id: customerId,
            amount: totalOwed,
            method: 'Cash',
            payment_date: new Date().toISOString(),
            notes: 'Full Settlement from Billing'
         });

         setShowToast(true);
         setTimeout(() => setShowToast(false), 3000);
         await fetchData();
      } catch (err) {
         console.error("Failed to mark as paid:", err);
      }
      setSelectedInvoice(null);
   };

   const handleMarkAsPaid = (id: string) => {
      const skip = localStorage.getItem('skip_billing_confirm') === 'true';
      if (skip) {
         runMarkAsPaid(id);
         return;
      }

      const entry = bills.find(b => b.id === id);
      if (!entry) return;

      setModalConfig({
         isOpen: true,
         title: "Confirm Payment",
         message: `Mark the full balance of ₹${Number(entry.amount).toFixed(2)} for ${entry.customer?.name} as paid in cash?`,
         type: 'success',
         confirmText: "Yes, Mark Paid",
         showDontShowAgain: true,
         onConfirm: (dontShow) => {
            if (dontShow) localStorage.setItem('skip_billing_confirm', 'true');
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            runMarkAsPaid(id);
         }
      });
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
      const logo = new Image();
      logo.src = "/assets/logo.svg";
      await new Promise((resolve) => { logo.onload = resolve; });
      ctx.drawImage(logo, (width / 2) - 50, 100, 100, 100);
      ctx.fillStyle = "#111827"; ctx.font = "black 70px Geist Sans"; ctx.fillText(`₹${Number(selectedInvoice.amount).toFixed(2)}`, width / 2, 330);
      ctx.fillStyle = "#374151"; ctx.font = "bold 35px Geist-Sans"; ctx.fillText(`Payable by ${selectedInvoice.customer?.name}`, width / 2, 390);
      const uiQrCanvas = qrRef.current?.querySelector("canvas");
      if (uiQrCanvas) { ctx.drawImage(uiQrCanvas, 150, 450, 500, 500); }
      ctx.fillStyle = "#111827"; ctx.font = "bold 30px Geist"; ctx.fillText("Scan with any UPI App", width / 2, 1000);
      ctx.fillStyle = "#9CA3AF"; ctx.font = "medium 24px Geist"; ctx.fillText(`Invoice: ${selectedInvoice.id.slice(0, 8)}`, width / 2, 1040);
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
      const url = `https://wa.me/+91${invoice.customer?.phone}?text=${encodeURIComponent(message)}`; window.open(url, "_blank");
   };

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex flex-col gap-1">
               <div className="flex items-center justify-between">
                  <div className="relative">
                     <button onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)} className="flex items-center gap-2 group">
                        <h1 className="text-xl font-bold text-zinc-900">
                           {selectedRoute === "" ? "All Routes" : routesList.find(r => r.id === selectedRoute)?.name || 'Billing'}
                        </h1>
                        <ChevronDown size={18} className={`text-zinc-400 transition-transform duration-300 ${isRouteMenuOpen ? 'rotate-180' : ''}`} />
                     </button>

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
                                       <span>All Routes</span>
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
               </div>
               <p className="text-sm text-zinc-500">Generate QR and WhatsApp links</p>
            </div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
            <div className="relative mb-2">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={18} className="text-zinc-400" /></div>
               <input type="text" placeholder="Search customer or invoice..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 transition-all shadow-sm" />
               {searchTerm && (<button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400"><X size={16} /></button>)}
            </div>

            {isLoading ? (
               <>
                  {[1, 2, 3, 4].map(i => (
                     <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between animate-pulse">
                        <div className="flex justify-between items-start">
                           <div className="w-1/2">
                              <div className="h-5 bg-zinc-200 rounded-md w-3/4 mb-2"></div>
                              <div className="h-3 bg-zinc-100 rounded-md w-1/2"></div>
                           </div>
                           <div className="w-1/4 flex flex-col items-end">
                              <div className="h-6 bg-zinc-200 rounded-md w-full"></div>
                           </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                           <div className="flex-1 h-10 bg-zinc-200 rounded-xl"></div>
                           <div className="flex-1 h-10 bg-zinc-200 rounded-xl"></div>
                        </div>
                     </div>
                  ))}
               </>
            ) : filteredBills.length > 0 ? (
               filteredBills.map((bill) => {
                  return (
                     <div key={bill.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                           <div><h3 className="font-bold text-zinc-900">{bill.customer?.name}</h3><p className="text-xs text-zinc-500 mt-1">{bill.id.slice(0, 8)} • {bill.type} Billing</p></div>
                           <div className="flex flex-col items-end"><span className="font-black text-lg text-primary">₹{Number(bill.amount).toFixed(2)}</span></div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                           <button onClick={() => setSelectedInvoice(bill)} className="flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all bg-zinc-900 text-white active:scale-95"><QrCode size={16} /> Collect</button>
                           <button onClick={() => handleMarkAsPaid(bill.id)} className="flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all bg-emerald-50 text-emerald-600 border active:scale-95"><CheckCircle2 size={16} /> Mark Paid</button>
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
                           <QRCodeCanvas
                              value={`upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(paymentSettings.payee_name)}&am=${selectedInvoice.amount}&cu=${paymentSettings.currency_code}`}
                              size={200}
                              includeMargin={false}
                              level="H"
                              imageSettings={{
                                 src: "/assets/icon.svg",
                                 x: undefined,
                                 y: undefined,
                                 height: 40,
                                 width: 40,
                                 excavate: true,
                              }}
                           />
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

         <Modal
            isOpen={modalConfig.isOpen}
            onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            onConfirm={modalConfig.onConfirm}
            title={modalConfig.title}
            message={modalConfig.message}
            type={modalConfig.type}
            confirmText={modalConfig.confirmText}
            showDontShowAgain={modalConfig.showDontShowAgain}
         />
      </div>
   );
}
