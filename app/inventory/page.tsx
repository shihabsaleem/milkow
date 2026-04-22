"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, ChevronRight, X, Calendar as CalendarIcon, Droplet, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";

type PipelineStage = { label: string; value: number; unit: string; id: number };

export default function InventoryPage() {
  const [date, setDate] = useState("2026-04-20");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [products, setProducts] = useState<T.Product[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", size: "", stock: "", price: 0 });
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setNewProduct({ ...products[index], stock: products[index].stock?.toString() || "0", price: Number(products[index].price) || 0 });
    setIsModalOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: prods } = await supabase.from('products').select('*');
      if (prods) setProducts(prods as T.Product[]);

      const { data: pipes } = await supabase.from('inventory').select('*'); 
      // Note: mapping 'inventory' to pipeline for this view
      if (pipes) setPipeline((pipes as T.InventoryItem[]).map(p => ({ label: p.name, value: p.count, unit: p.unit, id: p.id })));
    };

    fetchData();

    const sub = supabase.channel('inv_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, fetchData)
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    try {
       const productToSave = {
         name: newProduct.name,
         size: newProduct.size,
         stock: parseInt(newProduct.stock.toString() || "0"),
         price: Number(newProduct.price) || 0
       };
       
       if (editingIndex !== null && products[editingIndex].id) {
          await supabase.from('products').update(productToSave).eq('id', products[editingIndex].id);
       } else {
          await supabase.from('products').insert(productToSave);
       }
       setIsModalOpen(false);
       setNewProduct({ name: "", size: "", stock: "", price: 0 });
       setEditingIndex(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteProduct = async () => {
    if (editingIndex === null || !products[editingIndex].id) return;
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
       await supabase.from('products').delete().eq('id', products[editingIndex].id);
       setIsModalOpen(false);
       setEditingIndex(null);
    } catch (err) { console.error(err); }
  };

  const updatePipelineValue = async (id: number, newValue: string) => {
    const numValue = parseInt(newValue) || 0;
    
    // 1. Optimistic UI update
    setPipeline(prev => prev.map(p => p.id === id ? { ...p, value: numValue } : p));

    try {
       // 2. Sync to Supabase
       const { error } = await supabase.from('inventory').update({ count: numValue }).eq('id', id);
       if (error) throw error;
    } catch (err) { 
      console.error(err);
      // Revert if failed (fetch data again)
      const { data } = await supabase.from('inventory').select('*');
      if (data) setPipeline((data as T.InventoryItem[]).map(p => ({ label: p.name, value: p.count, unit: p.unit, id: p.id })));
    }
  };

  return (
    <div className="min-h-full w-full pb-32 bg-slate-50">
      <div className="sticky top-0 z-40 border-b bg-slate-50/90 border-black/5 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div><p className="text-[20px] font-extrabold text-zinc-900">Inventory</p><p className="text-[13px] font-medium text-zinc-400">Stock & Pipeline</p></div>
            <button onClick={() => { setEditingIndex(null); setNewProduct({ name: "", size: "", stock: "", price: 0 }); setIsModalOpen(true); }} className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><Plus size={20} /></button>
          </div>
          <div className="w-full bg-white border border-slate-200/60 rounded-2xl p-3.5 flex items-center gap-3 relative shadow-sm" onClick={() => dateInputRef.current?.showPicker()}>
            <div className="p-2 bg-primary/10 text-primary rounded-xl"><CalendarIcon size={18} /></div>
            <div className="flex flex-col"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">Inventory Date</p><p className="text-[14px] font-bold text-slate-900 leading-none">{fmtDate(date)}</p></div>
            <input ref={dateInputRef} type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="ml-auto text-slate-300"><ChevronRight size={16} /></div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-6 flex flex-col gap-7">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest mb-3 text-zinc-400">Supply Pipeline</p>
          <div className="grid grid-cols-2 gap-3">
            {pipeline.map((stage, i) => (
              <div key={i} className="rounded-2xl p-4 flex flex-col gap-3 transition-transform bg-primary/10 border-2 border-primary/5">
                <div className="text-primary"><Droplet size={20} /></div>
                <div><p className="text-[13px] font-semibold text-zinc-600">{stage.label}</p><div className="flex items-center mt-1"><input type="number" value={stage.value} onChange={(e) => updatePipelineValue(stage.id, e.target.value)} className="w-3/4 md:w-1/3 relative z-20 bg-white text-[26px] font-extrabold rounded-xl py-1.5 px-2 text-primary focus:outline-none" /><span className="text-[13px] font-medium ml-2 flex-shrink-0 text-zinc-400">{stage.unit}</span></div></div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3"><p className="text-[12px] font-bold uppercase tracking-widest text-zinc-400">Products</p><button onClick={() => { setEditingIndex(null); setNewProduct({ name: "", size: "", stock: "", price: 0 }); setIsModalOpen(true); }} className="text-[12px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all text-primary bg-primary/10"><Plus size={13} /> Add</button></div>
          <div className="flex flex-col gap-2.5">
            {products.map((p, i) => (
              <div key={i} onClick={() => openEditModal(i)} className="flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer bg-white border-black/5">
                <div><p className="text-[15px] font-bold text-zinc-900">{p.name}</p><p className="text-[12px] font-medium mt-0.5 text-zinc-400">{p.size} · {p.stock} in stock</p></div>
                <div className="flex flex-col items-end"><p className="text-[16px] font-black text-primary">₹{p.price}</p><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Selling Price</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center"><p className="text-[18px] font-black text-slate-900">{editingIndex !== null ? "Edit Product" : "New Product"}</p><button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button></div>
              <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Name</label><input autoFocus placeholder="e.g. Cow Milk" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Size</label><input placeholder="e.g. 1L" value={newProduct.size} onChange={e => setNewProduct({ ...newProduct, size: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Price</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">₹</span><input placeholder="90" type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-4 py-3 text-sm font-bold focus:ring-2 transition-all" /></div></div>
                </div>
                <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Initial Stock</label><input type="number" placeholder="0" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                <div className="flex gap-2 mt-2">
                  {editingIndex !== null && (
                    <button type="button" onClick={handleDeleteProduct} className="flex-shrink-0 w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-100 transition-colors"><Trash2 size={20} /></button>
                  )}
                  <button type="submit" className="flex-grow bg-slate-900 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-xl">{editingIndex !== null ? "Save Changes" : "Create Product"}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
