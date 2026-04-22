"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Clock, Receipt, Trash2, Edit2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/Modal";
import * as T from "@/types/database";

export default function CustomerProfilePage() {
   const params = useParams();
   const router = useRouter();
   const phoneId = typeof params?.phone === 'string' ? params.phone : Array.isArray(params?.phone) ? params.phone[0] : '';

   const [customer, setCustomer] = useState<(T.Customer & { area: T.Area }) | null>(null);
   const [bills, setBills] = useState<T.Bill[]>([]);
   const [deliveries, setDeliveries] = useState<T.Delivery[]>([]);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [viewDate, setViewDate] = useState(new Date());
   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [areas, setAreas] = useState<T.Area[]>([]);
   const [editForm, setEditForm] = useState({ name: "", phone: "", area_id: "", frequency: "Morning Only" });

   useEffect(() => {
      if (!phoneId) return;
      const fetchData = async () => {
         // 1. Fetch Customer with Area Join
         const { data: custData } = await supabase
            .from('customers')
            .select('*, area:areas(*)')
            .eq('phone', phoneId)
            .single();

         // Fetch Areas for Edit Modal
         const { data: areaList } = await supabase.from('areas').select('*').order('name', { ascending: true });
         if (areaList) setAreas(areaList as T.Area[]);

         if (custData) {
            setCustomer(custData as (T.Customer & { area: T.Area }));
            setEditForm({
               name: custData.name,
               phone: custData.phone,
               area_id: custData.area_id?.toString() || "",
               frequency: custData.frequency
            });
            const customerId = custData.id;

            // 2. Fetch Bills
            const { data: billsData } = await supabase
               .from('bills')
               .select('*')
               .eq('customer_id', customerId)
               .order('created_at', { ascending: false });
            if (billsData) setBills(billsData as T.Bill[]);

            // 3. Fetch Deliveries for the current month
            const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString().split('T')[0];
            const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).toISOString().split('T')[0];

            const { data: deliveryData } = await supabase
               .from('deliveries')
               .select('*')
               .eq('customer_id', customerId)
               .gte('delivery_date', monthStart)
               .lte('delivery_date', monthEnd)
               .order('delivery_date', { ascending: true });
            if (deliveryData) setDeliveries(deliveryData as T.Delivery[]);

            // 4. Fetch Products for pricing
            const { data: productData } = await supabase.from('products').select('*');
            if (productData) setProducts(productData as T.Product[]);
         }

         setIsLoading(false);
      };

      fetchData();

      const sub = supabase.channel('cust_profile')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchData)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchData)
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, [phoneId, viewDate]);

   const prices: Record<string, number> = {};
   products.forEach(p => prices[p.name] = Number(p.price));
   const milkPrice = prices[Object.keys(prices).find(n => n.toLowerCase().includes('milk')) || ''] || 50;

   const calculateDeliveryTotal = (d: T.Delivery) => {
      let total = (Number(d.milk_qty) || 0) * milkPrice;
      const extras = d.misc_items || [];
      extras.forEach((item: any) => {
         const itemPrice = prices[item.name] || 0;
         total += (item.qty || 0) * itemPrice;
      });
      return total;
   };

   const pendingAmount = bills.filter(b => b.status !== 'Paid').reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
   const unbilledDeliveries = deliveries.filter(d => d.delivered);
   const currentDeliveriesAmount = unbilledDeliveries.reduce((acc, d) => acc + calculateDeliveryTotal(d), 0);
   const grandTotalAmount = pendingAmount + currentDeliveriesAmount;

   const toggleStatus = async () => {
      if (!customer) return;
      const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
      try { 
         await supabase.from('customers').update({ status: newStatus }).eq('id', customer.id); 
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
            frequency: editForm.frequency
         }).eq('id', customer.id);
         setIsEditModalOpen(false);
         if (editForm.phone !== customer.phone) {
            router.push(`/customers/${editForm.phone}`);
         } else {
            setIsLoading(false);
         }
      } catch (err) {
         console.error(err);
         setIsLoading(false);
      }
   };

   const changeMonth = (delta: number) => {
      const newDate = new Date(viewDate); 
      newDate.setMonth(newDate.getMonth() + delta); 
      setViewDate(newDate);
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
               <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl active:scale-90"><Edit2 size={20} /></button>
                  <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl active:scale-90"><Trash2 size={20} /></button>
               </div>
            </div>
         </header>

         <main className="flex flex-col">
            <div className="bg-white rounded-b-3xl shadow-sm border-b border-zinc-200/50 relative overflow-hidden">
               <div className="max-w-2xl mx-auto w-full px-6 pb-8 pt-4">
                  <div className="flex items-start justify-between mb-6">
                     <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-primary/20">{customer.name.charAt(0)}</div>
                        <div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium"><MapPin size={14} className="text-zinc-400" /> {customer.area?.name || 'No Area'}</div><div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium"><Phone size={14} className="text-zinc-400" /> {customer.phone}</div></div>
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
                     <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100"><span className="text-[10px] font-black uppercase">{deliveries.filter(d => d.delivered).length} Days Delivered</span></div>
                  </div>
                  <div className="flex flex-col gap-3">
                     {Array.from({ length: daysCount }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${yearName}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const delivery = deliveries.find(d => d.delivery_date === dateStr);
                        
                        // ONLY list delivery success or if it has misc items and marked delivered
                        if (!delivery || !delivery.delivered) return null;

                        const dailyTotal = calculateDeliveryTotal(delivery);
                        const hasMisc = (delivery.misc_items || []).length > 0;
                        
                        return (
                           <div key={i} className="flex items-center justify-between p-4 rounded-2xl border transition-all bg-white border-zinc-100 hover:border-primary/20">
                              <div className="flex items-center gap-4">
                                 <div className="h-12 w-12 rounded-xl flex flex-col items-center justify-center font-black bg-primary/10 text-primary">
                                    <span className="text-[9px] uppercase leading-none mb-0.5 opacity-60 font-bold">{monthName.slice(0, 3)}</span>
                                    <span className="text-lg leading-none">{day}</span>
                                 </div>
                                 <div>
                                    <p className="font-black text-[15px] text-zinc-900">
                                       {delivery.milk_qty > 0 ? `${delivery.milk_qty} Milk` : ''} 
                                       {delivery.milk_qty > 0 && hasMisc ? ' + ' : ''}
                                       {hasMisc ? 'Extras' : (delivery.milk_qty === 0 ? 'Misc Purchase' : '')}
                                    </p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Delivery Success</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="font-black text-sm text-zinc-900">₹{dailyTotal.toFixed(0)}</p>
                                 <p className="text-[10px] font-bold text-zinc-400">DAILY TOTAL</p>
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

            <div className="max-w-2xl mx-auto w-full px-5 py-6">
               <div className="bg-zinc-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Grand Total Ledger</h3>
                  <div className="flex flex-col gap-2"><div className="flex justify-between items-center text-sm font-medium text-zinc-400"><span>Pending Invoices</span><span>₹{pendingAmount.toFixed(2)}</span></div><div className="flex justify-between items-center text-sm font-medium text-zinc-400"><span>Unbilled Deliveries</span><span>₹{currentDeliveriesAmount.toFixed(2)}</span></div><div className="flex justify-between items-end mt-2"><span className="text-xs font-black text-zinc-300">CALCULATED TOTAL</span><span className="text-3xl font-black text-primary">₹{grandTotalAmount.toFixed(2)}</span></div></div>
               </div>
            </div>
         </main>

         <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={deleteCustomer} title="Delete Customer" message={`Are you sure you want to delete ${customer.name}? This action cannot be undone.`} confirmText="Yes, Delete" type="danger" />

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
                           <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Route</label>
                              <select value={editForm.area_id} onChange={e => setEditForm({ ...editForm, area_id: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all">
                                 <option value="">Select Route</option>
                                 {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                           </div>
                        </div>
                        <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Delivery Frequency</label>
                           <select value={editForm.frequency} onChange={e => setEditForm({ ...editForm, frequency: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all">
                              <option value="Morning Only">Morning Only</option>
                              <option value="Evening Only">Evening Only</option>
                              <option value="Morning & Evening">Morning & Evening</option>
                           </select>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-all shadow-xl">Save Changes</button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
}
