"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Search, User, MapPin, Phone, ArrowUpRight, ChevronRight, X, UserMinus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", area: "", frequency: "Morning" });
  const [isSyncing, setIsSyncing] = useState(true);

  // 1. DATA LOAD & SYNC
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('*').order('name', { ascending: true });
      if (data) setCustomers(data);
      setIsSyncing(false);
    };

    fetchCustomers();

    const sub = supabase.channel('cust_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchCustomers)
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) return;
    try {
      await supabase.from('customers').insert({
        ...newCustomer,
        status: 'Active',
        outstanding: 0
      });
      setIsModalOpen(false);
      setNewCustomer({ name: "", phone: "", area: "", frequency: "Morning" });
    } catch (err) { console.error(err); }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="min-h-full w-full pb-32 bg-zinc-50/50">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-2xl mx-auto px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div><p className="text-[20px] font-black text-zinc-900 leading-none">Customers</p><p className="text-[12px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{customers.length} Subscribers</p></div>
            <button onClick={() => setIsModalOpen(true)} className="h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><Plus size={20} /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 transition-all shadow-sm" />
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-3">
        {filteredCustomers.map((customer, i) => (
          <Link key={i} href={`/customers/${customer.phone}`}>
            <motion.div layout className="bg-white border border-zinc-100 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black ${customer.status === 'Active' ? 'bg-primary/10 text-primary' : 'bg-zinc-100 text-zinc-400'}`}>{customer.name.charAt(0)}</div>
                <div><h3 className="font-bold text-zinc-900 group-hover:text-primary transition-colors">{customer.name}</h3><p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {customer.area}</p></div>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
            </motion.div>
          </Link>
        ))}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center"><p className="text-[18px] font-black text-slate-900">New Onboarding</p><button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button></div>
              <form onSubmit={handleAddCustomer} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">FullName</label><input autoFocus placeholder="e.g. Rahul Sharma" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Phone</label><input placeholder="9876543210" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Area</label><input placeholder="Phase 1" value={newCustomer.area} onChange={e => setNewCustomer({ ...newCustomer, area: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-all shadow-xl">Complete Registration</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
