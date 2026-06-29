"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import config from "@/config.json";
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
import { useBillingLogic } from "@/hooks/useBillingLogic";

export default function BillingPage() {
   return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
         <BillingContent />
      </Suspense>
   );
}

function BillingContent() {
   const router = useRouter();
   const { user, loading } = useAuth();

   useEffect(() => {
      if (!loading && !user) {
         router.push("/404");
      }
   }, [user, loading, router]);

   const searchParams = useSearchParams();
   const qrRef = useRef<HTMLDivElement>(null);

   const {
      bills,
      routesList,
      paymentSettings,
      isLoading,
      setIsLoading,
      showToast,
      modalConfig,
      setModalConfig,
      fetchData,
      handleMarkAsPaid,
      handleShareCard,
      handleWhatsAppShare,
      isShareLoading
   } = useBillingLogic(qrRef);

   const [searchTerm, setSearchTerm] = useState("");
   const [selectedInvoice, setSelectedInvoice] = useState<(T.Bill & { customer: T.Customer }) | null>(null);
   const [selectedRoute, setSelectedRoute] = useState<number | "">(() => {
      if (typeof window !== "undefined") {
         const saved = localStorage.getItem('milkow_selected_route');
         if (saved !== null) return saved === "" ? "" : parseInt(saved);
      }
      return "";
   });

   useEffect(() => {
      localStorage.setItem('milkow_selected_route', selectedRoute.toString());
   }, [selectedRoute]);

   useEffect(() => {
      const search = searchParams.get("search");
      if (search) setSearchTerm(search);
   }, [searchParams]);

   const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);

   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
   const [paymentAmount, setPaymentAmount] = useState("");
   const [paymentMethod, setPaymentMethod] = useState("Cash");
   const [paymentNotes, setPaymentNotes] = useState("");
   const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<string | null>(null);
   const [paymentTotalDue, setPaymentTotalDue] = useState<number | null>(null);

   const filteredBills = bills.filter((bill) => {
      const matchesSearch = bill.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         bill.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRoute = selectedRoute === "" || bill.customer?.area_id === selectedRoute;
      return matchesSearch && matchesRoute && bill.status !== 'Paid';
   });

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

   return (
      <PullToRefresh onRefresh={() => fetchData(true)} className="bg-mono-bg text-mono-text font-sans pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-mono-border/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex flex-col gap-1">
               <div className="flex items-center justify-between">
                  <div className="relative">
                     <button onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)} className="flex items-center gap-2 group">
                        <h1 className="text-xl font-semibold text-mono-text">
                           {selectedRoute === "" ? "All Routes" : routesList.find(r => r.id === selectedRoute)?.name || 'Billing'}
                        </h1>
                        <ChevronDown size={18} className={`text-mono-text-disabled transition-transform duration-300 ${isRouteMenuOpen ? 'rotate-180' : ''}`} />
                     </button>

                     <AnimatePresence>
                        {isRouteMenuOpen && (
                           <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsRouteMenuOpen(false)} />
                              <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute left-0 mt-3 w-64 bg-white/90 backdrop-blur-xl border border-mono-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-card overflow-hidden z-50"
                              >
                                 <div className="px-4 py-2 border-b border-mono-divider/50 bg-mono-bg/50">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-mono-text-disabled">Select Route</span>
                                 </div>
                                 <div className="py-1 max-h-80 overflow-y-auto no-scrollbar">
                                    <button
                                       onClick={() => { setSelectedRoute(""); setIsRouteMenuOpen(false); }}
                                       className={`w-full text-left px-4 py-3.5 text-sm font-medium flex items-center justify-between transition-all ${selectedRoute === "" ? 'bg-mono-text/5 text-mono-text' : 'text-mono-text-muted hover:bg-mono-bg'}`}
                                    >
                                       <span>All Routes</span>
                                       {selectedRoute === "" && <Check size={16} strokeWidth={3} />}
                                    </button>
                                    {routesList.map((route) => (
                                       <button
                                          key={route.id}
                                          onClick={() => { setSelectedRoute(route.id); setIsRouteMenuOpen(false); }}
                                          className={`w-full text-left px-4 py-3.5 text-sm font-medium flex items-center justify-between transition-all ${selectedRoute === route.id ? 'bg-mono-text/5 text-mono-text' : 'text-mono-text-muted hover:bg-mono-bg'}`}
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
               <p className="text-xs font-medium text-mono-text-disabled">Generate QR and WhatsApp links</p>
            </div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
            <div className="relative mb-2">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={18} className="text-mono-text-disabled" /></div>
               <input type="text" placeholder="Search customer or invoice..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-mono-border rounded-card py-3 pl-11 pr-4 text-sm focus:ring-2 transition-all shadow-sm" />
               {searchTerm && (<button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-mono-text-disabled"><X size={16} /></button>)}
            </div>

            {isLoading ? (
               <>
                  {[1, 2, 3, 4].map(i => (
                     <div key={i} className="bg-white border border-mono-border rounded-card p-4 shadow-sm flex flex-col justify-between animate-pulse">
                        <div className="flex justify-between items-start">
                           <div className="w-1/2">
                              <div className="h-5 bg-mono-border rounded-md w-3/4 mb-2"></div>
                              <div className="h-3 bg-mono-surface rounded-md w-1/2"></div>
                           </div>
                           <div className="w-1/4 flex flex-col items-end">
                              <div className="h-6 bg-mono-border rounded-md w-full"></div>
                           </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-mono-divider">
                           <div className="flex-1 h-10 bg-mono-border rounded-card"></div>
                           <div className="flex-1 h-10 bg-mono-border rounded-card"></div>
                        </div>
                     </div>
                  ))}
               </>
            ) : filteredBills.length > 0 ? (
               filteredBills.map((bill) => {
                  return (
                     <div key={bill.id} className="bg-white border border-mono-border rounded-card p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                           <div><h3 className="font-semibold text-mono-text">{bill.customer?.name}</h3>
                              <div className="flex items-center">
                                 <MapPin size={12} className="text-mono-text-disabled shrink-0" />
                                 <p className="text-xs text-mono-text-muted font-medium">{routesList.find(r => r.id === bill.customer?.area_id)?.name || "No Route"}</p>
                              </div>
                           </div>
                           <div className="flex flex-col items-end"><span className="font-bold text-lg text-mono-text">₹{Number(bill.amount).toFixed(2)}</span></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-mono-divider">
                           <button disabled={isLoading} onClick={() => setSelectedInvoice(bill)} className="rounded-md py-2.5 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all bg-mono-surface text-mono-text active:scale-95 disabled:opacity-50"><QrCode size={14} /> Show QR</button>
                           <button disabled={isLoading} onClick={() => {
                              setSelectedCustomerForPayment(bill.customer_id);
                              setPaymentAmount(bill.amount.toString());
                              setPaymentMethod("Cash");
                              setPaymentNotes("");
                              setPaymentTotalDue(bill.amount);
                              setIsPaymentModalOpen(true);
                           }} className="rounded-md py-2.5 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all bg-mono-text text-white active:scale-95 disabled:opacity-50"><Wallet2 size={14} /> Record</button>
                           <button disabled={isLoading} onClick={() => handleMarkAsPaid(bill.id, setSelectedInvoice)} className="rounded-md py-2.5 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all bg-mono-surface text-mono-text border active:scale-95 disabled:opacity-50 disabled:pointer-events-none"><CheckCircle2 size={14} /> Settle</button>
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
                     <button onClick={() => setSelectedInvoice(null)} className="absolute top-4 right-4 p-2 bg-mono-surface rounded-full text-mono-text-muted"><X size={20} /></button>
                     <div className="mb-4 mt-4"><p className="text-[10px] font-bold uppercase tracking-widest text-mono-text-disabled">Payment Request</p><h2 className="text-3xl font-semibold text-mono-text">₹{Number(selectedInvoice.amount).toFixed(2)}</h2></div>
                     <div ref={qrRef} className="bg-gray-200 p-6 rounded-4xl shadow-md my-4 relative overflow-hidden">
                        <div className="bg-white p-4 rounded-card shadow-inner relative z-10">
                           <QRCodeCanvas
                              // value={`upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(paymentSettings.payee_name)}`
                              //    /*  &am=${selectedInvoice.amount}
                              //      &cu=${paymentSettings.currency_code}
                              //      &aid=${config.aid}` */
                              // }
                              value={`upi://pay?pa=Q314473056@ybl&pn=${encodeURIComponent(paymentSettings.payee_name)}&cu=INR&am=${selectedInvoice.amount}`}
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
                           <p className="text-sm text-black font-bold">{selectedInvoice.customer?.name}</p>
                           <p className="text-[11px] font-bold opacity-75 text-black mt-1">{paymentSettings.upi_id}</p>
                        </div>
                     </div>
                     <div className="w-full flex flex-col gap-3 mt-4">
                        <div className="flex gap-2">
                           <button onClick={() => handleWhatsAppShare(selectedInvoice)} className="flex-1 bg-success-soft text-success/80 py-3.5 rounded-card font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><MessageCircle size={18} /> WhatsApp</button>
                           <button onClick={() => handleShareCard(selectedInvoice)} disabled={isShareLoading} className="flex-1 bg-mono-text text-white py-3.5 rounded-card font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none">{isShareLoading ? <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating...</> : <><Share2 size={18} /> Share Card</>}</button>
                        </div>
                        <button onClick={() => handleMarkAsPaid(selectedInvoice.id, setSelectedInvoice)} className="w-full bg-mono-surface text-mono-text-muted py-3.5 rounded-card font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><Wallet2 size={18} /> Manual Confirmation</button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         <AnimatePresence>
            {showToast && (<motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-110 bg-success text-white px-6 py-3 rounded-full font-medium text-xs shadow-sm flex items-center gap-2"><CheckCircle2 size={16} />Payment Recorded Successfully</motion.div>)}
         </AnimatePresence>

         <AnimatePresence>
            {isPaymentModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-hero p-7 shadow-md flex flex-col gap-6 text-mono-text">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-semibold text-mono-text">Record Payment</p><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-mono-surface rounded-card text-mono-text-muted"><X size={18} /></button></div>

                     {paymentTotalDue !== null ? (
                        <div className="bg-mono-surface border border-mono-border p-4 rounded-card flex items-center justify-between">
                           <span className="text-mono-text text-xs font-bold uppercase tracking-widest">Total Outstanding</span>
                           <span className="text-mono-text font-bold text-lg">₹{paymentTotalDue.toFixed(2)}</span>
                        </div>
                     ) : (
                        <div className="bg-mono-bg border border-mono-divider p-4 rounded-card flex items-center justify-center animate-pulse h-14" />
                     )}

                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(paymentAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        runRecordPayment(amt, paymentMethod, paymentNotes);
                     }} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Payment Amount (₹)</label>
                           <input
                              autoFocus
                              type="number"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                              className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all font-medium"
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Payment Method</label>
                           <div className="grid grid-cols-2 gap-2">
                              {['Cash', 'UPI', 'Bank Transfer', 'Other'].map(method => (
                                 <button
                                    type="button"
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-2 text-sm font-bold rounded-card border transition-all ${paymentMethod === method ? 'bg-mono-text/5 border-mono-border text-mono-text' : 'bg-white border-mono-border text-mono-text-muted hover:bg-mono-bg'}`}
                                 >
                                    {method}
                                 </button>
                              ))}
                           </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Notes (Optional)</label>
                           <input
                              type="text"
                              placeholder="e.g. Cleared past dues"
                              value={paymentNotes}
                              onChange={e => setPaymentNotes(e.target.value)}
                              className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all"
                           />
                        </div>
                        <button disabled={isLoading} type="submit" className="w-full bg-mono-text text-white font-bold py-4 rounded-card mt-2 active:scale-95 transition-all shadow-sm disabled:opacity-50">
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
