"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Clock, Receipt, Trash2, Edit2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/ui/Modal";
import * as T from "@/types/database";
import CustomSelect from "@/components/ui/CustomSelect";

export default function CustomerProfilePage() {
   const params = useParams();
   const router = useRouter();
   const customerIdParam = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

   const [customer, setCustomer] = useState<(T.Customer & { area: T.Area }) | null>(null);
   const [financials, setFinancials] = useState<T.CustomerFinancials | null>(null);
   const [bills, setBills] = useState<T.Bill[]>([]);
   const [deliveries, setDeliveries] = useState<T.Delivery[]>([]);
   const [allUnbilledDeliveries, setAllUnbilledDeliveries] = useState<T.Delivery[]>([]);
   const [payments, setPayments] = useState<T.Payment[]>([]);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [viewDate, setViewDate] = useState(new Date());
   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [areas, setAreas] = useState<T.Area[]>([]);
   const [editForm, setEditForm] = useState({ name: "", phone: "", area_id: "", frequency: "Morning Only", outstanding: "" });

   const fetchData = useCallback(async () => {
      if (!customerIdParam) return;
      setIsLoading(true);
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;

      const [
         { data: custData },
         { data: areaList },
         { data: billsData },
         { data: deliveryData },
         { data: unbilledData },
         { data: paymentData },
         { data: productData },
         { data: finData }
      ] = await Promise.all([
         supabase.from('customers').select('*, area:areas(*)').eq('id', customerIdParam).single(),
         supabase.from('areas').select('*').order('name', { ascending: true }),
         supabase.from('bills').select('*').eq('customer_id', customerIdParam).order('created_at', { ascending: false }),
         supabase.from('deliveries').select('*').eq('customer_id', customerIdParam).gte('delivery_date', monthStart).lte('delivery_date', monthEnd).order('delivery_date', { ascending: true }),
         supabase.from('deliveries').select('*').eq('customer_id', customerIdParam).eq('delivered', true).eq('billed', false),
         supabase.from('payments').select('*').eq('customer_id', customerIdParam).order('payment_date', { ascending: false }),
         supabase.from('products').select('*'),
         supabase.from('customer_financials').select('*').eq('id', customerIdParam).single()
      ]);

      if (areaList) setAreas(areaList as T.Area[]);
      if (billsData) setBills(billsData as T.Bill[]);
      if (deliveryData) setDeliveries(deliveryData as T.Delivery[]);
      if (unbilledData) setAllUnbilledDeliveries(unbilledData as T.Delivery[]);
      if (paymentData) setPayments(paymentData as T.Payment[]);
      if (productData) setProducts(productData as T.Product[]);
      if (finData) setFinancials(finData as T.CustomerFinancials);

      if (custData) {
         setCustomer(custData as (T.Customer & { area: T.Area }));
         setEditForm({
            name: custData.name,
            phone: custData.phone,
            area_id: custData.area_id?.toString() || "",
            frequency: custData.frequency,
            outstanding: custData.past_outstanding?.toString() || "0"
         });
      }
      setIsLoading(false);
   }, [customerIdParam, viewDate]);

   useEffect(() => {
      fetchData();

      const sub = supabase.channel('cust_profile')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchData)
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, [fetchData]);

   const prices: Record<string, number> = {};
   products.forEach(p => prices[p.name] = Number(p.price));
   const milkPrice = prices[Object.keys(prices).find(n => n.toLowerCase().includes('milk')) || ''] || 50;

   const calculateDeliveryTotal = (d: T.Delivery) => {
      const product = products.find(p => p.id === d.product_id);
      const basePrice = product ? Number(product.price) : milkPrice;
      let total = (Number(d.milk_qty) || 0) * basePrice;
      const extras = d.misc_items || [];
      extras.forEach((item: any) => {
         const itemPrice = prices[item.name] || 0;
         total += (item.qty || 0) * itemPrice;
      });
      return total;
   };

   const unbilledDeliveries = deliveries.filter(d => d.delivered && !d.billed);
   const currentDeliveriesAmount = allUnbilledDeliveries.reduce((acc, d) => acc + calculateDeliveryTotal(d), 0);
   
   const totalBilled = bills.reduce((sum, b) => sum + Number(b.amount), 0);
   const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
   const pastOutstanding = Number(customer?.past_outstanding) || 0;
   const billsBalance = pastOutstanding + totalBilled - totalPaid;
   
   const grandTotalAmount = billsBalance + currentDeliveriesAmount;

   const toggleStatus = async () => {
      if (!customer) return;
      const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
      try {
         await supabase.from('customers').update({ status: newStatus }).eq('id', customer.id);
         await fetchData();
      } catch (err) { console.error(err); }
   };

   const deleteCustomer = async () => {
      if (!customer) return;
      try {
         setIsLoading(true);
         await supabase.from('customers').delete().eq('id', customer.id);
         router.push('/customers');
      } catch (err) { console.error(err); setIsLoading(false); }
   };

   const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!customer || !editForm.name || !editForm.phone || !editForm.area_id) return;
      try {
         setIsLoading(true);
         await supabase.from('customers').update({
            name: editForm.name,
            phone: editForm.phone,
            area_id: parseInt(editForm.area_id),
            frequency: editForm.frequency,
            past_outstanding: parseFloat(editForm.outstanding) || 0
         }).eq('id', customer.id);
         setIsEditModalOpen(false);
         await fetchData();
         if (editForm.phone !== customer.phone) {
            setIsLoading(false);
         } else {
            setIsLoading(false);
         }
      } catch (err) {
         console.error(err);
         setIsLoading(false);
      }
   };

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
      type: 'info',
      showDontShowAgain: false
    });

    const runGenerateBill = async () => {
       if (!customer || unbilledDeliveries.length === 0) return;
       try {
          setIsLoading(true);
          const { data: newBill, error: billError } = await supabase.from('bills').insert({
             customer_id: customer.id,
             amount: currentDeliveriesAmount,
             type: 'Monthly',
             status: 'Pending',
             created_at: new Date().toISOString(),
          }).select().single();

          if (billError) throw billError;

          const ids = allUnbilledDeliveries.map(d => d.id);
          await supabase.from('deliveries').update({ billed: true }).in('id', ids);

          await fetchData();
          router.push(`/billing?search=${encodeURIComponent(customer.name)}`);
       } catch (err) {
          console.error("Failed to generate bill:", err);
          setIsLoading(false);
       }
    };

    const handleGenerateBill = () => {
      const skip = localStorage.getItem('skip_bill_confirm') === 'true';
      if (skip) {
        runGenerateBill();
        return;
      }

      setModalConfig({
        isOpen: true,
        title: "Generate Bill",
        message: `Create a new monthly bill for ₹${currentDeliveriesAmount.toFixed(2)}?`,
        type: 'info',
        confirmText: "Generate",
        showDontShowAgain: true,
        onConfirm: (dontShow) => {
          if (dontShow) localStorage.setItem('skip_bill_confirm', 'true');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          runGenerateBill();
        }
      });
    };

    const runMarkAsPaid = async () => {
       if (!customer || grandTotalAmount <= 0) return;
       try {
          setIsLoading(true);
          
          if (Number(customer.past_outstanding) > 0) {
             await supabase.from('bills').insert({
                customer_id: customer.id,
                amount: Number(customer.past_outstanding),
                type: 'Opening Balance',
                status: 'Paid',
                notes: 'Converted from static Past Outstanding for settlement',
                created_at: new Date().toISOString(),
             });

             await supabase.from('customers').update({
                past_outstanding: 0
             }).eq('id', customer.id);
          }

          if (allUnbilledDeliveries.length > 0) {
             await supabase.from('bills').insert({
                customer_id: customer.id,
                amount: currentDeliveriesAmount,
                type: 'Monthly',
                status: 'Paid', 
                created_at: new Date().toISOString(),
             });

             const ids = allUnbilledDeliveries.map(d => d.id);
             await supabase.from('deliveries').update({ billed: true }).in('id', ids);
          }

          // 3. Mark all existing pending bills as Paid to keep history clean
          await supabase.from('bills')
             .update({ status: 'Paid' })
             .eq('customer_id', customer.id)
             .eq('status', 'Pending');

          await supabase.from('payments').insert({
             customer_id: customer.id,
             amount: grandTotalAmount,
             method: 'Cash',
             payment_date: new Date().toISOString(),
             notes: 'Full Settlement from Profile'
          });

          await fetchData();
          setModalConfig({
            isOpen: true,
            title: "Payment Recorded",
            message: "Payment has been recorded and all dues have been settled successfully!",
            type: 'success',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
            confirmText: "Great"
         });
      } catch (err) {
         console.error("Failed to mark as paid:", err);
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

    const handleMarkAsPaid = () => {
      const skip = localStorage.getItem('skip_payment_confirm') === 'true';
      if (skip) {
        runMarkAsPaid();
        return;
      }

      setModalConfig({
        isOpen: true,
        title: "Settle Payment",
        message: `Mark the full balance of ₹${Math.abs(grandTotalAmount).toFixed(2)} as paid in cash?`,
        type: 'success',
        confirmText: "Settle Now",
        showDontShowAgain: true,
        onConfirm: (dontShow) => {
          if (dontShow) localStorage.setItem('skip_payment_confirm', 'true');
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          runMarkAsPaid();
        }
      });
    };

   const changeMonth = (delta: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setViewDate(newDate);
   };

   const monthName = viewDate.toLocaleString('default', { month: 'long' });
   const yearName = viewDate.getFullYear();
   const daysCount = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
   const isCurrentMonth = viewDate.getMonth() === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear();
   const displayDays = isCurrentMonth ? new Date().getDate() : daysCount;

   if (!customer) {
      if (isLoading) return <div className="h-screen flex items-center justify-center font-bold">Loading Cloud Data...</div>;
      return <div className="flex h-full w-full items-center justify-center bg-slate-50 text-zinc-500 flex-col gap-4"><p>Customer not found</p><button onClick={() => router.back()} className="text-primary font-bold">Go Back</button></div>;
   }

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center justify-between gap-4">
               <div className="flex items-center gap-4"><button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-full transition-colors"><ArrowLeft size={20} /></button><div><h1 className="text-base sm:text-lg font-bold">{customer?.name || 'Customer'}</h1><p className="text-[10px] sm:text-xs text-zinc-500">Customer Profile</p></div></div>
               <div className="flex items-center gap-2">
                  <button onClick={() => router.push(`/billing?search=${encodeURIComponent(customer?.name || '')}`)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md shadow-primary/20">
                     <Receipt size={16} />
                     <span className="hidden sm:inline">QR Bill</span>
                  </button>
                  <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl active:scale-90"><Edit2 size={20} /></button>
                  <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl active:scale-90"><Trash2 size={20} /></button>
               </div>
            </div>
         </header>

         <main className="flex flex-col">
            {isLoading ? (
               <div className="max-w-2xl mx-auto w-full px-5 py-8 flex flex-col gap-6">
                  <div className="h-48 bg-white border border-zinc-100 rounded-3xl animate-pulse" />
                  <div className="h-96 bg-white border border-zinc-100 rounded-3xl animate-pulse" />
               </div>
            ) : customer ? (
               <>
                  <div className="bg-white rounded-b-3xl shadow-sm border-b border-zinc-200/50 relative overflow-hidden">
                     <div className="max-w-2xl mx-auto w-full px-6 pb-8 pt-4">
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
                               className={`rounded-2xl p-3 sm:p-4 border cursor-pointer transition-all ${financials?.account_status === 'Credit/Advance' ? 'bg-emerald-50 border-emerald-100' : 'bg-primary/5 border-primary/10'}`}
                               onClick={() => router.push(`/billing?search=${encodeURIComponent(customer.name)}`)}
                            >
                               <div className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-1 sm:mb-2 opacity-80 ${financials?.account_status === 'Credit/Advance' ? 'text-emerald-600' : 'text-primary'}`}>
                                  <Receipt size={12} /> {financials?.account_status === 'Credit/Advance' ? 'Advance' : 'Balance'}
                               </div>
                               <p className={`text-[13px] sm:text-sm font-black ${financials?.account_status === 'Credit/Advance' ? 'text-emerald-600' : 'text-primary'}`}>
                                  {financials ? `₹${Math.abs(financials.current_balance).toFixed(2)}` : '₹0.00'}
                               </p>
                            </div>
                         </div>
                     </div>
                  </div>

                  <div className="max-w-2xl mx-auto w-full px-5 py-2">
                     <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-sm border border-zinc-100">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                           <div><h3 className="text-lg sm:text-xl font-black text-zinc-900">Monthly Ledger</h3><div className="flex items-center gap-2 mt-1"><button onClick={() => changeMonth(-1)} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-50"><ArrowLeft size={14} /></button><p className="text-[10px] sm:text-[11px] font-bold text-zinc-900 uppercase tracking-widest">{monthName} {yearName}</p><button onClick={() => changeMonth(1)} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-50"><ArrowLeft size={14} className="rotate-180" /></button></div></div>
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
                                        <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-xl flex flex-col items-center justify-center font-black bg-zinc-100 text-zinc-400">
                                           <span className="text-[8px] sm:text-[9px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                           <span className="text-base sm:text-lg leading-none">{day}</span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs font-bold text-zinc-400 italic tracking-tight">No delivery record scheduled</p>
                                     </div>
                                     <div className="text-right flex-shrink-0 ml-2">
                                        <p className="font-black text-[13px] sm:text-sm text-zinc-300">₹0</p>
                                     </div>
                                  </div>
                                 );
                              }

                              const dayTotal = dayDeliveries.filter(d => d.delivered).reduce((sum, d) => sum + calculateDeliveryTotal(d), 0);

                              return (
                               <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all bg-white border-zinc-100 hover:border-primary/20">
                                  <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                     <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-xl flex flex-col items-center justify-center font-black bg-primary/10 text-primary">
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
                                                 <span className={`px-1 py-0.5 rounded-[4px] text-[7px] sm:text-[8px] border font-black flex-shrink-0 ${delivery.shift === 'Morning Only' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>{delivery.shift === 'Morning Only' ? 'AM' : 'PM'}</span>
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
                                  <div className="text-right flex-shrink-0 ml-2">
                                     <p className="font-black text-[13px] sm:text-sm text-zinc-900">₹{dayTotal.toFixed(0)}</p>
                                     <p className="text-[8px] sm:text-[10px] font-bold text-zinc-400 uppercase">Total</p>
                                  </div>
                               </div>
                              );
                           })}
                           {deliveries.filter(d => d.delivered).length === 0 && (
                              <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                                 <p className="font-bold">No successful deliveries yet</p>
                                 <p className="text-[10px] uppercase tracking-widest">For {monthName} {yearName}</p>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </>
            ) : (
               <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <X size={48} className="mb-4" />
                  <p className="font-bold">Customer not found</p>
               </div>
            )}

            <div className="max-w-2xl mx-auto w-full px-5 py-6">
               <div className="bg-zinc-900 rounded-[2rem] p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden border border-zinc-800">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] rounded-full -mr-16 -mt-16" />
                  
                  <div className="flex items-center justify-between mb-8 relative z-10">
                     <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Financial Summary</h3>
                     <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${grandTotalAmount < 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-primary/20 text-primary border border-primary/20'}`}>
                        {grandTotalAmount < 0 ? 'Advance Account' : 'Credit Account'}
                     </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 mb-8 relative z-10">
                     <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Past Outstanding</p>
                        <div className="flex flex-col gap-1">
                           <p className={`text-lg font-black ${billsBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>₹{Math.abs(billsBalance).toFixed(2)}</p>
                           <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md w-fit ${billsBalance > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {billsBalance > 0 ? 'Dues' : 'Advance'}
                           </span>
                        </div>
                     </div>
                     <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current Month</p>
                        <div className="flex flex-col gap-1">
                           <p className="text-lg font-black text-zinc-200">₹{currentDeliveriesAmount.toFixed(2)}</p>
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
                        {currentDeliveriesAmount > 0 && (
                           <button
                              onClick={handleGenerateBill}
                              className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/10"
                           >
                              <Receipt size={18} />
                              Generate Monthly Bill
                           </button>
                        )}

                        {grandTotalAmount > 0 && (
                           <button
                              onClick={handleMarkAsPaid}
                              className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                           >
                              <Receipt size={18} />
                              Settle & Mark Paid
                           </button>
                        )}
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
               <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-black text-slate-900">Edit Customer</p><button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button></div>
                     <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
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
                        <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Past Outstanding (₹)</label><input type="number" step="0.01" value={editForm.outstanding} onChange={e => setEditForm({ ...editForm, outstanding: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                        <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-all shadow-xl">Save Changes</button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
}
