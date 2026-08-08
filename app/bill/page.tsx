"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import {
   AlertCircle, Share2, Check, RefreshCw, Smartphone,
   CheckCircle2, Copy, ArrowLeft, MapPin, Phone,
   Receipt, Calendar, List, Clock, X, ChevronLeft, ChevronRight,
   ChevronUp, ChevronDown, Globe, MessageCircle
} from "lucide-react";

const InstagramIcon = ({ size = 24, className = "" }: { size?: number | string, className?: string }) => (
   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
   </svg>
);
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
   const [expandedDates, setExpandedDates] = useState<string[]>([]);

   const toggleExpand = (dateStr: string) => {
      setExpandedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
   };

   const displayDays = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

   return (
      <div className={`min-h-dvh w-full flex font-sans relative overflow-hidden bg-black ${billData ? 'flex-col items-center justify-start' : 'flex-col md:flex-row'}`}>

         {/* Background Image */}
         <div className={`shrink-0 ${billData ? 'absolute inset-0 w-full h-full' : 'absolute inset-0 md:relative md:inset-auto md:w-4/10 md:h-dvh'}`}>
            <Image
               src="/assets/bg-landscape.png"
               alt="Landscape Background"
               fill
               sizes="(max-width: 768px) 100vw, 40vw"
               className="object-cover opacity-80 pointer-events-none"
               priority
            />

            {/* Header / Logo / Socials */}
            <AnimatePresence>
               {!billData && (
                  <motion.div
                     initial={{ opacity: 0, y: -20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     className="absolute inset-x-0 top-12 px-6 sm:px-12 z-10 flex justify-between items-center"
                  >
                     <Image
                        src="/assets/logo.svg"
                        alt="Milkow Logo"
                        width={125}
                        height={40}
                        className="object-contain "
                        priority
                     />

                     {/* Mobile Social Icons & Developer Credit (Hidden on lg) */}
                     <div className="flex lg:hidden flex-col items-end">
                        <div className="flex items-center gap-2 text-white/90">
                           <a href="https://www.instagram.com/milkow_fresh" className="bg-white/20 backdrop-blur-sm rounded-full h-12 w-12 flex justify-center items-center border border-mono-border/20 hover:text-white hover:scale-110 transition-all drop-shadow-md">
                              <InstagramIcon size={20} />
                           </a>
                           <a href="https://www.milkow.in" className="bg-white/20 backdrop-blur-sm rounded-full h-12 w-12 flex justify-center items-center border border-mono-border/20 hover:text-white hover:scale-110 transition-all drop-shadow-md">
                              <Globe size={20} />
                           </a>
                           <a href="tel:+918113033322" className="bg-white/20 backdrop-blur-sm rounded-full h-12 w-12 flex justify-center items-center border border-mono-border/20 hover:text-white hover:scale-110 transition-all drop-shadow-md">
                              <Phone size={20} />
                           </a>
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* Desktop Bottom-Left Socials & Developer Credit (Visible only on lg+) */}
            <AnimatePresence>
               {!billData && (
                  <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 20 }}
                     className="hidden lg:flex absolute bottom-12 left-12 z-10 flex-col gap-4"
                  >
                     <div className="flex items-center gap-4 text-white/90">
                        <a href="https://www.instagram.com/milkow_fresh" className="bg-white/20 backdrop-blur-sm rounded-full h-14 w-14 flex justify-center items-center border border-mono-border/20 hover:text-white hover:scale-110 transition-all drop-shadow-md">
                           <InstagramIcon size={24} />
                        </a>
                        <a href="https://www.milkow.in" className="bg-white/20 backdrop-blur-sm rounded-full h-14 w-14 flex justify-center items-center border border-mono-border/20 hover:text-white hover:scale-110 transition-all drop-shadow-md">
                           <Globe size={24} />
                        </a>
                        <a href="tel:+918113033322" className="bg-white/20 backdrop-blur-sm rounded-full h-14 w-14 flex justify-center items-center border border-mono-border/20 hover:text-white hover:scale-110 transition-all drop-shadow-md">
                           <Phone size={24} />
                        </a>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>

         {/* Form and Ledger Details Container */}
         <div className={`z-20 ${billData ? 'w-full absolute bottom-0 pointer-events-none flex flex-col justify-end' : 'w-full md:w-6/10 md:h-dvh absolute inset-0 md:relative md:inset-auto pointer-events-none md:pointer-events-auto flex flex-col justify-end md:justify-start'}`}>
            <AnimatePresence mode="wait">
               {!billData ? (
                  /* ================= SEARCH FORM STATE ================= */
                  <motion.div
                     key="search-form"
                     initial={{ y: "100%" }}
                     animate={{ y: 0 }}
                     exit={{ y: "100%", opacity: 0 }}
                     transition={{ type: "spring", damping: 25, stiffness: 200 }}
                     className="w-full bg-white rounded-tr-[3.5rem] md:rounded-none px-8 py-2 sm:p-12 shadow-[0_-20px_40px_rgba(0,0,0,0.15)] md:shadow-none flex flex-col md:h-full md:justify-center pointer-events-auto overflow-y-auto"
                  >
                     <div className="w-full max-w-xl mx-auto flex flex-col h-full md:justify-center py-4">


                        <div className="mb-8 md:mb-12">
                           <h1 className=" text-4xl md:text-5xl  font-bold text-mono-text tracking-tight mb-1 md:mb-4">Invoice.</h1>
                           <p className="text-mono-text-muted text-[15px] leading-relaxed max-w-sm">
                              Enter your registered mobile number to view your delivery history, payments, and dues.
                           </p>
                        </div>

                        <form onSubmit={handleSearch} className="flex flex-col gap-2">
                           <div className="flex flex-col gap-2 relative">
                              <div className="relative flex items-center bg-white border border-gray-300 rounded-[1.25rem] h-18 group focus-within:border-[#1a3c28] focus-within:ring-2 focus-within:ring-[#1a3c28]/20 transition-all">
                                 <div className="absolute left-6 text-mono-text flex items-center">
                                    <span className="text-md font-bold pr-5 border-r border-gray-200/50 mr-4">+91</span>
                                 </div>
                                 <input
                                    type="tel"
                                    pattern="[0-9]*"
                                    inputMode="numeric"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    className="w-full text-md bg-transparent h-full pl-26 pr-6 text-lg font-bold text-mono-text focus:outline-none placeholder:text-gray-400 placeholder:font-bold"
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
                                    className="bg-rose-50 text-rose-600 px-5 py-4 rounded-2xl text-sm font-bold flex items-start gap-3 overflow-hidden"
                                 >
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{error}</span>
                                 </motion.div>
                              )}
                           </AnimatePresence>

                           <button
                              type="submit"
                              disabled={isLoading || phone.length < 10}
                              className="w-full bg-mono-text hover:bg-green-950 text-white font-bold h-18 rounded-[1.25rem] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer text-[17px] mt-2 relative overflow-hidden"
                           >
                              {isLoading ? (
                                 <>
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                    Loading...
                                 </>
                              ) : (
                                 <>
                                    <div className="absolute left-3 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                       <ArrowLeft size={20} className="rotate-180" />
                                    </div>
                                    Continue
                                 </>
                              )}
                           </button>
                        </form>

                        {/* Feature Highlights Row */}
                        <div className="flex items-center justify-between mt-4 mb-2 rounded-sm border border-mono-surface p-4">
                           <div className="flex items-center gap-3">
                              <div className="text-mono-text">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[13px] font-bold text-mono-text leading-tight">View</span>
                                 <span className="text-[11px] text-mono-text-muted leading-tight">Invoices</span>
                              </div>
                           </div>
                           <div className="h-8 w-px bg-gray-200"></div>
                           <div className="flex items-center gap-3">
                              <div className="text-mono-text">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[13px] font-bold text-mono-text leading-tight">Check</span>
                                 <span className="text-[11px] text-mono-text-muted leading-tight">Payments</span>
                              </div>
                           </div>
                           <div className="h-8 w-px bg-gray-200"></div>
                           <div className="flex items-center gap-3">
                              <div className="text-mono-text">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[13px] font-bold text-mono-text leading-tight">Track</span>
                                 <span className="text-[11px] text-mono-text-muted leading-tight">Dues</span>
                              </div>
                           </div>
                        </div>

                        <div className="mt-6 mb-2 sm:mb-4 flex justify-center">
                           <p className="text-[10px] sm:text-[11px] text-mono-text-disabled font-medium tracking-wide">Developed by <a href="https://shihabsaleem.site" className="text-mono-text">Shihab Saleem</a></p>
                        </div>
                     </div>
                  </motion.div>
               ) : (
                  /* ================= FULL LEDGER STATE ================= */
                  <motion.div
                     key="ledger-details"
                     initial={{ y: "100%" }}
                     animate={{ y: 0 }}
                     exit={{ y: "100%" }}
                     transition={{ type: "spring", damping: 25, stiffness: 200 }}
                     className="w-full bg-mono-bg rounded-t-xl shadow-[0_-20px_40px_rgba(0,0,0,0.15)] flex flex-col h-[90vh] pointer-events-auto"
                  >
                     {/* Draggable Handle Indicator (Mobile Only) */}
                     <div className="w-full flex md:hidden justify-center pt-4 pb-2">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                     </div>

                     {/* Profile Card Header */}
                     <div className="bg-white px-6 pb-6 pt-4 md:pt-8 rounded-t-md relative shrink-0">
                        <div className="flex items-start justify-between mb-6">
                           <div className="flex items-center gap-4 sm:gap-5">
                              <button onClick={handleReset} className="h-10 w-10 shrink-0 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-all active:scale-95">
                                 <ArrowLeft size={18} />
                              </button>
                              <div className="flex flex-col gap-1">
                                 <h2 className="text-2xl font-semibold text-mono-text tracking-tight leading-none">{billData.customer.name}</h2>
                                 <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1 text-mono-text-muted text-xs font-bold"><MapPin size={12} /> {billData.customer.area_name || 'No Area'}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                    <span className="flex items-center gap-1 text-mono-text-muted text-xs font-bold"><Phone size={12} /> {billData.customer.phone}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                           <div className="bg-gray-100 rounded-2xl p-4 sm:p-5 border border-gray-200/50">
                              <div className="flex items-center gap-1.5 text-mono-text-muted text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-2">
                                 <Clock size={14} /> Frequency
                              </div>
                              <p className="text-sm sm:text-base font-bold text-mono-text">{billData.customer.frequency}</p>
                           </div>
                           <div className={`rounded-2xl p-4 sm:p-5 border ${billData.financials.account_status === 'Advance' ? 'bg-emerald-50 border-emerald-200' : 'bg-[#111] border-black'}`}>
                              <div className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-2 ${billData.financials.account_status === 'Advance' ? 'text-emerald-700' : 'text-gray-400'}`}>
                                 <Receipt size={14} /> {billData.financials.account_status === 'Advance' ? 'Advance' : 'Total Payable'}
                              </div>
                              <p className={`text-lg sm:text-xl font-bold ${billData.financials.account_status === 'Advance' ? 'text-emerald-900' : 'text-white'}`}>
                                 ₹{Math.abs(billData.financials.current_balance).toFixed(2)}
                              </p>
                           </div>
                        </div>
                     </div>

                     <div className="px-6 bg-white shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.02)] z-10 pb-2">
                        <div className="flex relative gap-2 py-1 overflow-x-auto hide-scrollbar scroll-smooth">
                           <button onClick={() => setActiveTab('calendar')} className={`relative flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap ${activeTab === 'calendar' ? 'bg-black text-white shadow-md' : 'bg-transparent text-mono-text-muted hover:bg-gray-100'}`}>
                              Deliveries
                           </button>
                           <button onClick={() => setActiveTab('statement')} className={`relative flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap ${activeTab === 'statement' ? 'bg-black text-white shadow-md' : 'bg-transparent text-mono-text-muted hover:bg-gray-100'}`}>
                              Payments
                           </button>
                           <button onClick={() => setActiveTab('pay')} className={`relative flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 rounded-xl whitespace-nowrap ml-auto ${activeTab === 'pay' ? 'bg-emerald-500 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                              Pay Now
                           </button>
                        </div>
                     </div>

                     {/* TABS CONTENT */}
                     <div className="flex-1 overflow-y-auto bg-mono-bg">
                        <AnimatePresence mode="wait">
                           {activeTab === 'calendar' && (
                              <motion.div key="calendar" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="w-full">
                                 <div className="w-full px-4 sm:px-6 py-6 pb-24">
                                    <div className="flex items-center justify-between gap-4 mb-6">
                                       <h3 className="text-xl font-semibold text-mono-text tracking-tight">Delivery History</h3>
                                       <div className="flex items-center gap-2 bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                          <span className="text-[10px] font-bold uppercase tracking-widest">{filteredDeliveries.filter(d => d.delivered).length} Deliveries</span>
                                       </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                                       <button onClick={() => changeMonth(-1)} className="p-3 rounded-xl bg-gray-100 text-mono-text hover:bg-gray-200 transition-all">
                                          <ChevronLeft size={18} />
                                       </button>
                                       <p className="text-sm font-bold text-mono-text uppercase tracking-widest text-center flex-1">
                                          {monthName} {yearName}
                                       </p>
                                       <button onClick={() => changeMonth(1)} className="p-3 rounded-xl bg-gray-100 text-mono-text hover:bg-gray-200 transition-all">
                                          <ChevronRight size={18} />
                                       </button>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                       {Array.from({ length: displayDays }).map((_, i) => {
                                          const day = i + 1;
                                          const dateStr = `${yearName}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                          const dayDeliveries = filteredDeliveries.filter(d => d.delivery_date === dateStr);

                                          if (dayDeliveries.length === 0) {
                                             return (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50/50 transition-all opacity-80">
                                                   <div className="flex items-center gap-4 overflow-hidden">
                                                      <div className="h-12 w-12 shrink-0 rounded-xl flex flex-col items-center justify-center font-bold bg-white text-gray-400 border border-gray-200 shadow-sm">
                                                         <span className="text-[9px] uppercase leading-none mb-0.5 font-bold">{monthName.slice(0, 3)}</span>
                                                         <span className="text-base leading-none">{day}</span>
                                                      </div>
                                                      <p className="text-xs font-bold text-gray-400 tracking-wide">No delivery</p>
                                                   </div>
                                                </div>
                                             );
                                          }

                                          const dayTotal = dayDeliveries.filter(d => d.delivered).reduce((sum, d) => sum + calculateDeliveryTotal(d), 0);

                                          return (
                                             <div key={i} className="flex flex-col p-4 sm:p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => toggleExpand(dateStr)}>
                                                <div className="flex items-center justify-between">
                                                   <div className="flex items-center gap-4 sm:gap-5 overflow-hidden">
                                                      <div className="h-12 w-12 shrink-0 rounded-xl flex flex-col items-center justify-center font-bold bg-black text-white shadow-md">
                                                         <span className="text-[9px] uppercase leading-none mb-0.5 font-bold opacity-80">{monthName.slice(0, 3)}</span>
                                                         <span className="text-base leading-none">{day}</span>
                                                      </div>
                                                      <div className="flex flex-col justify-center h-12">
                                                         {!expandedDates.includes(dateStr) ? (
                                                            <p className="text-xs font-medium text-mono-text flex items-center transition-all">
                                                               {dayDeliveries.filter(d => d.delivered).length === 0
                                                                  ? 'No delivery'
                                                                  : `${dayDeliveries.filter(d => d.delivered).length} ${dayDeliveries.filter(d => d.delivered).length === 1 ? 'Delivery' : 'Deliveries'}`}
                                                               <ChevronDown size={16} className="ml-1.5 opacity-70" />
                                                            </p>
                                                         ) : (
                                                            <p className="text-xs font-medium text-mono-text flex items-center transition-all">
                                                               Details
                                                               <ChevronUp size={16} className="ml-1.5 opacity-70" />
                                                            </p>
                                                         )}
                                                      </div>
                                                   </div>
                                                   <div className="text-right shrink-0 ml-3 flex flex-col justify-center h-12">
                                                      <p className="font-semibold text-base sm:text-lg text-black">₹{dayTotal.toFixed(0)}</p>
                                                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Total</p>
                                                   </div>
                                                </div>

                                                <AnimatePresence>
                                                   {expandedDates.includes(dateStr) && (
                                                      <motion.div
                                                         initial={{ height: 0, opacity: 0 }}
                                                         animate={{ height: "auto", opacity: 1 }}
                                                         exit={{ height: 0, opacity: 0 }}
                                                         className="overflow-hidden"
                                                      >
                                                         <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col gap-2 pl-16 sm:pl-17">
                                                            {dayDeliveries.map((delivery, dIdx) => (
                                                               <div key={dIdx} className={`flex flex-col gap-1.5 ${dIdx > 0 ? "pt-2.5 border-t border-gray-50" : ""}`}>
                                                                  <p className="font-bold text-sm text-black leading-tight">
                                                                     {[
                                                                        delivery.milk_qty > 0 ? `${delivery.milk_qty} Milk` : null,
                                                                        ...(delivery.misc_items as any[] || []).map((m: any) => `${m.qty} ${m.name}`)
                                                                     ].filter(Boolean).join(' + ')}
                                                                  </p>
                                                                  <div className="flex items-center gap-2">
                                                                     <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${delivery.shift === 'Morning Only' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>{delivery.shift === 'Morning Only' ? 'AM' : 'PM'}</span>
                                                                     {delivery.delivered ? (
                                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">Delivered</span>
                                                                     ) : (() => {
                                                                        const now = new Date();
                                                                        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                                                        const isPast = delivery.delivery_date < today;
                                                                        const isToday = delivery.delivery_date === today;
                                                                        const hour = now.getHours();
                                                                        const isShiftOver = (delivery.shift === 'Morning Only' && hour >= 12) || (delivery.shift === 'Evening Only' && hour >= 22);
                                                                        if (isPast || (isToday && isShiftOver)) {
                                                                           return <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md text-[9px] border border-rose-200 font-bold uppercase tracking-wider">Undelivered</span>;
                                                                        }
                                                                        return <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md text-[9px] border border-orange-200 font-bold uppercase tracking-wider">Pending</span>;
                                                                     })()}
                                                                  </div>
                                                               </div>
                                                            ))}
                                                         </div>
                                                      </motion.div>
                                                   )}
                                                </AnimatePresence>
                                             </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              </motion.div>
                           )}
                           {activeTab === 'statement' && (
                              <motion.div key="statement" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="w-full">
                                 <div className="w-full px-4 sm:px-6 py-6 pb-24">
                                    <div className="flex items-center justify-between mb-6">
                                       <h3 className="text-xl font-semibold text-mono-text tracking-tight">Payment History</h3>
                                       <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-white text-gray-600 rounded-lg border border-gray-200 shadow-sm">{billData.payments.length} Records</span>
                                    </div>
                                    {billData.payments.length === 0 ? (
                                       <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-3 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                                          <Receipt size={32} className="opacity-50" />
                                          <div className="text-center">
                                             <p className="font-bold text-gray-600">No payment history</p>
                                             <p className="text-[11px] uppercase tracking-widest mt-1">All payments will appear here</p>
                                          </div>
                                       </div>
                                    ) : (
                                       <div className="flex flex-col gap-3">
                                          {billData.payments.map((p, i) => {
                                             const d = new Date(p.payment_date);
                                             const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                             const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                             return (
                                                <div key={i} className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all">
                                                   <div className="flex items-center gap-4">
                                                      <div className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                         <Receipt size={20} />
                                                      </div>
                                                      <div>
                                                         <p className="font-bold text-sm sm:text-base text-mono-text">{dateStr}</p>
                                                         <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-bold text-gray-400">{timeStr}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{(p as any).method || 'Cash'}</span>
                                                         </div>
                                                      </div>
                                                   </div>
                                                   <div className="text-right shrink-0 ml-3">
                                                      <p className="font-semibold text-base sm:text-lg text-emerald-600">+₹{Number(p.amount).toFixed(2)}</p>
                                                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Received</p>
                                                   </div>
                                                </div>
                                             );
                                          })}
                                       </div>
                                    )}
                                 </div>
                              </motion.div>
                           )}
                           {activeTab === 'pay' && (
                              <motion.div key="pay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="w-full">
                                 <div className="w-full px-4 sm:px-6 py-6 pb-24">
                                    {billData.financials.current_balance <= 0 ? (
                                       <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center relative overflow-hidden">
                                          <div className="absolute inset-0 bg-emerald-50/50 pointer-events-none" />
                                          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 relative z-10">
                                             <CheckCircle2 size={32} />
                                          </div>
                                          <h2 className="text-2xl font-semibold text-mono-text tracking-tight relative z-10">All Dues Cleared</h2>
                                          <p className="text-sm text-mono-text-muted leading-relaxed mt-3 px-4 relative z-10 font-medium">
                                             {billData.financials.current_balance < 0 ?
                                                `You have an advance balance of ₹${Math.abs(billData.financials.current_balance).toFixed(2)}. No payment is required at this time.` :
                                                "Your account is fully settled. Thank you for your support!"}
                                          </p>
                                       </div>
                                    ) : (
                                       <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                                          <div className="text-center pb-8 border-b border-gray-100">
                                             <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Total Payable</p>
                                             <h2 className="text-5xl sm:text-6xl font-semibold text-mono-text tracking-tighter">
                                                ₹{billData.financials.current_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                             </h2>
                                          </div>

                                          <div className="flex flex-col items-center bg-gray-50 rounded-3xl py-8 mt-8 border border-gray-100">
                                             <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 relative group transition-transform hover:scale-105 duration-300">
                                                <QRCodeCanvas
                                                   value={getUpiLink()}
                                                   size={180}
                                                   includeMargin={false}
                                                   level="H"
                                                   // image Settings removed — embedded icon excavates QR modules
                                                   // and can cause UPI app scan failures
                                                   // imageSettings={{
                                                   //    src: "/assets/icon.svg",
                                                   //    x: undefined,
                                                   //    y: undefined,
                                                   //    height: 36,
                                                   //    width: 36,
                                                   //    excavate: true,
                                                   // }}
                                                />
                                             </div>

                                             <div className="mt-6 text-center">
                                                <p className="text-sm font-bold text-mono-text">{billData.settings.payment?.payee_name || "Milkow Distributor"}</p>
                                                <p className="text-[10px] font-bold tracking-widest uppercase mt-1.5 text-gray-400 flex items-center justify-center gap-1.5"><Smartphone size={12} /> Scan with any UPI App</p>
                                             </div>
                                          </div>

                                          <div className="w-full mt-8 flex flex-col gap-3.5">
                                             <a
                                                href={getUpiLink()}
                                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-16 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-base"
                                             >
                                                <Smartphone size={20} />
                                                Pay via UPI App
                                             </a>

                                             <div className="flex gap-3">
                                                <button
                                                   onClick={copyUpiId}
                                                   className="flex-1 bg-gray-100 hover:bg-gray-200 text-mono-text font-bold h-14 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                                                >
                                                   {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                                   {copied ? "Copied UPI ID!" : "Copy UPI ID"}
                                                </button>

                                                <button
                                                   onClick={shareBillLink}
                                                   className="flex-1 bg-gray-100 hover:bg-gray-200 text-mono-text font-bold h-14 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                                                >
                                                   <Share2 size={16} />
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
                        <div className="mt-8 mb-4 flex justify-center">
                           <p className="text-[10px] sm:text-[11px] text-mono-text-disabled font-medium tracking-wide">Developed by <a href="https://shihabsaleem.site" className="text-mono-text">Shihab Saleem</a></p>
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>
   );
}
