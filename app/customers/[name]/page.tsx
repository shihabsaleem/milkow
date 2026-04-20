"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Clock, Package, Receipt } from "lucide-react";
import { useState } from "react";
import data from "../../../data/data.json";

export default function CustomerProfilePage() {
   const params = useParams();
   const router = useRouter();

   const rawName = typeof params?.name === 'string' ? params.name : Array.isArray(params?.name) ? params.name[0] : '';
   const customerName = decodeURIComponent(rawName);

   const customer = data.users.find(u => u.name === customerName);
   const bills = data.bills.filter(b => b.name === customerName);
   const deliveries = data.route.filter(r => r.name === customerName);

   const pendingAmount = bills.reduce((sum, b) => sum + b.amount, 0);
   const currentDeliveriesAmount = deliveries.reduce((acc, d) => {
      const milkCost = (parseInt(d.qty) || 0) * 50;
      let extraCost = 0;
      if (d.misc) {
         const product = data.products.find(p => d.misc && d.misc.includes(p.name));
         if (product) extraCost += parseInt(product.price.replace(/\D/g, ''));
      }
      return acc + milkCost + extraCost;
   }, 0);
   const grandTotalAmount = pendingAmount + currentDeliveriesAmount;

   const [status, setStatus] = useState(customer?.status || 'Active');
   const [viewDate, setViewDate] = useState(new Date(2026, 3, 1)); // April 2026 default

   const changeMonth = (delta: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setViewDate(newDate);
   };

   const getDaysInMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
   };

   const monthName = viewDate.toLocaleString('default', { month: 'long' });
   const yearName = viewDate.getFullYear();
   const daysCount = getDaysInMonth(viewDate);

   const toggleStatus = () => {
      if (!customer) return;
      const newStatus = status === 'Active' ? 'Inactive' : 'Active';
      setStatus(newStatus);
      customer.status = newStatus; // Mutate cached state for session sync
   };

   if (!customer) {
      return (
         <div className="flex h-full w-full items-center justify-center bg-slate-50 text-zinc-500 flex-col gap-4">
            <p>Customer not found</p>
            <button onClick={() => router.back()} className="text-primary font-bold">Go Back</button>
         </div>
      );
   }

   return (
      <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
         {/* HEADER */}
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 text-zinc-900">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex items-center gap-4">
               <button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-full transition-colors active:scale-95">
                  <ArrowLeft size={20} />
               </button>
               <div>
                  <h1 className="text-lg font-bold">{customer.name}</h1>
                  <p className="text-xs text-zinc-500">Customer Profile</p>
               </div>
            </div>
         </header>

         <main className="flex flex-col">
            {/* Top Profile Card */}
            <div className="bg-white text-zinc-900 rounded-b-3xl shadow-sm border-b border-zinc-200/50 relative overflow-hidden">
               <div className="max-w-2xl mx-auto w-full px-6 pb-8 pt-4">
                  <div className="flex items-start justify-between mb-6">
                     <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-primary/20">
                           {customer.name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium">
                              <MapPin size={14} className="text-zinc-400" /> {customer.area}
                           </div>
                           <div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium">
                              <Phone size={14} className="text-zinc-400" /> {customer.phone}
                           </div>
                        </div>
                     </div>
                     <button 
                        onClick={toggleStatus}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}
                     >
                        {status}
                     </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-slate-50 rounded-2xl p-4 border border-zinc-100">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-2">
                           <Clock size={12} /> Frequency
                        </div>
                        <p className="text-sm font-bold text-zinc-800">{customer.frequency}</p>
                     </div>
                     <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors shadow-xs" onClick={() => router.push(`/billing?search=${encodeURIComponent(customer.name)}`)}>
                        <div className="flex items-center gap-1.5 text-primary text-[10px] uppercase font-bold tracking-wider mb-2 opacity-80">
                           <Receipt size={12} /> Pending Bills
                        </div>
                        <p className="text-sm font-black text-primary">{bills.length > 0 ? `₹${pendingAmount.toFixed(2)}` : 'None'}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Monthly Delivery Ledger */}
            <div className="max-w-2xl mx-auto w-full px-5 py-2">
               <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-xl font-black text-zinc-900">Monthly Ledger</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <button onClick={() => changeMonth(-1)} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"><ArrowLeft size={14} /></button>
                           <p className="text-[11px] font-bold text-zinc-900 uppercase tracking-widest">{monthName} {yearName}</p>
                           <button onClick={() => changeMonth(1)} className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"><ArrowLeft size={14} className="rotate-180" /></button>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-black uppercase">24 Days Delivered</span>
                     </div>
                  </div>

                  <div className="flex flex-col gap-3">
                     {Array.from({ length: daysCount }).map((_, i) => {
                        const day = i + 1;
                        const isDelivered = [0, 1, 2, 3, 4, 10, 11, 15, 18, 20, 24, 25, 27, 28, 29].includes(day % 10) || day % 4 !== 0; // Better mock spread
                        // Simplified check for upcoming: only if year/month matches current real time
                        const isUpcoming = yearName >= 2026 && viewDate.getMonth() >= 3 && day > 20; 

                        return (
                           <div 
                              key={i} 
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDelivered ? 'bg-white border-zinc-100 hover:border-primary/20 hover:shadow-md' : 'bg-rose-50/30 border-rose-100 opacity-80'}`}
                           >
                              <div className="flex items-center gap-4">
                                 <div className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center font-black ${isDelivered ? 'bg-primary/10 text-primary' : 'bg-rose-100 text-rose-500'}`}>
                                    <span className="text-[9px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                    <span className="text-lg leading-none">{day}</span>
                                 </div>
                                 <div>
                                    <p className={`font-black text-[15px] ${isDelivered ? 'text-zinc-900' : 'text-rose-600'}`}>
                                       {isDelivered ? 'Success Delivery' : 'Skipped / Missed'}
                                    </p>
                                    {isDelivered && (
                                       <div className="flex flex-wrap gap-2 mt-1">
                                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                             <div className="h-1 w-1 rounded-full bg-primary" /> {customer.frequency === 'Morning & Evening' ? '2 Bottles Milk' : '1 Bottle Milk'}
                                          </span>
                                          {day % 7 === 0 && (
                                             <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100">
                                                <div className="h-1 w-1 rounded-full bg-emerald-500" /> Fresh Curd (+1)
                                             </span>
                                          )}
                                       </div>
                                    )}
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className={`font-black text-sm ${isDelivered ? 'text-zinc-900' : 'text-rose-400'}`}>
                                    {isDelivered ? `₹${(customer.frequency === 'Morning & Evening' ? 100 : 50) + (day % 7 === 0 ? 120 : 0)}` : '₹0'}
                                 </p>
                                 <p className="text-[10px] font-bold text-zinc-400">DAILY TOTAL</p>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>

            {/* Financial Summary */}
            <div className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
               {/* Grand Total Ledger */}
               <div className="bg-zinc-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-5 text-white pointer-events-none">
                     <Receipt size={140} />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 relative z-10">Grand Total Ledger</h3>
                  
                  <div className="flex flex-col gap-2 relative z-10">
                     <div className="flex justify-between items-center text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors">
                        <span>Pending Invoices</span>
                        <span>₹{pendingAmount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors">
                        <span>Today's Live Deliveries</span>
                        <span>₹{currentDeliveriesAmount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors pb-3 border-b border-zinc-800">
                        <span>Past Outstanding (Migrated)</span>
                        <span>₹0.00</span>
                     </div>
                     <div className="flex justify-between items-end mt-2">
                        <span className="text-xs font-black text-zinc-300">CALCULATED TOTAL</span>
                        <span className="text-3xl font-black text-primary">₹{grandTotalAmount.toFixed(2)}</span>
                     </div>
                  </div>
               </div>

            </div>
         </main>
      </div>
   );
}
