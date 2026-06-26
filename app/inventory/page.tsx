"use client";

import { Plus, ChevronRight, X, Calendar as CalendarIcon, Droplet, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/ui/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useInventoryLogic } from "@/hooks/useInventoryLogic";

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
};

export default function InventoryPage() {
  const {
    date,
    setDate,
    isModalOpen,
    setIsModalOpen,
    pipeline,
    products,
    editingIndex,
    setEditingIndex,
    isLoading,
    newProduct,
    setNewProduct,
    isCloseShiftModalOpen,
    setIsCloseShiftModalOpen,
    closingShift,
    setClosingShift,
    closedShifts,
    dateInputRef,
    modalConfig,
    setModalConfig,
    getProductPriceForDate,
    openEditModal,
    handleSaveProduct,
    handleDeleteProduct,
    updatePipelineValue,
    handleCloseShiftSubmit,
    fetchData,
    isSubmitting
  } = useInventoryLogic();

  return (
    <PullToRefresh onRefresh={() => fetchData(true)} className="pb-32 bg-mono-bg">
      <div className="sticky top-0 z-40 border-b bg-mono-bg/90 border-mono-border backdrop-blur-md">
        <div className="w-full max-w-2xl mx-auto px-5 sm:px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div><p className="text-[20px] font-semibold text-mono-text">Inventory</p><p className="text-[13px] font-medium text-mono-text-disabled">Stock & Pipeline</p></div>
            <button onClick={() => { setEditingIndex(null); setNewProduct({ name: "", size: "", stock: "", price: 0, unit: "Bottles" }); setIsModalOpen(true); }} className="h-10 w-10 bg-mono-text text-white rounded-card flex items-center justify-center shadow-lg active:scale-95 transition-all"><Plus size={20} /></button>
          </div>
          <div className="w-full bg-white border border-mono-border/60 rounded-card p-3.5 flex items-center gap-3 relative shadow-sm" onClick={() => dateInputRef.current?.showPicker()}>
            <div className="p-2 bg-mono-text/10 text-mono-text rounded-card"><CalendarIcon size={18} /></div>
            <div className="flex flex-col"><p className="text-[10px] font-bold uppercase tracking-wider text-mono-text-disabled leading-none mb-1">Inventory Date</p><p className="text-[14px] font-bold text-mono-text leading-none">{fmtDate(date)}</p></div>
            <input ref={dateInputRef} type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="ml-auto text-mono-text-disabled"><ChevronRight size={16} /></div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-5 sm:px-6 pt-6 flex flex-col gap-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3 text-mono-text-disabled">Supply Pipeline</p>
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              [1, 2].map(i => <div key={i} className="h-36 bg-mono-skeleton border border-mono-border rounded-card animate-pulse" />)
            ) : (
              pipeline.map((stage, i) => (
                <div key={i} className="rounded-card bg-white border border-mono-border flex flex-col p-4 gap-3">
                  {/* Icon + Label */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-mono-surface flex items-center justify-center shrink-0">
                      <Droplet size={14} className="text-mono-text" strokeWidth={2} />
                    </div>
                    <p className={`text-xs leading-tight ${!stage.value || stage.value === '0' || stage.value === 0 ? 'text-mono-text-muted' : 'text-mono-text'}`}>{stage.label}</p>
                  </div>
                  {/* Input box — clearly styled as a field */}
                  <label className="flex items-baseline gap-2 bg-mono-surface shadow-xs rounded-md px-3 py-2.5 cursor-text focus-within:border-mono-text focus-within:ring-2 focus-within:ring-mono-text/10 transition-all">
                    <input
                      type="number"
                      placeholder="0"
                      value={stage.value}
                      onChange={(e) => updatePipelineValue(stage.id, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full text-[28px] font-bold text-mono-text leading-none bg-transparent focus:outline-none placeholder:text-mono-text-disabled"
                    />
                    <span className="text-xs font-medium text-mono-text-disabled shrink-0">{stage.unit}</span>
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3"><p className="text-xs font-bold uppercase tracking-widest text-mono-text-disabled">Products</p><button onClick={() => { setEditingIndex(null); setNewProduct({ name: "", size: "", stock: "", price: 0, unit: "Bottles" }); setIsModalOpen(true); }} className="text-xs font-bold px-3 py-1.5 rounded-card flex items-center gap-1 transition-all text-mono-text bg-mono-text/10"><Plus size={13} /> Add</button></div>
          <div className="flex flex-col gap-2.5">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-20 bg-white border border-mono-border rounded-card animate-pulse" />)
            ) : (
              products.map((p, i) => (
                <div key={i} onClick={() => openEditModal(i)} className="flex items-center justify-between p-4 rounded-card border transition-colors cursor-pointer bg-white border-mono-border">
                  <div><p className="text-[15px] font-bold text-mono-text">{p.name}</p><p className="text-xs font-medium mt-0.5 text-mono-text-disabled">{p.size} · {p.stock} in stock</p></div>
                  <div className="flex flex-col items-end"><p className="text-[16px] font-semibold text-mono-text">₹{getProductPriceForDate(p)}</p><p className="text-[10px] font-bold text-mono-text-disabled uppercase tracking-tighter">Selling Price</p></div>
                </div>
              ))
            )}
          </div>
        </div>

        <button onClick={() => {
          const disabledMorning = closedShifts[date]?.includes("Morning Only");
          const disabledEvening = closedShifts[date]?.includes("Evening Only");
          if (!disabledMorning) setClosingShift("Morning Only");
          else if (!disabledEvening) setClosingShift("Evening Only");
          setIsCloseShiftModalOpen(true);
        }} className="w-full bg-mono-text text-white font-bold py-4 rounded-card active:scale-95 transition-all shadow-sm">
          Close Shift
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-hero p-7 shadow-md flex flex-col gap-6">
              <div className="flex justify-between items-center"><p className="text-[18px] font-semibold text-mono-text">{editingIndex !== null ? "Edit Product" : "New Product"}</p><button onClick={() => setIsModalOpen(false)} className="p-2 bg-mono-surface rounded-card text-mono-text-muted"><X size={18} /></button></div>
              <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Name</label><input autoFocus placeholder="e.g. Raw Milk" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Size</label><input placeholder="e.g. 1L" value={newProduct.size} onChange={e => setNewProduct({ ...newProduct, size: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Price</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-mono-text-disabled">₹</span><input placeholder="90" type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })} className="w-full bg-mono-bg border border-mono-divider rounded-card pl-8 pr-4 py-3 text-sm font-medium focus:ring-2 transition-all" /></div></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Initial Stock</label><input type="number" placeholder="0" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                  <CustomSelect
                    label="Unit"
                    options={[
                      { value: "Bottles", label: "Bottles" },
                      { value: "Packets", label: "Packets" },
                      { value: "Kgs", label: "Kgs" },
                      { value: "Liters", label: "Liters" },
                      { value: "Items", label: "Items" }
                    ]}
                    value={newProduct.unit}
                    onChange={val => setNewProduct({ ...newProduct, unit: val })}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {editingIndex !== null && (
                    <button type="button" onClick={handleDeleteProduct} className="shrink-0 w-12 h-12 bg-mono-surface text-mono-text rounded-card flex items-center justify-center hover:bg-mono-border transition-colors"><Trash2 size={20} /></button>
                  )}
                  <button type="submit" disabled={isSubmitting} className="grow bg-mono-text text-white font-bold py-4 rounded-card active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm">
                    {isSubmitting ? "Saving..." : (editingIndex !== null ? "Save Changes" : "Create Product")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCloseShiftModalOpen && (
          <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCloseShiftModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-hero p-7 shadow-md flex flex-col gap-6">
              <div className="flex justify-between items-center"><p className="text-[18px] font-semibold text-mono-text">Close Shift</p><button onClick={() => setIsCloseShiftModalOpen(false)} className="p-2 bg-mono-surface rounded-card text-mono-text-muted"><X size={18} /></button></div>
              <form onSubmit={handleCloseShiftSubmit} className="flex flex-col gap-5">
                <CustomSelect
                  label="Which shift are you closing?"
                  options={[
                    { value: "Morning Only", label: "Morning Shift", disabled: closedShifts[date]?.includes("Morning Only") },
                    { value: "Evening Only", label: "Evening Shift", disabled: closedShifts[date]?.includes("Evening Only") }
                  ]}
                  value={closingShift}
                  onChange={setClosingShift}
                />
                <div className="bg-mono-text/5 border border-mono-border p-4 rounded-card">
                  <p className="text-xs font-medium text-mono-text">This will record the end of the shift and archive current prices for the ledger. All inventory and stock levels will be reset to zero.</p>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-mono-text text-white font-bold py-4 rounded-card mt-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm">
                  {isSubmitting ? "Closing Shift..." : "Confirm Close Shift"}
                </button>
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
        showDontShowAgain={modalConfig.showDontShowAgain}
      />
    </PullToRefresh>
  );
}
