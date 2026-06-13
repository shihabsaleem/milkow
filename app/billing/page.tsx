"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, MessageCircle, Wallet2, CheckCircle2, X, Check, MapPin, Search, Share2, ChevronDown } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Modal from "@/components/ui/Modal";
import PullToRefresh from "@/components/ui/PullToRefresh";
import * as T from "@/types/database";
import { recordPayment, settleAllDues } from "@/lib/financials";

export default function BillingPage() {
   const router = useRouter();
   const { user, loading } = useAuth();

   useEffect(() => {
      if (!loading && !user) {
         router.push("/404");
      }
   }, [user, loading, router]);

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

   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
   const [paymentAmount, setPaymentAmount] = useState("");
   const [paymentMethod, setPaymentMethod] = useState("Cash");
   const [paymentNotes, setPaymentNotes] = useState("");
   const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<string | null>(null);
   const [paymentTotalDue, setPaymentTotalDue] = useState<number | null>(null);

   const fetchData = async (silent = false) => {
      if (!silent) setIsLoading(true);
      const [
         { data: routeSets },
         { data: financialsData },
         { data: productList },
         { data: unbilledData },
         { data: settingsData },
         { data: customersData }
      ] = await Promise.all([
         supabase.from('areas').select('*').order('name', { ascending: true }),
         supabase.from('customer_financials').select('*'),
         supabase.from('products').select('*'),
         supabase.from('deliveries').select('*, customers(*)').eq('delivered', true).eq('billed', false),
         supabase.from('system_settings').select('value').eq('key', 'general').single(),
         supabase.from('customers').select('id, phone')
      ]);

      if (routeSets) setRoutesList(routeSets as T.Area[]);

      const prods = (productList || []) as T.Product[];
      setProducts(prods);
      const prices: Record<string, number> = {};
      prods.forEach(p => { prices[p.id] = p.price; prices[p.name] = p.price; });

      const customersMap = new Map((customersData || []).map((c: any) => [c.id, c]));

      // Combine with financials
      const combinedBills: (T.Bill & { customer: T.Customer })[] = [];
      (financialsData || []).forEach((fin: any) => {
         const grandTotal = fin.current_balance;
         const cDetail = customersMap.get(fin.id) as any;

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
                  phone: cDetail?.phone || null,
                  area_id: fin.area_id || null
               } as any
            });
         }
      });

      setBills(combinedBills);

      if (settingsData) {
         const general = settingsData.value as { payment?: T.PaymentSetup };
         if (general?.payment) setPaymentSettings(general.payment);
      }
      if (!silent) setIsLoading(false);
   };

   // 1. DATA LOAD & SYNC
   useEffect(() => {
      fetchData();

      const sub = supabase.channel('bills_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchData)
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

   const runRecordPayment = async (amountVal: number, methodVal: string, notesVal: string) => {
      if (!selectedCustomerForPayment || isLoading) return;
      try {
         setIsLoading(true);
         await recordPayment(selectedCustomerForPayment, amountVal, methodVal, notesVal || 'Custom Payment from Billing');

         await fetchData();
         setIsPaymentModalOpen(false);
         setSelectedCustomerForPayment(null);
         
         setModalConfig({
            isOpen: true,
            title: "Payment Recorded",
            message: `Successfully recorded payment of ₹${amountVal.toFixed(2)} using ${methodVal}.`,
            type: 'success',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
            confirmText: "Great"
         });
      } catch (err) {
         console.error("Failed to record payment:", err);
         setModalConfig({
            isOpen: true,
            title: "Payment Failed",
            message: "Failed to record payment. Please check your connection and try again.",
            type: 'danger',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
         });
      } finally {
         setIsLoading(false);
      }
   };

   const runMarkAsPaid = async (id: string) => {
      if (isLoading) return;
      try {
         const entry = bills.find(b => b.id === id);
         if (!entry) return;

         await settleAllDues(entry.customer_id, 'Cash', 'Full Settlement from Billing');

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

   const getPaymentCardFile = async (invoice: T.Bill & { customer: T.Customer }) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // High-res for sharing (9:16 aspect ratio)
      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      // 1. Background (Premium Deep Navy)
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, "#050044");
      bgGradient.addColorStop(1, "#020024");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Add subtle decorative accents
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(width * 0.9, height * 0.1, 500, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(width * 0.1, height * 0.9, 400, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1.0;

      // 2. Main Card Body (Receipt Style)
      const cardX = 80;
      const cardY = 120;
      const cardW = width - 160;
      const cardH = 1600; // Card spans from y=120 to y=1720
      const radius = 80;

      // Card Shadow
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 30;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fill();
      ctx.shadowColor = "transparent";

      // 3. Logo & Brand Header
      const logo = new Image();
      logo.src = "/assets/logo.svg";
      await new Promise((resolve) => { logo.onload = resolve; logo.onerror = resolve; });
      if (logo.complete && logo.naturalWidth > 0) {
         const logoWidth = 260;
         const logoHeight = logo.naturalHeight * (logoWidth / logo.naturalWidth);
         ctx.drawImage(logo, (width / 2) - (logoWidth / 2), cardY + 80, logoWidth, logoHeight);
      }

      // 4. Amount Section
      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 36px Geist, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TOTAL PAYABLE", width / 2, cardY + 300);

      ctx.fillStyle = "#050044";
      ctx.font = "900 120px Geist, Inter, sans-serif";
      const formattedAmount = `₹${Number(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      ctx.fillText(formattedAmount, width / 2, cardY + 440);

      // Divider Line
      ctx.strokeStyle = "#F1F5F9";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cardX + 100, cardY + 540);
      ctx.lineTo(cardX + cardW - 100, cardY + 540);
      ctx.stroke();

      // 5. Customer Details
      ctx.textAlign = "left";
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 30px Geist, Inter, sans-serif";
      ctx.fillText("BILL TO", cardX + 100, cardY + 620);

      ctx.fillStyle = "#1E293B";
      ctx.font = "900 50px Geist, Inter, sans-serif";
      ctx.fillText(invoice.customer?.name || "Customer", cardX + 100, cardY + 695);

      const phone = invoice.customer?.phone || "";
      const routeId = invoice.customer?.area_id;
      const routeName = routesList.find(r => r.id === routeId)?.name || "";

      let detailsText = "";
      if (phone && routeName) {
         detailsText = `${phone}   ·   ${routeName}`;
      } else {
         detailsText = phone || routeName || "";
      }

      if (detailsText) {
         ctx.fillStyle = "#64748B";
         ctx.font = "600 32px Geist, Inter, sans-serif";
         ctx.fillText(detailsText, cardX + 100, cardY + 760);
      }

      // 6. QR Code Section
      const qrSize = 540;
      const qrX = (width / 2) - (qrSize / 2);
      const qrY = cardY + 840;

      // QR Frame/Container
      ctx.fillStyle = "#F8FAFC";
      ctx.beginPath();
      ctx.roundRect(qrX - 40, qrY - 40, qrSize + 80, qrSize + 80, 60);
      ctx.fill();

      // Decorative border for QR
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 2;
      ctx.stroke();

      const uiQrCanvas = qrRef.current?.querySelector("canvas");
      if (uiQrCanvas) {
         ctx.drawImage(uiQrCanvas, qrX, qrY, qrSize, qrSize);
      }

      // 7. Payment Instructions
      ctx.textAlign = "center";
      ctx.fillStyle = "#050044";
      ctx.font = "bold 38px Geist, Inter, sans-serif";
      ctx.fillText("Scan with any UPI App", width / 2, cardY + 1475);

      if (paymentSettings?.upi_id) {
         ctx.fillStyle = "#64748B";
         ctx.font = "600 30px Geist, Inter, sans-serif";
         ctx.fillText(`UPI ID: ${paymentSettings.upi_id}`, width / 2, cardY + 1535);
      }

      // 8. Bottom Branding
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "bold 32px Geist, Inter, sans-serif";
      ctx.fillText("Fresh Milk, Delivered with Love.", width / 2, 1860);

      const dataUrl = canvas.toDataURL("image/png", 0.95);
      const blob = await (await fetch(dataUrl)).blob();
      return new File([blob], `Milkow_Bill_${invoice.customer?.name}.png`, { type: "image/png" });
   };

   const handleShareCard = async () => {
      if (!selectedInvoice) return;
      try {
         const file = await getPaymentCardFile(selectedInvoice);
         if (!file) return;
         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Payment Card for ${selectedInvoice.customer?.name}`, text: `Hi ${selectedInvoice.customer?.name}, your payment card is ready.` });
         } else {
            const dataUrl = URL.createObjectURL(file);
            const link = document.createElement("a"); link.href = dataUrl; link.download = `Milkow_Card_${selectedInvoice.customer?.name}.png`; link.click();
         }
      } catch (e) { console.error(e); }
   };

   const handleWhatsAppShare = async (invoice: (T.Bill & { customer: T.Customer })) => {
      if (!paymentSettings) return;
      const amount = Number(invoice.amount).toFixed(2);
      const upiLink = `upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(paymentSettings.payee_name)}&am=${invoice.amount}&cu=${paymentSettings.currency_code}`;
      const message = `Hi ${invoice.customer?.name}, your bill for ${invoice.type} is ₹${amount}. You can pay using the attached QR or this link: ${upiLink}`;

      const url = `https://wa.me/+91${invoice.customer?.phone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
   };

   return (
      <PullToRefresh onRefresh={() => fetchData(true)} className="bg-slate-50 text-zinc-900 font-sans pb-32">
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
                           <div><h3 className="font-bold text-zinc-900">{bill.customer?.name}</h3>
                              <div className="flex items-center">
                                 <MapPin size={12} className="text-zinc-400 shrink-0" />
                                 <p className="text-xs text-zinc-500 font-medium">{routesList.find(r => r.id === bill.customer?.area_id)?.name || "No Route"}</p>
                              </div>
                           </div>
                           <div className="flex flex-col items-end"><span className="font-black text-lg text-primary">₹{Number(bill.amount).toFixed(2)}</span></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-100">
                           <button onClick={() => setSelectedInvoice(bill)} className="rounded-xl py-2.5 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all bg-zinc-100 text-zinc-700 active:scale-95"><QrCode size={14} /> Share</button>
                           <button onClick={() => {
                              setSelectedCustomerForPayment(bill.customer_id);
                              setPaymentAmount(bill.amount.toString());
                              setPaymentMethod("Cash");
                              setPaymentNotes("");
                              setPaymentTotalDue(bill.amount);
                              setIsPaymentModalOpen(true);
                           }} className="rounded-xl py-2.5 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all bg-primary text-white active:scale-95"><Wallet2 size={14} /> Record</button>
                           <button onClick={() => handleMarkAsPaid(bill.id)} className="rounded-xl py-2.5 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all bg-emerald-50 text-emerald-600 border active:scale-95"><CheckCircle2 size={14} /> Settle</button>
                        </div>
                     </div>
                  );
               })) : (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-40"><Search size={48} className="mb-4" /><p className="font-bold">No bills found</p></div>
            )}
         </main>

         <AnimatePresence>
            {selectedInvoice && paymentSettings && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex justify-center items-end">
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full bg-white rounded-t-3xl pt-6 pb-12 px-6 flex flex-col items-center text-center relative max-w-sm">
                     <button onClick={() => setSelectedInvoice(null)} className="absolute top-4 right-4 p-2 bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
                     <div className="mb-4 mt-4"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Payment Request</p><h2 className="text-3xl font-black text-zinc-900">₹{Number(selectedInvoice.amount).toFixed(2)}</h2></div>
                     <div ref={qrRef} className="bg-linear-to-br from-primary to-primary-dim p-6 rounded-[2.5rem] shadow-2xl my-4 relative overflow-hidden">
                        <div className="bg-white p-4 rounded-4xl shadow-inner relative z-10">
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
                        <div className="mt-4 text-white">
                           <p className="text-[10px] font-bold opacity-60 uppercase text-black">{paymentSettings.payee_name}</p>
                           <p className="text-sm text-black font-black">{selectedInvoice.customer?.name}</p>
                           <p className="text-[11px] font-bold opacity-75 text-black mt-1">{paymentSettings.upi_id}</p>
                        </div>
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
            {showToast && (<motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-110 bg-emerald-600 text-white px-6 py-3 rounded-full font-medium text-xs shadow-xl flex items-center gap-2"><CheckCircle2 size={16} />Payment Recorded Successfully</motion.div>)}
         </AnimatePresence>

         <AnimatePresence>
            {isPaymentModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6 text-zinc-900">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-black text-slate-900">Record Payment</p><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button></div>
                     
                     {paymentTotalDue !== null ? (
                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between">
                           <span className="text-orange-800 text-xs font-bold uppercase tracking-widest">Total Outstanding</span>
                           <span className="text-orange-600 font-black text-lg">₹{paymentTotalDue.toFixed(2)}</span>
                        </div>
                     ) : (
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-center animate-pulse h-14" />
                     )}

                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(paymentAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        runRecordPayment(amt, paymentMethod, paymentNotes);
                     }} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payment Amount (₹)</label>
                           <input
                              autoFocus
                              type="number"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all font-bold"
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payment Method</label>
                           <div className="grid grid-cols-2 gap-2">
                              {['Cash', 'UPI', 'Bank Transfer', 'Other'].map(method => (
                                 <button
                                    type="button"
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-2 text-sm font-bold rounded-xl border transition-all ${paymentMethod === method ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                 >
                                    {method}
                                 </button>
                              ))}
                           </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notes (Optional)</label>
                           <input
                              type="text"
                              placeholder="e.g. Cleared past dues"
                              value={paymentNotes}
                              onChange={e => setPaymentNotes(e.target.value)}
                              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all"
                           />
                        </div>
                        <button disabled={isLoading} type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                           {isLoading ? "Saving..." : "Record Payment"}
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
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
      </PullToRefresh>
   );
}
