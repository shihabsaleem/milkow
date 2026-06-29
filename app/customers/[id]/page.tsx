"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Clock, Receipt, Trash2, Edit2, X, Camera, RotateCcw, ArrowDown, Share2, MoreVertical, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import Modal from "@/components/ui/Modal";
import * as T from "@/types/database";
import CustomSelect from "@/components/ui/CustomSelect";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useCustomerLogic } from "@/hooks/useCustomerLogic";

export default function CustomerProfilePage() {
   const params = useParams();
   const router = useRouter();
   const screenshotRef = useRef<HTMLDivElement>(null);
   const customerIdParam = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

   const {
      customer,
      financials,
      bills,
      currentDeliveriesAmount,
      billsBalance,
      deliveries,
      allUnbilledDeliveries,
      payments,
      products,
      isLoading,
      viewDate,
      areas,
      editForm,
      setEditForm,
      modalConfig,
      setModalConfig,
      fetchData,
      isCapturing,
      monthName,
      yearName,
      calculateDeliveryTotal,
      grandTotalAmount,
      toggleStatus,
      deleteCustomer,
      handleEditSubmit,
      handleMarkAsPaid,
      runRecordPayment,
      // handleRecordReturn, // Return Item disabled
      changeMonth,
      handleCaptureScreenshot,
      isSubmitting
   } = useCustomerLogic(customerIdParam, screenshotRef);

   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
   const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
   const [paymentAmount, setPaymentAmount] = useState("");
   const [paymentMethod, setPaymentMethod] = useState("Cash");
   const [paymentNotes, setPaymentNotes] = useState("");
   // const [returnAmount, setReturnAmount] = useState(""); // Return Item — commented out
   // const [returnNotes, setReturnNotes] = useState("");     // Return Item — commented out
   const [activeTab, setActiveTab] = useState<'calendar' | 'statement'>('calendar');
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const [expandedDates, setExpandedDates] = useState<string[]>([]);

   const toggleExpand = (dateStr: string) => {
      setExpandedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
   };

   const daysCount = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
   const isCurrentMonth = viewDate.getMonth() === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear();
   const displayDays = isCurrentMonth ? new Date().getDate() : daysCount;

   if (!customer && isLoading) {
      return (
         <div className="flex h-full w-full flex-col bg-mono-bg text-mono-text font-sans overflow-hidden">
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-mono-border/50">
               <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-8 h-8 bg-mono-surface rounded-full animate-pulse" />
                     <div className="flex flex-col gap-2">
                        <div className="w-32 h-4 bg-mono-surface rounded-md animate-pulse" />
                        <div className="w-20 h-3 bg-mono-surface rounded-md animate-pulse" />
                     </div>
                  </div>
               </div>
            </header>
            <main className="flex-1 overflow-y-auto">
               <div className="bg-white rounded-b-3xl shadow-sm border-b border-mono-border/50 relative overflow-hidden">
                  <div className="max-w-2xl mx-auto w-full px-6 pb-8 pt-4">
                     <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 sm:h-16 sm:w-16 bg-mono-surface rounded-card animate-pulse" />
                           <div className="flex flex-col gap-2">
                              <div className="w-40 h-5 bg-mono-surface rounded-md animate-pulse" />
                              <div className="w-32 h-4 bg-mono-surface rounded-md animate-pulse" />
                           </div>
                        </div>
                        <div className="w-16 h-6 bg-mono-surface rounded-card animate-pulse" />
                     </div>
                     <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="h-16 bg-mono-bg rounded-card animate-pulse border border-mono-divider" />
                        <div className="h-16 bg-mono-bg rounded-card animate-pulse border border-mono-divider" />
                     </div>
                  </div>
               </div>
               <div className="max-w-2xl mx-auto w-full px-5 py-8 flex flex-col gap-6">
                  <div className="h-80 bg-white border border-mono-divider rounded-hero animate-pulse" />
                  <div className="h-48 bg-white border border-mono-divider rounded-hero animate-pulse" />
               </div>
            </main>
         </div>
      );
   }

   if (!customer) {
      return (
         <div className="flex h-full w-full items-center justify-center bg-mono-bg text-mono-text-muted flex-col gap-4">
            <div className="h-16 w-16 bg-mono-surface rounded-card flex items-center justify-center text-mono-border">
               <X size={32} />
            </div>
            <div className="text-center">
               <p className="font-semibold text-mono-text">Customer not found</p>
               <p className="text-sm text-mono-text-disabled">The customer you're looking for doesn't exist.</p>
            </div>
            <button onClick={() => router.back()} className="mt-2 px-6 py-2 bg-white border border-mono-border rounded-card font-bold text-mono-text shadow-sm active:scale-95 transition-all">
               Go Back
            </button>
         </div>
      );
   }

   return (
      <PullToRefresh onRefresh={() => fetchData(true)} className="bg-mono-bg pb-16">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-mono-border/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center justify-between gap-4">
               <div className="flex items-center gap-4"><button onClick={() => router.back()} className="p-2 -ml-2 text-mono-text-muted hover:bg-mono-surface rounded-full transition-colors"><ArrowLeft size={20} /></button><div><h1 className="text-base sm:text-lg font-bold">{customer?.name || 'Customer'}</h1><p className="text-[10px] sm:text-xs text-mono-text-muted">Customer Profile</p></div></div>
               <div className="flex items-center gap-2">
                  {/*<button onClick={() => router.push(`/billing?search=${encodeURIComponent(customer?.name || '')}`)} className="flex items-center gap-2 px-4 py-2 bg-mono-text text-white rounded-card font-bold text-sm active:scale-95 transition-all shadow-md shadow-primary/20">
                     <Receipt size={16} />
                     <span className="hidden sm:inline">QR Bill</span>
                  </button>*/}
                  {/* Screenshot button — commented out (long screenshot setup disabled)
                  <button
                      onClick={handleCaptureScreenshot}
                      disabled={isCapturing}
                      className="p-2 text-mono-text-muted hover:bg-mono-surface rounded-card active:scale-90 disabled:opacity-50 transition-all"
                      title="Take Screenshot"
                   >
                      <Camera size={20} className={isCapturing ? "animate-pulse text-mono-text" : ""} />
                   </button>
                  */}
                  <div className="flex items-center gap-2 relative">
                     <button onClick={() => document.getElementById('financial-summary')?.scrollIntoView({ behavior: 'smooth' })} className="p-2 text-mono-text-muted hover:bg-mono-surface rounded-card border border-mono-border active:scale-90 transition-all" title="Financial Summary"><ArrowDown size={20} /></button>
                     <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-mono-text-muted border border-mono-border hover:bg-mono-surface rounded-card active:scale-90 transition-all"><MoreVertical size={20} /></button>

                     <AnimatePresence>
                        {isMenuOpen && (
                           <>
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40" />
                              <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute top-full right-0 mt-2 w-48 bg-white rounded-card shadow-sm border border-mono-divider z-50 overflow-hidden flex flex-col py-2">
                                 <button onClick={() => {
                                    setIsMenuOpen(false);
                                    const url = `/bill/${customer?.phone || ''}`;
                                    if (navigator.share) {
                                       navigator.share({ title: `${customer?.name || 'Customer'} Bill`, url }).catch(console.error);
                                    } else {
                                       navigator.clipboard.writeText(url);
                                       alert('Bill link copied to clipboard!');
                                    }
                                 }} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-mono-text hover:bg-mono-surface transition-colors w-full text-left">
                                    <Share2 size={18} className="text-mono-text" /> Share Bill
                                 </button>
                                 <button onClick={() => { setIsMenuOpen(false); setIsEditModalOpen(true); }} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-mono-text hover:bg-mono-bg transition-colors w-full text-left">
                                    <Edit2 size={18} className="text-mono-text" /> Edit Profile
                                 </button>
                                 <div className="h-px bg-mono-surface my-1 mx-2" />
                                 <button onClick={() => { setIsMenuOpen(false); setIsDeleteModalOpen(true); }} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-mono-text hover:bg-mono-surface transition-colors w-full text-left">
                                    <Trash2 size={18} className="text-mono-text" /> Delete Customer
                                 </button>
                              </motion.div>
                           </>
                        )}
                     </AnimatePresence>
                  </div>
               </div>
            </div>
         </header>

         <main ref={screenshotRef} className="flex flex-col">
            {isLoading ? (
               <div className="max-w-2xl mx-auto w-full px-5 py-8 flex flex-col gap-6">
                  <div className="h-48 bg-white border border-mono-divider rounded-hero animate-pulse" />
                  <div className="h-96 bg-white border border-mono-divider rounded-hero animate-pulse" />
               </div>
            ) : customer ? (
               <>
                  <div className="bg-white rounded-b-3xl shadow-sm border-b border-mono-border/50 relative overflow-hidden">
                     <div className="max-w-2xl mx-auto w-full px-6 pb-4 pt-4">
                        <div className="flex items-start justify-between mb-6">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-mono-text/10 rounded-card flex items-center justify-center text-xl sm:text-2xl font-semibold text-mono-text border border-mono-border">{customer.name.charAt(0)}</div>
                              <div className="flex flex-col gap-1">
                                 <div className="flex items-center gap-1.5 text-mono-text-muted text-[13px] sm:text-sm font-medium"><MapPin size={14} className="text-mono-text-disabled" /> {customer.area?.name || 'No Area'}</div>
                                 <div className="flex items-center gap-1.5 text-mono-text-muted text-[13px] sm:text-sm font-medium"><Phone size={14} className="text-mono-text-disabled" /> {customer.phone}</div>
                              </div>
                           </div>
                           <button onClick={toggleStatus} className={`px-2 sm:px-3 py-1.5 rounded-card text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all border ${customer.status === 'Active' ? 'bg-mono-surface text-mono-text border-mono-border/60 ' : 'bg-mono-surface text-rose-600 border-rose-200'}`}>{customer.status}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                           <div className="bg-mono-bg rounded-card p-3 sm:p-4 border border-mono-divider"><div className="flex items-center gap-1.5 text-mono-text-disabled text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 sm:mb-2"><Clock size={12} /> Frequency</div><p className="text-[13px] sm:text-sm font-bold text-mono-text">{customer.frequency}</p></div>
                           <div
                              className={`rounded-card p-3 sm:p-4 border cursor-pointer transition-all ${financials?.account_status === 'Advance' ? 'bg-mono-surface border-emerald-100' : 'bg-mono-text/5 border-mono-border'}`}
                              onClick={() => router.push(`/billing?search=${encodeURIComponent(customer.name)}`)}
                           >
                              <div className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 sm:mb-2 opacity-80 ${financials?.account_status === 'Advance' ? 'text-mono-text' : 'text-mono-text'}`}>
                                 <Receipt size={12} /> {financials?.account_status === 'Advance' ? 'Advance' : 'Balance'}
                              </div>
                              <p className={`text-[13px] sm:text-sm font-bold ${financials?.account_status === 'Advance' ? 'text-mono-text' : 'text-mono-text'}`}>
                                 {financials ? `₹${Math.abs(financials.current_balance).toFixed(2)}` : '₹0.00'}
                              </p>
                           </div>
                        </div>
                     </div>
                     <div className="max-w-2xl mx-auto w-full px-6">
                        <div className="flex relative">
                           <button
                              onClick={() => setActiveTab('calendar')}
                              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors ${activeTab === 'calendar' ? 'text-mono-text' : 'text-mono-text-disabled hover:text-mono-text-muted'}`}
                           >
                              Calendar
                              {activeTab === 'calendar' && (
                                 <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-mono-text rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                              )}
                           </button>
                           <button
                              onClick={() => setActiveTab('statement')}
                              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors ${activeTab === 'statement' ? 'text-mono-text' : 'text-mono-text-disabled hover:text-mono-text-muted'}`}
                           >
                              Statement
                              {activeTab === 'statement' && (
                                 <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-mono-text rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                              )}
                           </button>
                        </div>
                     </div>
                  </div>
                  {/* TABS */}


                  <AnimatePresence mode="wait">
                     {activeTab === 'calendar' ? (
                        <motion.div key="calendar" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                           <div className="max-w-2xl mx-auto w-full px-5 py-2">
                              <div className="bg-white rounded-hero sm:rounded-hero p-5 sm:p-8 shadow-sm border border-mono-divider">
                                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                                    <div><h3 className="text-lg sm:text-xl font-semibold text-mono-text">Delivery History</h3><div className="flex items-center gap-2 mt-1"><button onClick={() => changeMonth(-1)} className="p-1 rounded-md text-mono-text-disabled hover:bg-mono-bg"><ArrowLeft size={14} /></button><p className="text-[10px] sm:text-[11px] font-bold text-mono-text uppercase tracking-widest">{monthName} {yearName}</p><button onClick={() => changeMonth(1)} className="p-1 rounded-md text-mono-text-disabled hover:bg-mono-bg"><ArrowLeft size={14} className="rotate-180" /></button></div></div>
                                    <div className="flex items-center gap-2 bg-mono-surface text-mono-text px-3 py-1.5 rounded-card border border-emerald-100"><span className="text-[9px] sm:text-[10px] font-bold uppercase">{deliveries.filter(d => d.delivered).length} Deliveries</span></div>
                                 </div>
                                 <div className="flex flex-col gap-3">
                                    {Array.from({ length: displayDays }).map((_, i) => {
                                       const day = i + 1;
                                       const dateStr = `${yearName}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                       const dayDeliveries = deliveries.filter(d => d.delivery_date === dateStr);

                                       if (dayDeliveries.length === 0) {
                                          return (
                                             <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-card border transition-all bg-mono-bg/50 border-mono-divider/50 opacity-40">
                                                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                                   <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-card flex flex-col items-center justify-center font-bold bg-mono-surface text-mono-text-disabled">
                                                      <span className="text-[8px] sm:text-[9px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                                      <span className="text-base sm:text-lg leading-none">{day}</span>
                                                   </div>
                                                   <p className="text-[11px] sm:text-xs font-bold text-mono-text-disabled italic tracking-tight">No deliveries scheduled</p>
                                                </div>
                                                <div className="text-right shrink-0 ml-2">
                                                   <p className="font-bold text-[13px] sm:text-sm text-mono-border">₹0</p>
                                                </div>
                                             </div>
                                          );
                                       }

                                       const dayTotal = dayDeliveries.filter(d => d.delivered).reduce((sum, d) => sum + calculateDeliveryTotal(d), 0);

                                       return (
                                          <div key={i} className="flex flex-col p-3 sm:p-4 rounded-card border transition-all bg-white border-mono-divider hover:border-mono-border cursor-pointer" onClick={() => toggleExpand(dateStr)}>
                                             <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 sm:gap-4 overflow-hidden">
                                                   <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-md flex flex-col items-center justify-center font-bold bg-mono-text/10 text-mono-text">
                                                      <span className="text-[8px] sm:text-[9px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                                      <span className="text-base sm:text-lg leading-none">{day}</span>
                                                   </div>
                                                   <div className="flex flex-col justify-center h-10 sm:h-12">
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
                                                <div className="text-right shrink-0 ml-2 flex flex-col justify-center h-10 sm:h-12">
                                                   <p className="font-bold text-[13px] sm:text-sm text-mono-text">₹{dayTotal.toFixed(0)}</p>
                                                   <p className="text-[8px] sm:text-[10px] font-bold text-mono-text-disabled uppercase mt-0.5">Total</p>
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
                                                      <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-mono-divider flex flex-col gap-2 pl-13 sm:pl-16">
                                                         {dayDeliveries.map((delivery, dIdx) => (
                                                            <div key={dIdx} className={`flex flex-col gap-1.5 ${dIdx > 0 ? "pt-2 border-t border-mono-divider" : ""}`}>
                                                               <p className="font-bold text-[13px] sm:text-[15px] text-mono-text leading-tight truncate max-w-[150px] sm:max-w-none">
                                                                  {[
                                                                     delivery.milk_qty > 0 ? `${delivery.milk_qty} Milk` : null,
                                                                     ...(delivery.misc_items || []).map((m: any) => `${m.qty} ${m.name}`)
                                                                  ].filter(Boolean).join(' + ')}
                                                               </p>
                                                               <div className="flex items-center gap-1.5">
                                                                  <span className={`px-1 py-0.5 rounded text-[7px] sm:text-[8px] border font-bold shrink-0 ${delivery.shift === 'Morning Only' ? 'bg-amber-50 text-mono-text border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>{delivery.shift === 'Morning Only' ? 'AM' : 'PM'}</span>
                                                                  {delivery.delivered ? (
                                                                     <span className="bg-mono-surface text-mono-text px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] border border-mono-text/15 font-bold">Delivered</span>
                                                                  ) : (() => {
                                                                     const now = new Date();
                                                                     const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                                                     const isPast = delivery.delivery_date < today;
                                                                     const isToday = delivery.delivery_date === today;
                                                                     const hour = now.getHours();
                                                                     const isShiftOver = (delivery.shift === 'Morning Only' && hour >= 12) || (delivery.shift === 'Evening Only' && hour >= 22);
                                                                     if (isPast || (isToday && isShiftOver)) {
                                                                        return <span className="bg-mono-surface text-rose-600 px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] border border-rose-200 font-bold">Undelivered</span>;
                                                                     }
                                                                     return <span className="bg-mono-surface text-mono-text-disabled px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] border border-mono-border font-bold">Pending</span>;
                                                                  })()}
                                                                  {delivery.billed && (
                                                                     <span className="bg-mono-surface text-mono-text-muted px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] border border-mono-border font-bold">Billed</span>
                                                                  )}
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
                                    {deliveries.filter(d => d.delivered).length === 0 && (
                                       <div className="py-12 flex flex-col items-center justify-center text-mono-text-disabled gap-2 bg-mono-bg rounded-hero border-2 border-dashed border-mono-border">
                                          <p className="font-bold">No deliveries recorded</p>
                                          <p className="text-[10px] uppercase tracking-widest">For {monthName} {yearName}</p>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </motion.div>
                     ) : (
                        <motion.div key="statement" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                           <div className="max-w-2xl mx-auto w-full px-5 py-2">
                              <div className="bg-white rounded-hero sm:rounded-hero p-5 sm:p-8 shadow-sm border border-mono-divider">
                                 <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg sm:text-xl font-semibold text-mono-text">Payment History</h3>
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-mono-text/5 text-mono-text rounded-card border border-mono-border">{payments.length} Records</span>
                                 </div>
                                 {payments.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-mono-text-disabled gap-2 bg-mono-bg rounded-hero border-2 border-dashed border-mono-border">
                                       <p className="font-bold">No payments found</p>
                                       <p className="text-[10px] uppercase tracking-widest">All payments will appear here</p>
                                    </div>
                                 ) : (
                                    <div className="flex flex-col gap-3">
                                       {payments.map((p, i) => {
                                          const d = new Date(p.payment_date);
                                          const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                          const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                          return (
                                             <div key={i} className="flex items-center justify-between p-4 rounded-card border bg-white border-mono-divider hover:border-mono-text transition-all">
                                                <div className="flex items-center gap-3">
                                                   <div className="h-11 w-11 shrink-0 rounded-card flex items-center justify-center bg-mono-surface text-mono-text border border-emerald-100">
                                                      <Receipt size={18} />
                                                   </div>
                                                   <div>
                                                      <p className="font-bold text-[13px] text-mono-text">{dateStr}</p>
                                                      <div className="flex items-center gap-2 mt-0.5">
                                                         <span className="text-[10px] font-bold text-mono-text-disabled">{timeStr}</span>
                                                         <span className="w-1 h-1 rounded-full bg-mono-border" />
                                                         <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-mono-surface text-mono-text-muted">{(p as any).method || 'Cash'}</span>
                                                      </div>
                                                      {(p as any).notes && <p className="text-[10px] text-mono-text-disabled mt-0.5 italic">{(p as any).notes}</p>}
                                                   </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-2">
                                                   <p className="font-bold text-sm text-mono-text">+₹{Number(p.amount).toFixed(2)}</p>
                                                   <p className="text-[9px] font-bold text-mono-text-disabled uppercase">Received</p>
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
                  </AnimatePresence>
               </>
            ) : (
               <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <X size={48} className="mb-4" />
                  <p className="font-bold">Customer not found</p>
               </div>
            )}


            <div id="financial-summary" className="max-w-2xl mx-auto w-full px-5 py-6">
               <div className="bg-mono-text rounded-hero p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden border border-white/10">
                  <div className={`absolute top-[-20%] right-[-10%] w-64 h-64 blur-[100px] rounded-full pointer-events-none transition-colors duration-500 ${grandTotalAmount < 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} />
                  <div className={`absolute bottom-[-20%] left-[-10%] w-64 h-64 blur-[100px] rounded-full pointer-events-none transition-colors duration-500 ${grandTotalAmount < 0 ? 'bg-emerald-400/20' : 'bg-rose-600/20'}`} />

                  <div className="flex items-center justify-between mb-8 relative z-10">
                     <h3 className="text-xs md:text-sm font-semibold uppercase tracking-widest text-white/70">Financial Summary</h3>
                     <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md border ${
                        grandTotalAmount < 0 
                           ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                           : 'bg-white/10 text-white border-white/20'
                     }`}>
                        {grandTotalAmount < 0 ? 'Advance' : 'Credit'}
                     </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 mb-8 relative z-10">
                     <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Previous Balance</p>
                        <div className="flex flex-col gap-1.5">
                           <p className={`text-xl sm:text-2xl font-bold ${billsBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              ₹{Math.abs(billsBalance).toFixed(2)}
                           </p>
                           <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-md w-fit backdrop-blur-md ${
                              billsBalance > 0 
                                 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/20' 
                                 : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                           }`}>
                              {billsBalance > 0 ? 'Dues' : 'Advance'}
                           </span>
                        </div>
                     </div>
                     <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Current Month (Unbilled)</p>
                        <div className="flex flex-col gap-1.5">
                           <p className="text-xl sm:text-2xl font-semibold text-white">₹{currentDeliveriesAmount.toFixed(2)}</p>
                           <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-md w-fit backdrop-blur-md bg-white/10 text-white/70 border border-white/10">
                              Unbilled
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex flex-col gap-6 relative z-10">
                     <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1.5">
                           <p className={`text-[10px] font-bold uppercase tracking-widest ${grandTotalAmount < 0 ? 'text-emerald-400' : 'text-white/70'}`}>
                              {grandTotalAmount < 0 ? 'Advance Balance' : 'Grand Total Payable'}
                           </p>
                           <p className={`text-4xl sm:text-5xl font-black tracking-tight ${grandTotalAmount < 0 ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}>
                              ₹{Math.abs(grandTotalAmount).toFixed(2)}
                           </p>
                        </div>
                        <div className="text-right hidden sm:block">
                           <p className="text-[9px] text-white/40 font-medium italic mb-2">Including all past dues and unbilled items</p>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2">
                        {grandTotalAmount > 0 && (
                           <button
                              onClick={handleMarkAsPaid}
                              disabled={isSubmitting}
                              className="flex-1 bg-white text-mono-text border border-white/20 py-4 sm:py-4.5 rounded-card font-bold text-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-white/90"
                           >
                              <Receipt size={18} />
                              Settle Full
                           </button>
                        )}
                        <button
                           onClick={() => {
                              setPaymentAmount(grandTotalAmount > 0 ? grandTotalAmount.toString() : "");
                              setPaymentMethod("Cash");
                              setPaymentNotes("");
                              setIsPaymentModalOpen(true);
                           }}
                           className="flex-1 bg-white/10 backdrop-blur-md text-white border border-white/20 py-4 sm:py-4.5 rounded-card font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-white/20 hover:border-white/30"
                        >
                           <Receipt size={18} />
                           Record Payment
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </main>

         <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={deleteCustomer} title="Delete Customer" message={`Are you sure you want to delete ${customer.name}? This action cannot be undone.`} confirmText="Yes, Delete" type="danger" />

         <Modal
            isOpen={modalConfig.isOpen}
            onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            onConfirm={modalConfig.onConfirm}
            title={modalConfig.title}
            message={modalConfig.message}
            type={modalConfig.type}
            confirmText={modalConfig.confirmText}
         />

         <AnimatePresence>
            {isEditModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-hero p-7 shadow-md flex flex-col gap-6">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-semibold text-mono-text">Edit Customer</p><button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-mono-surface rounded-card text-mono-text-muted"><X size={18} /></button></div>
                     <form onSubmit={(e) => handleEditSubmit(e, setIsEditModalOpen)} className="p-6 pt-4 flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">FullName</label><input autoFocus value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Phone</label><input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                           <CustomSelect
                              label="Route"
                              options={areas.map(a => ({ value: a.id.toString(), label: a.name }))}
                              value={editForm.area_id}
                              onChange={val => setEditForm({ ...editForm, area_id: val })}
                              placeholder="Select Route"
                           />
                        </div>
                        <CustomSelect
                           label="Delivery Frequency"
                           options={[
                              { value: "Morning Only", label: "Morning Only" },
                              { value: "Evening Only", label: "Evening Only" },
                              { value: "Morning & Evening", label: "Morning & Evening" }
                           ]}
                           value={editForm.frequency}
                           onChange={val => setEditForm({ ...editForm, frequency: val })}
                        />
                        <div className="grid grid-cols-2 gap-3">
                           <CustomSelect
                              label="Daily Product"
                              options={products.map(p => ({ value: p.id, label: `${p.name} (${p.size})` }))}
                              value={editForm.default_product_id}
                              onChange={val => setEditForm({ ...editForm, default_product_id: val })}
                              placeholder="Select Product"
                           />
                           <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Daily Qty</label>
                              <input
                                 type="number"
                                 placeholder="1"
                                 value={editForm.default_qty}
                                 onChange={e => setEditForm({ ...editForm, default_qty: e.target.value })}
                                 className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all"
                              />
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3"> <CustomSelect
                           label="Type"
                           options={[
                              { value: "credit", label: "Credit" },
                              { value: "advance", label: "Advance" }
                           ]}
                           value={editForm.outstanding_type}
                           onChange={val => setEditForm({ ...editForm, outstanding_type: val })}
                        />
                           <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">
                                 {editForm.outstanding_type === "advance" ? "Past Advance (₹)" : "Past Outstanding (₹)"}
                              </label>
                              <input type="number" step="0.01" value={editForm.outstanding} onChange={e => setEditForm({ ...editForm, outstanding: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" />
                           </div>

                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-mono-text text-white font-bold py-4 rounded-card mt-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm">
                           {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
            {/* Return Item modal — commented out
            {isReturnModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReturnModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-hero p-7 shadow-md flex flex-col gap-6 text-mono-text">
                     <div className="flex justify-between items-center">
                        <div>
                           <p className="text-[18px] font-semibold text-mono-text">Record Return</p>
                           <p className="text-xs text-mono-text-disabled mt-0.5">Customer returned item(s) — credit will be added as advance</p>
                        </div>
                        <button onClick={() => setIsReturnModalOpen(false)} className="p-2 bg-mono-surface rounded-card text-mono-text-muted"><X size={18} /></button>
                     </div>
                     <div className="bg-amber-50 border border-amber-100 p-4 rounded-card">
                        <p className="text-amber-800 text-xs font-bold">ℹ️ How this works</p>
                        <p className="text-amber-700 text-xs mt-1">The return amount will be added as a credit (advance) to this customer's account.</p>
                     </div>
                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(returnAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        handleRecordReturn(amt, returnNotes, setIsReturnModalOpen);
                     }} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Return Amount (₹)</label>
                           <input autoFocus type="number" step="0.01" required placeholder="0.00" value={returnAmount} onChange={e => setReturnAmount(e.target.value)} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all font-medium" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Reason (Optional)</label>
                           <input type="text" placeholder="e.g. Returned 1 Curd packet" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" />
                        </div>
                        <button type="submit" disabled={!returnAmount || parseFloat(returnAmount) <= 0 || isSubmitting} className="w-full bg-amber-600 text-white font-bold py-4 rounded-card mt-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm">
                           {isSubmitting ? "Recording..." : "Record Return & Add Credit"}
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
            */}
            {isPaymentModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-hero p-7 shadow-md flex flex-col gap-6 text-mono-text">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-semibold text-mono-text">Record Payment</p><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-mono-surface rounded-card text-mono-text-muted"><X size={18} /></button></div>
                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(paymentAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        runRecordPayment(parseFloat(paymentAmount), paymentMethod, paymentNotes, setIsPaymentModalOpen);
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
                           {(() => {
                              const amt = parseFloat(paymentAmount) || 0;
                              const diff = amt - grandTotalAmount;
                              if (amt <= 0) return null;
                              if (Math.abs(diff) < 0.01) {
                                 return <span className="text-[11px] font-bold text-mono-text">Full Settlement</span>;
                              } else if (diff > 0) {
                                 return <span className="text-[11px] font-bold text-mono-text">₹{diff.toFixed(2)} will be added as Advance</span>;
                              } else {
                                 return <span className="text-[11px] font-bold text-mono-text">₹{Math.abs(diff).toFixed(2)} will remain as Credit (Outstanding)</span>;
                              }
                           })()}
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Payment Method</label>
                           <CustomSelect
                              options={[
                                 { value: "Cash", label: "Cash" },
                                 { value: "UPI", label: "UPI" },
                                 { value: "Bank Transfer", label: "Bank Transfer" },
                                 { value: "Other", label: "Other" }
                              ]}
                              value={paymentMethod}
                              onChange={val => setPaymentMethod(val)}
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Notes / Remarks</label>
                           <input
                              placeholder="Optional remarks"
                              value={paymentNotes}
                              onChange={e => setPaymentNotes(e.target.value)}
                              className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all"
                           />
                        </div>
                        <button
                           type="submit"
                           disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isSubmitting}
                           className="w-full bg-mono-text text-white font-bold py-4 rounded-card mt-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
                        >
                           {isSubmitting ? "Recording..." : "Record Payment"}
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </PullToRefresh>
   );
}
