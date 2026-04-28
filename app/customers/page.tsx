"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MapPin, ChevronRight, X, ListOrdered } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/ui/Modal";
import * as T from "@/types/database";
import { checkAndRunAutomations } from "@/lib/automation";
import CustomSelect from "@/components/ui/CustomSelect";

export default function CustomersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState<(T.Customer & { area: T.Area; financials?: T.CustomerFinancials })[]>([]);
  const [areas, setAreas] = useState<T.Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem('milkow_selected_route');
      return saved === null ? "" : saved;
    }
    return "";
  });
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    area_id: "",
    frequency: "Morning Only",
    outstanding: "",
    default_qty: "1",
    default_product_id: ""
  });
  const [products, setProducts] = useState<T.Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [
      { data: custs },
      { data: areaList },
      { data: productList },
      { data: financialData }
    ] = await Promise.all([
      supabase.from('customers').select('*, area:areas(*)').order('name', { ascending: true }),
      supabase.from('areas').select('*').order('name', { ascending: true }),
      supabase.from('products').select('*').order('name', { ascending: true }),
      supabase.from('customer_financials').select('*')
    ]);

    if (custs) {
      const merged = (custs as any[]).map(c => ({
        ...c,
        financials: (financialData as T.CustomerFinancials[] || []).find(f => f.id === c.id)
      }));
      setCustomers(merged);
    }
    if (areaList) setAreas(areaList as T.Area[]);
    if (productList) setProducts(productList as T.Product[]);
    setIsLoading(false);
  }, []);

  // 1. DATA LOAD & SYNC
  useEffect(() => {
    fetchData();

    const sub = supabase.channel('cust_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchData)
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [fetchData]);

  useEffect(() => {
    localStorage.setItem('milkow_selected_route', selectedAreaId);
  }, [selectedAreaId]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info' | 'success';
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: 'info'
  });

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.area_id) return;
    try {
      setIsSubmitting(true);

      // 1. Auto-append at end of route: last delivery_order + 1000
      const { data: lastCustomer } = await supabase
        .from('customers')
        .select('delivery_order')
        .eq('area_id', parseInt(newCustomer.area_id))
        .order('delivery_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newOrder = lastCustomer ? Number(lastCustomer.delivery_order) + 1000 : 1000;

      // 2. Insert with the new delivery_order
      const { error: insertError } = await supabase.from('customers').insert({
        name: newCustomer.name,
        phone: newCustomer.phone,
        area_id: parseInt(newCustomer.area_id),
        frequency: newCustomer.frequency,
        status: 'Active',
        default_qty: parseInt(newCustomer.default_qty) || 1,
        default_product_id: newCustomer.default_product_id || null,
        past_outstanding: parseFloat(newCustomer.outstanding) || 0,
        delivery_order: newOrder
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      // 🚀 Sync route immediately
      await checkAndRunAutomations();

      setIsModalOpen(false);
      setNewCustomer({
        name: "",
        phone: "",
        area_id: "",
        frequency: "Morning Only",
        outstanding: "",
        default_qty: "1",
        default_product_id: ""
      });
      await fetchData();

      setModalConfig({
        isOpen: true,
        title: "Registration Success",
        message: `${newCustomer.name} has been added to the system successfully!`,
        type: 'success',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        confirmText: "Great"
      });
    } catch (err: any) {
      console.error("Failed to add customer:", err);
      setModalConfig({
        isOpen: true,
        title: "Registration Failed",
        message: err.message || "Something went wrong while adding the customer. Please try again.",
        type: 'danger',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        confirmText: "Try Again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesArea = selectedAreaId === "" || c.area_id?.toString() === selectedAreaId;
    return matchesSearch && matchesArea;
  });

  return (
    <div className="min-h-full w-full pb-32 bg-zinc-50/50">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-2xl mx-auto px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[20px] font-black text-zinc-900 leading-none">Customers</p>
              <p className="text-[12px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{customers.length} Subscribers</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/route" className="h-10 w-10 bg-zinc-100 text-zinc-500 rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-all" title="Reorder route">
                <ListOrdered size={18} />
              </Link>
              <button onClick={() => setIsModalOpen(true)} className="h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-3/4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 transition-all shadow-sm" />
            </div></div>
            <div className="w-1/4">
            <CustomSelect
              fullWidth={true}
              className="min-w-[160px]"
              options={[
                { value: "", label: "All Routes" },
                ...areas.map(a => ({ value: a.id.toString(), label: a.name }))
              ]}
              value={selectedAreaId}
              onChange={(val) => setSelectedAreaId(val)}
            /></div>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-3">
        {isLoading ? (
          [1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-white border border-black/5 rounded-2xl animate-pulse" />)
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer, i) => (
            <motion.div
              key={i}
              layout
              onClick={() => {
                if (customer.id) router.push(`/customers/${customer.id}`);
              }}
              className="bg-white border border-black/5 p-5 rounded-2xl flex items-center justify-between hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black ${customer.status === 'Active' ? 'bg-primary/10 text-primary' : 'bg-zinc-100 text-zinc-400'}`}>{customer.name.charAt(0)}</div>
                <div>
                  <h3 className="font-bold text-zinc-900 group-hover:text-primary transition-colors">{customer.name}</h3>
                  <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {customer.area?.name || 'No Area'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-2">
                  <p className={`text-[14px] font-black ${customer.financials && customer.financials.current_balance < 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
                    ₹{Math.abs(customer.financials?.current_balance || 0).toLocaleString()}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-tighter ${customer.financials && customer.financials.current_balance < 0 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                    {customer.financials && customer.financials.current_balance < 0 ? 'Advance' : 'Credit'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/billing?search=${encodeURIComponent(customer.name)}`);
                  }}
                  className="p-2.5 bg-primary/5 text-primary rounded-xl hover:bg-primary/10 transition-colors border border-primary/10 flex items-center gap-2"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">QR Bill</span>
                  <ChevronRight size={18} className="text-primary/50 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <Search size={48} className="mb-4" />
            <p className="font-bold text-zinc-500">No customers found</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center"><p className="text-[18px] font-black text-slate-900">New Onboarding</p><button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button></div>
              <form onSubmit={handleAddCustomer} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">FullName</label><input autoFocus placeholder="e.g. Sayas Rahman" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Phone</label><input placeholder="9876543210" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                  <CustomSelect
                    label="Route"
                    options={areas.map(a => ({ value: a.id.toString(), label: a.name }))}
                    value={newCustomer.area_id}
                    onChange={val => setNewCustomer({ ...newCustomer, area_id: val })}
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
                  value={newCustomer.frequency}
                  onChange={val => setNewCustomer({ ...newCustomer, frequency: val })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <CustomSelect
                    label="Daily Product"
                    options={products.map(p => ({ value: p.id, label: `${p.name} (${p.size})` }))}
                    value={newCustomer.default_product_id}
                    onChange={val => setNewCustomer({ ...newCustomer, default_product_id: val })}
                    placeholder="Select Product"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Daily Qty</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newCustomer.default_qty}
                      onChange={e => setNewCustomer({ ...newCustomer, default_qty: e.target.value })}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Past Outstanding (₹)</label><input type="number" placeholder="0.00" value={newCustomer.outstanding} onChange={e => setNewCustomer({ ...newCustomer, outstanding: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-all shadow-xl">Complete Registration</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
      />
    </div>
  );
}
