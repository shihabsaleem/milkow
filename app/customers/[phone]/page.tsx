"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Clock, Receipt, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/Modal";

export default function CustomerProfilePage() {
   const params = useParams();
   const router = useRouter();
   const phoneId = typeof params?.phone === 'string' ? params.phone : Array.isArray(params?.phone) ? params.phone[0] : '';

   const [customer, setCustomer] = useState<any>(null);
   const [bills, setBills] = useState<any[]>([]);
   const [activeRoute, setActiveRoute] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [viewDate, setViewDate] = useState(new Date(2026, 3, 1));
   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

   useEffect(() => {
      if (!phoneId) return;
      const fetchData = async () => {
         const { data: custData } = await supabase.from('customers').select('*').eq('phone', phoneId).single();
         if (custData) setCustomer(custData);

         const { data: billsData } = await supabase.from('bills').select('*').eq('phone', phoneId);
         if (billsData) setBills(billsData);

         const { data: routeData } = await supabase.from('active_route').select('*').eq('phone', phoneId);
         if (routeData) setActiveRoute(routeData);

         setIsLoading(false);
      };

      fetchData();

      const sub = supabase.channel('cust_profile')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchData)
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, [phoneId]);

   const pendingAmount = bills.filter(b => b.status !== 'Paid').reduce((sum, b) => sum + (b.amount || 0), 0);
   const currentDeliveriesAmount = activeRoute.reduce((acc, d) => acc + ((parseInt(d.qty) || 0) * 50), 0);
   const grandTotalAmount = pendingAmount + currentDeliveriesAmount;

   const toggleStatus = async () => {
      if (!customer) return;
      const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
      try { await supabase.from('customers').update({ status: newStatus }).eq('phone', phoneId); } catch (err) { console.error(err); }
   };

   const deleteCustomer = async () => {
      try {
         setIsLoading(true);
         await supabase.from('customers').delete().eq('phone', phoneId);
         router.push('/customers');
      } catch (err) { console.error(err); setIsLoading(false); }
   };

   const changeMonth = (delta: number) => {
      const newDate = new Date(viewDate); newDate.setMonth(newDate.getMonth() + delta); setViewDate(newDate);
   };

   const monthName = viewDate.toLocaleString('default', { month: 'long' });
   const yearName = viewDate.getFullYear();
   const daysCount = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

   if (!customer) {
      if (isLoading) return <div className="h-screen flex items-center justify-center font-bold">Loading Cloud Data...</div>;
      return <div className="flex h-full w-full items-center justify-center bg-slate-50 text-zinc-500 flex-col gap-4"><p>Customer not found</p><button onClick={() => router.back()} className="text-primary font-bold">Go Back</button></div>;
   }

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center justify-between gap-4">
               <div className="flex items-center gap-4"><button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-full transition-colors"><ArrowLeft size={20} /></button><div><h1 className="text-lg font-bold">{customer.name}</h1><p className="text-xs text-zinc-500">Customer Profile</p></div></div>
               <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl active:scale-90"><Trash2 size={20} /></button>
            </div>
         </header>

         <main className="flex flex-col">
            <div className="bg-white rounded-b-3xl shadow-sm border-b border-zinc-200/50 relative overflow-hidden">
               <div className="max-w-2xl mx-auto w-full px-6 pb-8 pt-4">
                  <div className="flex items-start justify-between mb-6">
                     <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-primary/20">{customer.name.charAt(0)}</div>
                        <div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium"><MapPin size={14} className="text-zinc-400" /> {customer.area}</div><div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium"><Phone size={14} className="text-zinc-400" /> {customer.phone}</div></div>
                     </div>
                     <button onClick={toggleStatus} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${customer.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{customer.status}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-slate-50 rounded-2xl p-4 border border-zinc-100"><div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-2"><Clock size={12} /> Frequency</div><p className="text-sm font-bold text-zinc-800">{customer.frequency}</p></div>
                     <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 cursor-pointer" onClick={() => router.push(`/billing?search=${encodeURIComponent(customer.name)}`)}><div className="flex items-center gap-1.5 text-primary text-[10px] uppercase font-bold tracking-wider mb-2 opacity-80"><Receipt size={12} /> Pending Bills</div><p className="text-sm font-black text-primary">{bills.length > 0 ? `₹${pendingAmount.toFixed(2)}` : 'None'}</p></div>
                  </div>
               </div>
            </div>

            <div className="max-w-2xl mx-auto w-full px-5 py-2">
               <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
                  <div className="flex items-center justify-between mb-8">
                     <div><h3 className="text-xl font-black text-zinc-900">Monthly Ledger</h3><div className="flex items-center gap-2 mt-1"><button onClick={() => changeMonth(-1)} className="p-1 rounded-md text-zinc-400"><ArrowLeft size={14} /></button><p className="text-[11px] font-bold text-zinc-900 uppercase tracking-widest">{monthName} {yearName}</p><button onClick={() => changeMonth(1)} className="p-1 rounded-md text-zinc-400"><ArrowLeft size={14} className="rotate-180" /></button></div></div>
                     <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100"><span className="text-[10px] font-black uppercase">24 Days Delivered</span></div>
                  </div>
                  <div className="flex flex-col gap-3">
                     {Array.from({ length: daysCount }).map((_, i) => {
                        const day = i + 1;
                        const isDelivered = day % 2 === 0; // Mock spread
                        return (
                           <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDelivered ? 'bg-white border-zinc-100 hover:border-primary/20' : 'bg-rose-50/30 border-rose-100 opacity-80'}`}>
                              <div className="flex items-center gap-4"><div className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center font-black ${isDelivered ? 'bg-primary/10 text-primary' : 'bg-rose-100 text-rose-500'}`}><span className="text-[9px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span><span className="text-lg leading-none">{day}</span></div><div><p className={`font-black text-[15px] ${isDelivered ? 'text-zinc-900' : 'text-rose-600'}`}>{isDelivered ? 'Success Delivery' : 'Skipped / Missed'}</p></div></div>
                              <div className="text-right"><p className={`font-black text-sm ${isDelivered ? 'text-zinc-900' : 'text-rose-400'}`}>{isDelivered ? `₹50` : '₹0'}</p><p className="text-[10px] font-bold text-zinc-400">DAILY TOTAL</p></div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>

            <div className="max-w-2xl mx-auto w-full px-5 py-6">
               <div className="bg-zinc-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Grand Total Ledger</h3>
                  <div className="flex flex-col gap-2"><div className="flex justify-between items-center text-sm font-medium text-zinc-400"><span>Pending Invoices</span><span>₹{pendingAmount.toFixed(2)}</span></div><div className="flex justify-between items-center text-sm font-medium text-zinc-400"><span>Today's Live Deliveries</span><span>₹{currentDeliveriesAmount.toFixed(2)}</span></div><div className="flex justify-between items-end mt-2"><span className="text-xs font-black text-zinc-300">CALCULATED TOTAL</span><span className="text-3xl font-black text-primary">₹{grandTotalAmount.toFixed(2)}</span></div></div>
               </div>
            </div>
         </main>

         <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={deleteCustomer} title="Delete Customer" message={`Are you sure you want to delete ${customer.name}? This action cannot be undone.`} confirmText="Yes, Delete" type="danger" />
      </div>
   );
}
