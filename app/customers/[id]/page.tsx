"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Clock, Receipt, Trash2, Edit2, X, Camera, RotateCcw, ArrowDown } from "lucide-react";
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
      handleRecordReturn,
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
   const [returnAmount, setReturnAmount] = useState("");
   const [returnNotes, setReturnNotes] = useState("");
   const [activeTab, setActiveTab] = useState<'calendar' | 'statement'>('calendar');

   const daysCount = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
   const isCurrentMonth = viewDate.getMonth() === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear();
   const displayDays = isCurrentMonth ? new Date().getDate() : daysCount;

   if (!customer && isLoading) {
      return (
         <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-hidden">
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
               <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-8 h-8 bg-zinc-100 rounded-full animate-pulse" />
                     <div className="flex flex-col gap-2">
                        <div className="w-32 h-4 bg-zinc-100 rounded-md animate-pulse" />
                        <div className="w-20 h-3 bg-zinc-100 rounded-md animate-pulse" />
                     </div>
                  </div>
               </div>
            </header>
            <main className="flex-1 overflow-y-auto">
               <div className="bg-white rounded-b-3xl shadow-sm border-b border-zinc-200/50 relative overflow-hidden">
                  <div className="max-w-2xl mx-auto w-full px-6 pb-8 pt-4">
                     <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 sm:h-16 sm:w-16 bg-zinc-100 rounded-2xl animate-pulse" />
                           <div className="flex flex-col gap-2">
                              <div className="w-40 h-5 bg-zinc-100 rounded-md animate-pulse" />
                              <div className="w-32 h-4 bg-zinc-100 rounded-md animate-pulse" />
                           </div>
                        </div>
                        <div className="w-16 h-6 bg-zinc-100 rounded-xl animate-pulse" />
                     </div>
                     <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="h-16 bg-slate-50 rounded-2xl animate-pulse border border-zinc-100" />
                        <div className="h-16 bg-slate-50 rounded-2xl animate-pulse border border-zinc-100" />
                     </div>
                  </div>
               </div>
               <div className="max-w-2xl mx-auto w-full px-5 py-8 flex flex-col gap-6">
                  <div className="h-80 bg-white border border-zinc-100 rounded-3xl animate-pulse" />
                  <div className="h-48 bg-white border border-zinc-100 rounded-3xl animate-pulse" />
               </div>
            </main>
         </div>
      );
   }

   if (!customer) {
      return (
         <div className="flex h-full w-full items-center justify-center bg-slate-50 text-zinc-500 flex-col gap-4">
            <div className="h-16 w-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300">
               <X size={32} />
            </div>
            <div className="text-center">
               <p className="font-bold text-zinc-900">Customer not found</p>
               <p className="text-sm text-zinc-400">The customer you're looking for doesn't exist.</p>
            </div>
            <button onClick={() => router.back()} className="mt-2 px-6 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-900 shadow-sm active:scale-95 transition-all">
               Go Back
            </button>
         </div>
      );
   }

   return (
      <PullToRefresh onRefresh={() => fetchData(true)} className="bg-slate-50 pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center justify-between gap-4">
               <div className="flex items-center gap-4"><button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-full transition-colors"><ArrowLeft size={20} /></button><div><h1 className="text-base sm:text-lg font-bold">{customer?.name || 'Customer'}</h1><p className="text-[10px] sm:text-xs text-zinc-500">Customer Profile</p></div></div>
               <div className="flex items-center gap-2">
                  {/*<button onClick={() => router.push(`/billing?search=${encodeURIComponent(customer?.name || '')}`)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md shadow-primary/20">
                     <Receipt size={16} />
                     <span className="hidden sm:inline">QR Bill</span>
                  </button>*/}
                  {/* Screenshot button — commented out (long screenshot setup disabled)
                  <button
                      onClick={handleCaptureScreenshot}
                      disabled={isCapturing}
                      className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl active:scale-90 disabled:opacity-50 transition-all"
                      title="Take Screenshot"
                   >
                      <Camera size={20} className={isCapturing ? "animate-pulse text-primary" : ""} />
                   </button>
                  */}
                  <button onClick={() => document.getElementById('financial-summary')?.scrollIntoView({ behavior: 'smooth' })} className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl border border-zinc-200 active:scale-90"><ArrowDown size={20} /></button>
                  <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-zinc-500 border border-zinc-200 hover:bg-zinc-100 rounded-xl active:scale-90"><Edit2 size={20} /></button>
                  <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-rose-500 border border-zinc-200 hover:bg-rose-50 rounded-xl active:scale-90"><Trash2 size={20} /></button>
               </div>
            </div>
         </header>

         <main ref={screenshotRef} className="flex flex-col">
            {isLoading ? (
               <div className="max-w-2xl mx-auto w-full px-5 py-8 flex flex-col gap-6">
                  <div className="h-48 bg-white border border-zinc-100 rounded-3xl animate-pulse" />
                  <div className="h-96 bg-white border border-zinc-100 rounded-3xl animate-pulse" />
               </div>
            ) : customer ? (
               <>
                  <div className="bg-white rounded-b-3xl shadow-sm border-b border-zinc-200/50 relative overflow-hidden">
                     <div className="max-w-2xl mx-auto w-full px-6 pb-4 pt-4">
                        <div className="flex items-start justify-between mb-6">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black text-primary border border-primary/20">{customer.name.charAt(0)}</div>
                              <div className="flex flex-col gap-1">
                                 <div className="flex items-center gap-1.5 text-zinc-500 text-[13px] sm:text-sm font-medium"><MapPin size={14} className="text-zinc-400" /> {customer.area?.name || 'No Area'}</div>
                                 <div className="flex items-center gap-1.5 text-zinc-500 text-[13px] sm:text-sm font-medium"><Phone size={14} className="text-zinc-400" /> {customer.phone}</div>
                              </div>
                           </div>
                           <button onClick={toggleStatus} className={`px-2 sm:px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border ${customer.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{customer.status}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                           <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-zinc-100"><div className="flex items-center gap-1.5 text-zinc-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 sm:mb-2"><Clock size={12} /> Frequency</div><p className="text-[13px] sm:text-sm font-bold text-zinc-800">{customer.frequency}</p></div>
                           <div
                              className={`rounded-2xl p-3 sm:p-4 border cursor-pointer transition-all ${financials?.account_status === 'Advance' ? 'bg-emerald-50 border-emerald-100' : 'bg-primary/5 border-primary/10'}`}
                              onClick={() => router.push(`/billing?search=${encodeURIComponent(customer.name)}`)}
                           >
                              <div className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 sm:mb-2 opacity-80 ${financials?.account_status === 'Advance' ? 'text-emerald-600' : 'text-primary'}`}>
                                 <Receipt size={12} /> {financials?.account_status === 'Advance' ? 'Advance' : 'Balance'}
                              </div>
                              <p className={`text-[13px] sm:text-sm font-black ${financials?.account_status === 'Advance' ? 'text-emerald-600' : 'text-primary'}`}>
                                 {financials ? `₹${Math.abs(financials.current_balance).toFixed(2)}` : '₹0.00'}
                              </p>
                           </div>
                        </div>
                     </div>
                     <div className="max-w-2xl mx-auto w-full px-6">
                        <div className="flex relative">
                           <button
                              onClick={() => setActiveTab('calendar')}
                              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors ${activeTab === 'calendar' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                           >
                              Calendar
                              {activeTab === 'calendar' && (
                                 <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                              )}
                           </button>
                           <button
                              onClick={() => setActiveTab('statement')}
                              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors ${activeTab === 'statement' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}
                           >
                              Statement
                              {activeTab === 'statement' && (
                                 <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
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
                              <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-sm border border-zinc-100">
                                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                                    <div><h3 className="text-lg sm:text-xl font-black text-zinc-900">Delivery History</h3><div className="flex items-center gap-2 mt-1"><button onClick={() => changeMonth(-1)} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-50"><ArrowLeft size={14} /></button><p className="text-[10px] sm:text-[11px] font-bold text-zinc-900 uppercase tracking-widest">{monthName} {yearName}</p><button onClick={() => changeMonth(1)} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-50"><ArrowLeft size={14} className="rotate-180" /></button></div></div>
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100"><span className="text-[9px] sm:text-[10px] font-black uppercase">{deliveries.filter(d => d.delivered).length} Deliveries</span></div>
                                 </div>
                                 <div className="flex flex-col gap-3">
                                    {Array.from({ length: displayDays }).map((_, i) => {
                                       const day = i + 1;
                                       const dateStr = `${yearName}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                       const dayDeliveries = deliveries.filter(d => d.delivery_date === dateStr);

                                       if (dayDeliveries.length === 0) {
                                          return (
                                             <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all bg-zinc-50/50 border-zinc-100/50 opacity-40">
                                                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                                   <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl flex flex-col items-center justify-center font-black bg-zinc-100 text-zinc-400">
                                                      <span className="text-[8px] sm:text-[9px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                                      <span className="text-base sm:text-lg leading-none">{day}</span>
                                                   </div>
                                                   <p className="text-[11px] sm:text-xs font-bold text-zinc-400 italic tracking-tight">No deliveries scheduled</p>
                                                </div>
                                                <div className="text-right shrink-0 ml-2">
                                                   <p className="font-black text-[13px] sm:text-sm text-zinc-300">₹0</p>
                                                </div>
                                             </div>
                                          );
                                       }

                                       const dayTotal = dayDeliveries.filter(d => d.delivered).reduce((sum, d) => sum + calculateDeliveryTotal(d), 0);

                                       return (
                                          <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all bg-white border-zinc-100 hover:border-primary/20">
                                             <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                                <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl flex flex-col items-center justify-center font-black bg-primary/10 text-primary">
                                                   <span className="text-[8px] sm:text-[9px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                                   <span className="text-base sm:text-lg leading-none">{day}</span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                                   {dayDeliveries.map((delivery, dIdx) => (
                                                      <div key={dIdx} className={`flex flex-col gap-1 ${dIdx > 0 ? "pt-2 sm:pt-0 sm:pl-6 border-t sm:border-t-0 sm:border-l border-zinc-100" : ""}`}>
                                                         <p className="font-black text-[13px] sm:text-[15px] text-zinc-900 leading-tight truncate max-w-[150px] sm:max-w-none">
                                                            {[
                                                               delivery.milk_qty > 0 ? `${delivery.milk_qty} Milk` : null,
                                                               ...(delivery.misc_items || []).map((m: any) => `${m.qty} ${m.name}`)
                                                            ].filter(Boolean).join(' + ')}
                                                         </p>
                                                         <div className="flex items-center gap-1.5">
                                                            <span className={`px-1 py-0.5 rounded-[4px] text-[7px] sm:text-[8px] border font-black shrink-0 ${delivery.shift === 'Morning Only' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>{delivery.shift === 'Morning Only' ? 'AM' : 'PM'}</span>
                                                            {delivery.delivered ? (
                                                               <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-[4px] text-[7px] sm:text-[8px] border border-emerald-200 font-bold uppercase tracking-tighter">Delivered</span>
                                                            ) : (() => {
                                                               const now = new Date();
                                                               const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                                               const isPast = delivery.delivery_date < today;
                                                               const isToday = delivery.delivery_date === today;
                                                               const hour = now.getHours();
                                                               const isShiftOver = (delivery.shift === 'Morning Only' && hour >= 12) || (delivery.shift === 'Evening Only' && hour >= 22);
                                                               if (isPast || (isToday && isShiftOver)) {
                                                                  return <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-[4px] text-[7px] sm:text-[8px] border border-rose-200 font-bold uppercase tracking-tighter">Undelivered</span>;
                                                               }
                                                               return <span className="bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded-[4px] text-[7px] sm:text-[8px] border border-zinc-200 font-bold uppercase tracking-tighter">Pending</span>;
                                                            })()}
                                                            {delivery.billed && (
                                                               <span className="bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-[4px] text-[7px] sm:text-[8px] border border-zinc-200 font-bold uppercase tracking-tighter">Billed</span>
                                                            )}
                                                         </div>
                                                      </div>
                                                   ))}
                                                </div>
                                             </div>
                                             <div className="text-right shrink-0 ml-2">
                                                <p className="font-black text-[13px] sm:text-sm text-zinc-900">₹{dayTotal.toFixed(0)}</p>
                                                <p className="text-[8px] sm:text-[10px] font-bold text-zinc-400 uppercase">Total</p>
                                             </div>
                                          </div>
                                       );
                                    })}
                                    {deliveries.filter(d => d.delivered).length === 0 && (
                                       <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
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
                              <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-sm border border-zinc-100">
                                 <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg sm:text-xl font-black text-zinc-900">Payment History</h3>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-primary/5 text-primary rounded-xl border border-primary/10">{payments.length} Records</span>
                                 </div>
                                 {payments.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
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
                                             <div key={i} className="flex items-center justify-between p-4 rounded-2xl border bg-white border-zinc-100 hover:border-emerald-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                   <div className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                      <Receipt size={18} />
                                                   </div>
                                                   <div>
                                                      <p className="font-black text-[13px] text-zinc-900">{dateStr}</p>
                                                      <div className="flex items-center gap-2 mt-0.5">
                                                         <span className="text-[10px] font-bold text-zinc-400">{timeStr}</span>
                                                         <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                                         <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500">{(p as any).method || 'Cash'}</span>
                                                      </div>
                                                      {(p as any).notes && <p className="text-[10px] text-zinc-400 mt-0.5 italic">{(p as any).notes}</p>}
                                                   </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-2">
                                                   <p className="font-black text-sm text-emerald-600">+₹{Number(p.amount).toFixed(2)}</p>
                                                   <p className="text-[9px] font-bold text-zinc-400 uppercase">Received</p>
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
               <div className="bg-white rounded-4xl p-6 sm:p-8 shadow-lg text-white relative overflow-hidden border border-primary-dim">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-dim/10 blur-[80px] rounded-full -mr-16 -mt-16" />

                  <div className="flex items-center justify-between mb-8 relative z-10">
                     <h3 className="text-sm font-black uppercase tracking-widest text-primary">Financial Summary</h3>
                     <span className={`text-[10px] font-bold  tracking-widest px-3 py-1 rounded-lg ${grandTotalAmount < 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-primary-dim/20 text-primary border border-primary/20'}`}>
                        {grandTotalAmount < 0 ? 'Advance Balance' : 'Credit Balance'}
                     </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 mb-8 relative z-10">
                     <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Previous Balance</p>
                        <div className="flex flex-col gap-1">
                           <p className={`text-lg font-black ${billsBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>₹{Math.abs(billsBalance).toFixed(2)}</p>
                           <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md w-fit ${billsBalance > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {billsBalance > 0 ? 'Dues' : 'Advance'}
                           </span>
                        </div>
                     </div>
                     <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current Month (Unbilled)</p>
                        <div className="flex flex-col gap-1">
                           <p className="text-lg font-black text-primary">₹{currentDeliveriesAmount.toFixed(2)}</p>
                           <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md w-fit bg-white/5 text-zinc-400">
                              Unbilled
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-800/50 flex flex-col gap-6 relative z-10">
                     <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                           <p className={`text-[10px] font-bold uppercase tracking-widest ${grandTotalAmount < 0 ? 'text-emerald-400' : 'text-primary'}`}>
                              {grandTotalAmount < 0 ? 'Advance Balance' : 'Grand Total Payable'}
                           </p>
                           <p className={`text-4xl font-black drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] ${grandTotalAmount < 0 ? 'text-emerald-400' : 'text-primary'}`}>
                              ₹{Math.abs(grandTotalAmount).toFixed(2)}
                           </p>
                        </div>
                        <div className="text-right hidden sm:block">
                           <p className="text-[9px] text-zinc-500 font-medium italic mb-2">Including all past dues and unbilled items</p>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row gap-3">
                        {grandTotalAmount > 0 && (
                           <button
                              onClick={handleMarkAsPaid}
                              disabled={isSubmitting}
                              className="flex-1 bg-white text-zinc-900 border border-zinc-200 py-4 rounded-2xl font-bold text-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-sm"
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
                           className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                           <Receipt size={18} />
                           Record Payment
                        </button>
                        <button
                           onClick={() => {
                              setReturnAmount("");
                              setReturnNotes("");
                              setIsReturnModalOpen(true);
                           }}
                           disabled={isSubmitting}
                           className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 py-4 rounded-2xl font-bold text-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                        >
                           <RotateCcw size={18} />
                           Return Item
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
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-black text-slate-900">Edit Customer</p><button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button></div>
                     <form onSubmit={(e) => handleEditSubmit(e, setIsEditModalOpen)} className="p-6 pt-4 flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">FullName</label><input autoFocus value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Phone</label><input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
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
                              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Daily Qty</label>
                              <input
                                 type="number"
                                 placeholder="1"
                                 value={editForm.default_qty}
                                 onChange={e => setEditForm({ ...editForm, default_qty: e.target.value })}
                                 className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all"
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
                              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                 {editForm.outstanding_type === "advance" ? "Past Advance (₹)" : "Past Outstanding (₹)"}
                              </label>
                              <input type="number" step="0.01" value={editForm.outstanding} onChange={e => setEditForm({ ...editForm, outstanding: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" />
                           </div>

                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xl">
                           {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
            {isReturnModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReturnModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6 text-zinc-900">
                     <div className="flex justify-between items-center">
                        <div>
                           <p className="text-[18px] font-black text-slate-900">Record Return</p>
                           <p className="text-xs text-zinc-400 mt-0.5">Customer returned item(s) — credit will be added as advance</p>
                        </div>
                        <button onClick={() => setIsReturnModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button>
                     </div>

                     <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                        <p className="text-amber-800 text-xs font-bold">ℹ️ How this works</p>
                        <p className="text-amber-700 text-xs mt-1">The return amount will be added as a credit (advance) to this customer's account. If balance was ₹0, it becomes negative (advance) by the returned value.</p>
                     </div>

                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(returnAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        handleRecordReturn(amt, returnNotes, setIsReturnModalOpen);
                     }} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Return Amount (₹)</label>
                           <input
                              autoFocus
                              type="number"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={returnAmount}
                              onChange={e => setReturnAmount(e.target.value)}
                              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all font-bold"
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Reason (Optional)</label>
                           <input
                              type="text"
                              placeholder="e.g. Returned 1 Curd packet"
                              value={returnNotes}
                              onChange={e => setReturnNotes(e.target.value)}
                              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all"
                           />
                        </div>
                        <button
                           type="submit"
                           disabled={!returnAmount || parseFloat(returnAmount) <= 0 || isSubmitting}
                           className="w-full bg-amber-600 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xl"
                        >
                           {isSubmitting ? "Recording..." : "Record Return & Add Credit"}
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
            {isPaymentModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6 text-zinc-900">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-black text-slate-900">Record Payment</p><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button></div>
                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(paymentAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        runRecordPayment(parseFloat(paymentAmount), paymentMethod, paymentNotes, setIsPaymentModalOpen);
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
                           {(() => {
                              const amt = parseFloat(paymentAmount) || 0;
                              const diff = amt - grandTotalAmount;
                              if (amt <= 0) return null;
                              if (Math.abs(diff) < 0.01) {
                                 return <span className="text-[11px] font-bold text-emerald-600">Full Settlement</span>;
                              } else if (diff > 0) {
                                 return <span className="text-[11px] font-bold text-emerald-600">₹{diff.toFixed(2)} will be added as Advance</span>;
                              } else {
                                 return <span className="text-[11px] font-bold text-amber-600">₹{Math.abs(diff).toFixed(2)} will remain as Credit (Outstanding)</span>;
                              }
                           })()}
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payment Method</label>
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
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notes / Remarks</label>
                           <input
                              placeholder="Optional remarks"
                              value={paymentNotes}
                              onChange={e => setPaymentNotes(e.target.value)}
                              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all"
                           />
                        </div>
                        <button
                           type="submit"
                           disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isSubmitting}
                           className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xl"
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
