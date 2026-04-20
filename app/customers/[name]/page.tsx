"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Clock, Package, Receipt } from "lucide-react";
import data from "../../../data/data.json";

export default function CustomerProfilePage() {
   const params = useParams();
   const router = useRouter();

   const rawName = typeof params?.name === 'string' ? params.name : Array.isArray(params?.name) ? params.name[0] : '';
   const customerName = decodeURIComponent(rawName);

   const customer = data.users.find(u => u.name === customerName);
   const bills = data.bills.filter(b => b.name === customerName);
   const deliveries = data.route.filter(r => r.name === customerName);

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
         <header className="sticky top-0 z-40 bg-zinc-900 text-white px-5 py-4 flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors active:scale-95">
               <ArrowLeft size={20} />
            </button>
            <div>
               <h1 className="text-lg font-bold">{customer.name}</h1>
               <p className="text-xs text-zinc-400">Customer Profile</p>
            </div>
         </header>

         <main className="flex flex-col">
            {/* Top Profile Card */}
            <div className="bg-zinc-900 text-white px-6 pb-8 pt-4 rounded-b-3xl shadow-lg">
               <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center text-2xl font-black text-primary backdrop-blur-md border border-primary/30">
                     {customer.name.charAt(0)}
                  </div>
                  <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-1.5 text-zinc-300 text-sm">
                        <MapPin size={14} /> {customer.area}
                     </div>
                     <div className="flex items-center gap-1.5 text-zinc-300 text-sm">
                        <Phone size={14} /> {customer.phone}
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/5">
                     <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                        <Clock size={12} /> Frequency
                     </div>
                     <p className="text-sm font-semibold">{customer.frequency}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/5 cursor-pointer hover:bg-white/20 transition-colors" onClick={() => router.push(`/billing?search=${encodeURIComponent(customer.name)}`)}>
                     <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                        <Receipt size={12} /> Pending Bills
                     </div>
                     <p className="text-sm font-semibold text-rose-400">{bills.length > 0 ? `$${bills.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}` : 'None'}</p>
                  </div>
               </div>
            </div>

            {/* Purchase History */}
            <div className="px-5 py-6 flex flex-col gap-4">
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

            </div>
         </main>
      </div>
   );
}
