"use client";

import { useState, useRef } from "react";
import { Plus, Box, ThermometerSnowflake, ChevronRight, X, Calendar as CalendarIcon, Droplet, Milk, MilkOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import data from "../../data/data.json";

export default function InventoryPage() {
  const [date, setDate] = useState("2026-04-20");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pipeline, setPipeline] = useState(data.pipeline);
  const [products, setProducts] = useState(data.products);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", size: "", stock: "", price: "" });
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    if (editingIndex !== null) {
      const updated = [...products];
      updated[editingIndex] = { ...newProduct, stock: parseInt(newProduct.stock.toString() || "0") };
      setProducts(updated);
    } else {
      setProducts([{ ...newProduct, stock: parseInt(newProduct.stock.toString() || "0") }, ...products]);
    }

    setNewProduct({ name: "", size: "", stock: "", price: "" });
    setEditingIndex(null);
    setIsModalOpen(false);
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setNewProduct({ ...products[index], stock: products[index].stock.toString() });
    setIsModalOpen(true);
  };

  const updatePipelineValue = (index: number, newValue: string) => {
    const updated = [...pipeline];
    updated[index].value = newValue;
    setPipeline(updated);
  };

  return (
    <div className="min-h-full w-full pb-32 bg-slate-50">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 border-b bg-slate-50/90 border-black/5 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[20px] font-extrabold text-zinc-900">Inventory</p>
              <p className="text-[13px] font-medium text-zinc-400">Stock & Pipeline</p>
            </div>
            <button
              onClick={() => { setEditingIndex(null); setNewProduct({ name: "", size: "", stock: "", price: "" }); setIsModalOpen(true); }}
              className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Date Selector */}
          <div
            className="w-full bg-white border border-slate-200/60 rounded-2xl p-3.5 flex items-center gap-3 relative shadow-sm"
            onClick={() => dateInputRef.current?.showPicker()}
          >
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <CalendarIcon size={18} />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">Inventory Date</p>
              <p className="text-[14px] font-bold text-slate-900 leading-none">{fmtDate(date)}</p>
            </div>
            <input
              ref={dateInputRef}
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="ml-auto text-slate-300">
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-6 flex flex-col gap-7">

        {/* ── PIPELINE ── */}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest mb-3 text-zinc-400">
            Supply Pipeline
          </p>
          <div className="grid grid-cols-2 gap-3">
            {pipeline.map((stage: any, i: number) => {
              const icons = [
                <Droplet key="droplet" size={20} />,
                <ThermometerSnowflake key="thermo" size={20} />,
                <Milk key="milk1" size={20} />,
                <Milk key="milk2" size={20} />
              ];
              const icon = icons[i % icons.length];

              return (
                <div
                  key={i}
                  className="rounded-2xl p-4 flex flex-col gap-3 transition-transform bg-primary/10 border-2 border-primary/5"
                >
                  <div className="text-primary">
                    {icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-zinc-600">{stage.label}</p>
                    <div className="flex items-center mt-1">
                      <input
                        type="number"
                        value={stage.value}
                        onChange={(e) => updatePipelineValue(i, e.target.value)}
                        className="w-3/4 md:w-1/3 relative z-20 bg-white text-[26px] font-extrabold leading-none focus:outline-none focus:bg-primary/10 focus:ring-2 focus:ring-primary/20 rounded-xl transition-all py-1.5 px-2 -ml-2= cursor-text text-primary"
                      />
                      <span className="text-[13px] font-medium ml-2 flex-shrink-0 text-zinc-400">{stage.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PRODUCTS ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-400">
              Products
            </p>
            <button
              onClick={() => { setEditingIndex(null); setNewProduct({ name: "", size: "", stock: "", price: "" }); setIsModalOpen(true); }}
              className="text-[12px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm text-primary bg-primary/10"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {products.map((p: any, i: number) => (
              <div
                key={i}
                onClick={() => openEditModal(i)}
                className="flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer active:scale-[0.98] bg-white border-black/5"
              >
                <div>
                  <p className="text-[15px] font-bold text-zinc-900">{p.name}</p>
                  <p className="text-[12px] font-medium mt-0.5 text-zinc-400">{p.size} · {p.stock} in stock</p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[16px] font-black text-primary">₹{p.price.replace('₹', '')}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Selling Price</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <p className="text-[18px] font-black text-slate-900">{editingIndex !== null ? "Edit Product" : "New Product"}</p>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Name</label>
                  <input
                    autoFocus
                    placeholder="e.g. Cow Milk"
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Size</label>
                    <input
                      placeholder="e.g. 1L"
                      value={newProduct.size}
                      onChange={e => setNewProduct({ ...newProduct, size: e.target.value })}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">₹</span>
                      <input
                        placeholder="90"
                        value={newProduct.price.replace('₹', '')}
                        onChange={e => setNewProduct({ ...newProduct, price: '₹' + e.target.value.replace('₹', '') })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Initial Stock</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProduct.stock}
                    onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                >
                  {editingIndex !== null ? "Save Changes" : "Create Product"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
