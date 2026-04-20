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

            {/* Purchase History */}
            <div className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
               <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-2">
                  <Package size={16} /> Recent Purchases
               </h2>

               {/* Current/Latest delivery */}
               {deliveries.length > 0 ? deliveries.map((d, i) => {
                  const milkQty = parseInt(d.qty) || 0;
                  const milkCost = milkQty * 50; // Assume ₹50 per standardized bottle
                  let extraCost = 0;
                  let extraItems: { name: string, cost: number }[] = [];

                  if (d.misc) {
                     const product = data.products.find(p => d.misc && d.misc.includes(p.name));
                     if (product) {
                        const cost = parseInt(product.price.replace(/\D/g, ''));
                        extraCost += cost;
                        extraItems.push({ name: product.name, cost });
                     }
                  }

                  const totalCost = milkCost + extraCost;

                  return (
                     <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex items-start gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-full w-1 bg-emerald-500"></div>
                        <div className="bg-primary/10 text-primary p-3 rounded-xl z-10 bg-white">
                           <Package size={20} />
                        </div>
                        <div className="flex-1 w-full">
                           <div className="flex justify-between items-start">
                              <p className="font-bold text-zinc-900">Morning Delivery</p>
                              <p className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">Today</p>
                           </div>



                           {/* Price Breakdown */}
                           <div className="mt-3 bg-slate-50 border border-zinc-100 rounded-xl p-3 text-[11px] flex flex-col gap-1.5 shadow-sm">
                              <div className="flex justify-between text-zinc-500 font-medium">
                                 <span>{milkQty}x Standard Milk @ ₹50</span>
                                 <span>₹{milkCost}</span>
                              </div>
                              {extraItems.map((item, idx) => (
                                 <div key={idx} className="flex justify-between text-zinc-500 font-medium">
                                    <span>1x {item.name}</span>
                                    <span>₹{item.cost}</span>
                                 </div>
                              ))}
                              <div className="flex justify-between items-center border-t border-zinc-200 mt-1 pt-2">
                                 <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Daily Total</span>
                                 <span className="font-black text-sm text-zinc-900">₹{totalCost}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  );
               }) : (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex items-start gap-4">
                     <div className="bg-primary/10 text-primary p-3 rounded-xl">
                        <Package size={20} />
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                           <p className="font-bold text-zinc-900">Standard Delivery</p>
                           <p className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">Today</p>
                        </div>
                        <p className="text-sm text-primary font-bold mt-1">2 Bottles Milk</p>
                     </div>
                  </div>
               )}

               {/* Mock Historical Deliveries to make it look active */}
               <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200 flex items-start gap-4 opacity-70">
                  <div className="bg-zinc-100 text-zinc-500 p-3 rounded-xl">
                     <Package size={20} />
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-start">
                        <p className="font-bold text-zinc-900">Standard Delivery</p>
                        <p className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">Yesterday</p>
                     </div>
                     <p className="text-sm text-zinc-700 font-bold mt-1">1 Bottle Milk</p>
                     <p className="text-[11px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-100 inline-block px-2 py-1 rounded-lg mt-2">
                        <span className="font-bold text-primary">+ Extra: </span> Fresh Curd (500g)
                     </p>
                  </div>
               </div>

               <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200 flex items-start gap-4 opacity-70">
                  <div className="bg-zinc-100 text-zinc-500 p-3 rounded-xl">
                     <Package size={20} />
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-start">
                        <p className="font-bold text-zinc-900">Standard Delivery</p>
                        <p className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">2 Days Ago</p>
                     </div>
                     <p className="text-sm text-zinc-700 font-bold mt-1">2 Bottles Milk</p>
                  </div>
               </div>

               {/* Grand Total Ledger */}
               <div className="bg-zinc-900 rounded-3xl p-6 mt-2 shadow-xl text-white relative overflow-hidden">
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
