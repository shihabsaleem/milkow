"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { 
  AlertCircle, Share2, Check, RefreshCw, Smartphone, 
  CheckCircle2, Copy, ArrowLeft, MapPin, Phone, 
  Receipt, Calendar, List, Clock, X 
} from "lucide-react";
import Image from "next/image";
import { usePublicBillLogic } from "@/hooks/usePublicBillLogic";

export default function PublicBillPage({ initialPhone }: { initialPhone?: string } = {}) {
  const {
    phone,
    isLoading,
    error,
    billData,
    copied,
    viewDate,
    monthName,
    yearName,
    filteredDeliveries,
    handlePhoneChange,
    handleSearch,
    handleReset,
    copyUpiId,
    shareBillLink,
    getUpiLink,
    changeMonth,
    calculateDeliveryTotal
  } = usePublicBillLogic(initialPhone);

  const [activeTab, setActiveTab] = useState<'calendar' | 'statement' | 'pay'>('calendar');

  const displayDays = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

  return (
    <div className="min-h-dvh w-full bg-mono-bg/50 text-mono-text flex flex-col items-center justify-start sm:p-6 font-sans relative">
      
      {/* Header */}
      {!billData && (
         <header className="w-full max-w-md flex justify-end items-center z-10 p-4 sm:px-0">
           <span className="text-[9px] font-bold text-mono-text-disabled uppercase tracking-widest bg-mono-surface border border-mono-border/50 px-2.5 py-1 rounded-full">
             Client Portal
           </span>
         </header>
      )}

      {/* Main Container */}
      <main className="w-full max-w-2xl flex flex-col z-10 h-full">
        
        {/* Brand Logo */}
        {!billData && (
          <div className="flex flex-col items-center mb-6 mt-12 sm:mt-24">
            <Image
              src="/assets/logo.svg"
              alt="Milkow Logo"
              width={120}
              height={32}
              className="object-contain w-[120px] h-auto mb-1"
              priority
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!billData ? (
            /* ================= SEARCH FORM STATE ================= */
            <motion.div
              key="search-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-4xl p-8 border border-mono-border/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] mx-4 sm:mx-auto max-w-md w-full"
            >
              <div className="text-center mb-6">
                <h1 className="text-xl font-semibold text-mono-text tracking-tight">View Your Ledger</h1>
                <p className="text-xs text-mono-text-muted mt-2 leading-relaxed">
                  Enter your registered mobile number to fetch your balance, history, and payment link.
                </p>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 relative">
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-mono-text-disabled flex items-center">
                      <span className="text-xs font-bold mr-1.5">+91</span>
                      <div className="w-px h-3.5 bg-mono-border mr-1.5" />
                    </div>
                    <input
                      type="tel"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-mono-bg/50 border border-mono-border hover:border-mono-border focus:border-mono-text focus:bg-white rounded-card pl-16 pr-4 py-3.5 text-sm font-semibold text-mono-text focus:outline-none transition-all placeholder:text-mono-text-disabled"
                      placeholder="Mobile number"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-mono-surface border border-rose-100 text-rose-600 px-4 py-3 rounded-card text-xs font-bold flex items-start gap-2 overflow-hidden"
                    >
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoading || phone.length < 10}
                  className="w-full bg-mono-text hover:bg-mono-text/80 text-white font-bold py-3.5 rounded-card transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-1 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Search Profile
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* ================= FULL LEDGER STATE ================= */
            <motion.div
              key="ledger-details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col w-full h-full sm:h-auto"
            >
              {/* Profile Card Header */}
              <div className="bg-white sm:rounded-hero sm:shadow-sm sm:border border-mono-border/50 relative overflow-hidden sm:mx-auto max-w-2xl w-full">
                 <div className="px-6 pb-4 pt-6 sm:pt-6">
                    <div className="flex items-start justify-between mb-6">
                       <div className="flex items-center gap-4">
                          <button onClick={handleReset} className="h-10 w-10 shrink-0 bg-mono-bg hover:bg-mono-surface rounded-full flex items-center justify-center text-mono-text-muted border border-mono-border/50 transition-colors">
                             <ArrowLeft size={16} />
                          </button>
                          <div className="flex flex-col gap-1">
                             <h2 className="text-xl font-semibold text-mono-text tracking-tight leading-none">{billData.customer.name}</h2>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1 text-mono-text-muted text-[11px] font-medium"><MapPin size={10} className="text-mono-text-disabled" /> {billData.customer.area_name || 'No Area'}</span>
                                <span className="w-1 h-1 rounded-full bg-mono-border" />
                                <span className="flex items-center gap-1 text-mono-text-muted text-[11px] font-medium"><Phone size={10} className="text-mono-text-disabled" /> {billData.customer.phone}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                       <div className="bg-mono-bg rounded-card p-3 sm:p-4 border border-mono-divider">
                          <div className="flex items-center gap-1.5 text-mono-text-disabled text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 sm:mb-2">
                             <Clock size={12} /> Frequency
                          </div>
                          <p className="text-[13px] sm:text-sm font-bold text-mono-text">{billData.customer.frequency}</p>
                       </div>
                       <div className={`rounded-card p-3 sm:p-4 border ${billData.financials.account_status === 'Advance' ? 'bg-mono-surface border-emerald-100' : 'bg-mono-text/5 border-mono-border'}`}>
                          <div className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 sm:mb-2 opacity-80 ${billData.financials.account_status === 'Advance' ? 'text-mono-text' : 'text-mono-text'}`}>
                             <Receipt size={12} /> {billData.financials.account_status === 'Advance' ? 'Advance' : 'Total Payable'}
                          </div>
                          <p className={`text-[13px] sm:text-sm font-bold ${billData.financials.account_status === 'Advance' ? 'text-mono-text' : 'text-mono-text'}`}>
                             ₹{Math.abs(billData.financials.current_balance).toFixed(2)}
                          </p>
                       </div>
                    </div>
                 </div>
                 <div className="px-6 border-t border-mono-divider bg-white">
                    <div className="flex relative gap-2 py-2 overflow-x-auto hide-scrollbar">
                     <button onClick={() => setActiveTab('calendar')} className={`relative flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors rounded-full ${activeTab === 'calendar' ? 'bg-mono-text text-white' : 'bg-mono-bg text-mono-text-muted hover:bg-mono-surface border border-mono-border'}`}>
                        Deliveries
                     </button>
                     <button onClick={() => setActiveTab('statement')} className={`relative flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors rounded-full ${activeTab === 'statement' ? 'bg-mono-text text-white' : 'bg-mono-bg text-mono-text-muted hover:bg-mono-surface border border-mono-border'}`}>
                        Payments
                     </button>
                     <button onClick={() => setActiveTab('pay')} className={`relative flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors rounded-full ml-auto ${activeTab === 'pay' ? 'bg-success text-white border border-emerald-700' : 'bg-mono-surface text-mono-text hover:bg-emerald-100 border border-mono-text'}`}>
                        Pay Now
                     </button>
                  </div>
               </div>
              </div>

               {/* TABS CONTENT */}
               <AnimatePresence mode="wait">
               {activeTab === 'calendar' && (
               <motion.div key="calendar" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto">
               <div className="max-w-2xl mx-auto w-full px-4 sm:px-0 py-4 sm:py-6">
                  <div className="bg-white rounded-hero p-5 sm:p-8 shadow-sm border border-mono-border/60">
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div><h3 className="text-lg font-semibold text-mono-text">Delivery History</h3><div className="flex items-center gap-2 mt-1.5"><button onClick={() => changeMonth(-1)} className="p-1 rounded-md text-mono-text-disabled hover:bg-mono-surface border border-mono-border"><ArrowLeft size={12} /></button><p className="text-[10px] font-bold text-mono-text uppercase tracking-widest px-2">{monthName} {yearName}</p><button onClick={() => changeMonth(1)} className="p-1 rounded-md text-mono-text-disabled hover:bg-mono-surface border border-mono-border"><ArrowLeft size={12} className="rotate-180" /></button></div></div>
                        <div className="flex items-center gap-2 bg-mono-bg text-mono-text-muted px-3 py-1.5 rounded-card border border-mono-border"><span className="text-[9px] font-bold uppercase tracking-widest">{filteredDeliveries.filter(d => d.delivered).length} Deliveries</span></div>
                     </div>
                     <div className="flex flex-col gap-3">
                        {Array.from({ length: displayDays }).map((_, i) => {
                           const day = i + 1;
                           const dateStr = `${yearName}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                           const dayDeliveries = filteredDeliveries.filter(d => d.delivery_date === dateStr);

                           if (dayDeliveries.length === 0) {
                              return (
                                 <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-card border transition-all bg-mono-bg/30 border-mono-divider/50 opacity-40">
                                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                       <div className="h-10 w-10 shrink-0 rounded-card flex flex-col items-center justify-center font-bold bg-mono-surface text-mono-text-disabled">
                                          <span className="text-[8px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                          <span className="text-sm leading-none">{day}</span>
                                       </div>
                                       <p className="text-[11px] sm:text-xs font-bold text-mono-text-disabled italic tracking-tight">No delivery</p>
                                    </div>
                                 </div>
                              );
                           }

                           const dayTotal = dayDeliveries.filter(d => d.delivered).reduce((sum, d) => sum + calculateDeliveryTotal(d), 0);

                           return (
                              <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-card border transition-all bg-white border-mono-border">
                                 <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                    <div className="h-10 w-10 shrink-0 rounded-card flex flex-col items-center justify-center font-bold bg-mono-text/5 text-mono-text border border-mono-border">
                                       <span className="text-[8px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                       <span className="text-sm leading-none">{day}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                       {dayDeliveries.map((delivery, dIdx) => (
                                          <div key={dIdx} className={`flex flex-col gap-1 ${dIdx > 0 ? "pt-2 border-t border-mono-divider" : ""}`}>
                                             <p className="font-bold text-[12px] sm:text-[13px] text-mono-text leading-tight">
                                                {[
                                                   delivery.milk_qty > 0 ? `${delivery.milk_qty} Milk` : null,
                                                   ...(delivery.misc_items as any[] || []).map((m: any) => `${m.qty} ${m.name}`)
                                                ].filter(Boolean).join(' + ')}
                                             </p>
                                             <div className="flex items-center gap-1.5">
                                                <span className={`px-1 py-0.5 rounded text-[7px] border font-bold shrink-0 ${delivery.shift === 'Morning Only' ? 'bg-amber-50 text-mono-text border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>{delivery.shift === 'Morning Only' ? 'AM' : 'PM'}</span>
                                                {delivery.delivered ? (
                                                   <span className="bg-mono-surface text-mono-text px-1.5 py-0.5 rounded text-[7px] border border-mono-text font-bold uppercase tracking-tighter">Delivered</span>
                                                ) : (() => {
                                                   const now = new Date();
                                                   const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                                   const isPast = delivery.delivery_date < today;
                                                   const isToday = delivery.delivery_date === today;
                                                   const hour = now.getHours();
                                                   const isShiftOver = (delivery.shift === 'Morning Only' && hour >= 12) || (delivery.shift === 'Evening Only' && hour >= 22);
                                                   if (isPast || (isToday && isShiftOver)) {
                                                      return <span className="bg-mono-surface text-rose-600 px-1.5 py-0.5 rounded text-[7px] border border-rose-200 font-bold uppercase tracking-tighter">Undelivered</span>;
                                                   }
                                                   return <span className="bg-mono-surface text-mono-text-disabled px-1.5 py-0.5 rounded text-[7px] border border-mono-border font-bold uppercase tracking-tighter">Pending</span>;
                                                })()}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="text-right shrink-0 ml-2">
                                    <p className="font-bold text-[13px] sm:text-sm text-mono-text">₹{dayTotal.toFixed(0)}</p>
                                    <p className="text-[8px] sm:text-[9px] font-bold text-mono-text-disabled uppercase">Total</p>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
               </motion.div>
               )}
               {activeTab === 'statement' && (
               <motion.div key="statement" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto">
               <div className="max-w-2xl mx-auto w-full px-4 sm:px-0 py-4 sm:py-6">
                  <div className="bg-white rounded-hero p-5 sm:p-8 shadow-sm border border-mono-border/60">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-mono-text">Payment History</h3>
                        <span className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-mono-bg text-mono-text-muted rounded-card border border-mono-border">{billData.payments.length} Records</span>
                     </div>
                     {billData.payments.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-mono-text-disabled gap-2 bg-mono-bg rounded-hero border-2 border-dashed border-mono-border">
                           <p className="font-bold">No payments found</p>
                           <p className="text-[10px] uppercase tracking-widest">All payments will appear here</p>
                        </div>
                     ) : (
                        <div className="flex flex-col gap-3">
                           {billData.payments.map((p, i) => {
                              const d = new Date(p.payment_date);
                              const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                              const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                              return (
                                 <div key={i} className="flex items-center justify-between p-4 rounded-card border bg-white border-mono-border">
                                    <div className="flex items-center gap-3">
                                       <div className="h-10 w-10 shrink-0 rounded-card flex items-center justify-center bg-mono-surface text-mono-text border border-emerald-100">
                                          <Receipt size={16} />
                                       </div>
                                       <div>
                                          <p className="font-bold text-[12px] sm:text-[13px] text-mono-text">{dateStr}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                             <span className="text-[9px] font-bold text-mono-text-disabled">{timeStr}</span>
                                             <span className="w-1 h-1 rounded-full bg-mono-border" />
                                             <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-mono-surface text-mono-text-muted">{(p as any).method || 'Cash'}</span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                       <p className="font-bold text-[13px] sm:text-sm text-mono-text">+₹{Number(p.amount).toFixed(2)}</p>
                                       <p className="text-[8px] font-bold text-mono-text-disabled uppercase">Received</p>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               </div>
               </motion.div>
               )}
               {activeTab === 'pay' && (
               <motion.div key="pay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto">
               <div className="max-w-2xl mx-auto w-full px-4 sm:px-0 py-4 sm:py-6">
                  {billData.financials.current_balance <= 0 ? (
                     <div className="bg-white rounded-hero p-8 border border-mono-text/80 shadow-sm text-center">
                        <div className="w-12 h-12 rounded-full bg-mono-surface border border-emerald-100 text-mono-text flex items-center justify-center mx-auto mb-4">
                           <CheckCircle2 size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-mono-text tracking-tight">Account Settled</h2>
                        <p className="text-xs text-mono-text-muted leading-relaxed mt-2 px-4">
                           {billData.financials.current_balance < 0 ? 
                              `You have an advance credit of ₹${Math.abs(billData.financials.current_balance).toFixed(2)} with us. No payment is required.` : 
                              "No outstanding balance. Thank you for your support!"}
                        </p>
                     </div>
                  ) : (
                     <div className="bg-white rounded-hero p-6 sm:p-8 border border-mono-border/60 shadow-sm">
                        <div className="text-center pb-6">
                           <p className="text-[10px] font-bold uppercase tracking-widest text-mono-text-disabled">Total Payable</p>
                           <h2 className="text-4xl sm:text-5xl font-semibold text-mono-text mt-2 tracking-tight">
                              ₹{billData.financials.current_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                           </h2>
                        </div>
                        
                        {/* QR Code Container */}
                        <div className="flex flex-col items-center bg-mono-bg/50 rounded-hero py-6 border border-mono-border/50">
                           <div className="bg-white p-4 border border-mono-border rounded-card shadow-sm relative">
                              <QRCodeCanvas
                                 value={getUpiLink()}
                                 size={160}
                                 includeMargin={false}
                                 level="H"
                                 imageSettings={{
                                 src: "/assets/icon.svg",
                                 x: undefined,
                                 y: undefined,
                                 height: 28,
                                 width: 28,
                                 excavate: true,
                                 }}
                              />
                           </div>
                           
                           <div className="mt-4 text-center text-mono-text-muted">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-mono-text">{billData.settings.payment?.payee_name || "Milkow Distributor"}</p>
                              <p className="text-[9px] font-bold tracking-widest uppercase mt-1 text-mono-text-disabled">Scan with any UPI App</p>
                           </div>
                        </div>

                        {/* Payment Action Buttons */}
                        <div className="w-full mt-6 flex flex-col gap-3">
                           <a
                              href={getUpiLink()}
                              className="w-full bg-success hover:bg-emerald-700 text-white font-bold py-3.5 rounded-card active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-sm"
                           >
                              <Smartphone size={16} />
                              Pay via UPI App
                           </a>

                           <div className="flex gap-2">
                              <button
                                 onClick={copyUpiId}
                                 className="flex-1 bg-mono-bg hover:bg-mono-surface text-mono-text font-bold py-3.5 rounded-card border border-mono-border transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-[11px] sm:text-xs"
                              >
                                 {copied ? <Check size={14} className="text-mono-text" /> : <Copy size={14} />}
                                 {copied ? "Copied UPI ID!" : "Copy UPI ID"}
                              </button>
                              
                              <button
                                 onClick={shareBillLink}
                                 className="flex-1 bg-mono-bg hover:bg-mono-surface text-mono-text font-bold py-3.5 rounded-card border border-mono-border transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-[11px] sm:text-xs"
                              >
                                 <Share2 size={14} />
                                 Share Link
                              </button>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
               </motion.div>
               )}
               </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      {!billData && (
        <footer className="w-full text-center pb-2 z-10 mt-12">
          <p className="text-center mt-10 text-mono-text-disabled text-[10px] font-medium tracking-wide uppercase">
             &copy; 2026 Milkow &bull; <a href="https://shihabsaleem.site" target="_blank" rel="noopener noreferrer" className="hover:text-mono-text transition-colors">shihab saleem</a>
          </p>
        </footer>
      )}
    </div>
  );
}
