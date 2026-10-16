"use client";
import { useState, useRef, useEffect } from "react";

import Link from "next/link";
import Modal from "@/components/ui/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import AutoEntryToggle from "@/components/ui/AutoEntryToggle";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { Plus, Search, MapPin, ChevronRight, X, ListOrdered } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomersLogic } from "@/hooks/useCustomersLogic";

export default function CustomersPage() {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    router,
    searchTerm,
    setSearchTerm,
    isModalOpen,
    setIsModalOpen,
    customers,
    areas,
    selectedAreaId,
    setSelectedAreaId,
    newCustomer,
    setNewCustomer,
    autoEntryAvailable,
    products,
    isLoading,
    isSubmitting,
    modalConfig,
    setModalConfig,
    filteredCustomers,
    handleAddCustomer,
    fetchData
  } = useCustomersLogic();



  return (
    <PullToRefresh onRefresh={() => fetchData(true)} className="bg-mono-bg/50 pb-32">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-mono-divider">
        <div className="w-full max-w-2xl mx-auto px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[20px] font-semibold text-mono-text leading-none">Customers</p>
              <p className="text-xs font-medium text-mono-text-disabled">{customers.length} Subscribers</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/route" className="h-10 w-10 bg-mono-surface text-mono-text-muted rounded-card flex items-center justify-center hover:bg-mono-border transition-all" title="Reorder route">
                <ListOrdered size={18} />
              </Link>
              <button onClick={() => setIsModalOpen(true)} className="h-10 w-10 bg-mono-text text-white rounded-card flex items-center justify-center shadow-lg active:scale-95 transition-all">
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 h-12 mt-1">
            <div
              className={`relative h-full bg-white border border-mono-border rounded-card shadow-sm overflow-hidden flex shrink-0 transition-all duration-300 ease-in-out ${isSearchExpanded || searchTerm
                ? 'flex-1 sm:w-auto'
                : 'w-12 sm:flex-1'
                }`}
            >
              <button
                onClick={() => {
                  if (!isSearchExpanded) {
                    setIsSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }
                }}
                className={`absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center transition-colors ${isSearchExpanded || searchTerm ? 'text-mono-text pointer-events-none' : 'text-mono-text-disabled hover:bg-mono-surface'}`}
              >
                <Search size={18} />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => {
                  if (!searchTerm) setIsSearchExpanded(false);
                }}
                className={`w-full h-full pl-11 pr-10 text-[13px] sm:text-sm font-medium text-mono-text focus:outline-none bg-transparent transition-opacity duration-300 ${isSearchExpanded || searchTerm ? 'opacity-100' : 'opacity-0 sm:opacity-100'}`}
              />
              <AnimatePresence>
                {(isSearchExpanded || searchTerm) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => {
                      setSearchTerm("");
                      setIsSearchExpanded(false);
                      searchInputRef.current?.blur();
                    }}
                    className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center text-mono-text-disabled hover:text-mono-text"
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className={`transition-all duration-300 ease-in-out flex shrink-0 h-full ${isSearchExpanded || searchTerm
              ? 'w-12 opacity-100'
              : 'flex-1 opacity-100 sm:w-1/4 sm:min-w-[150px]'
              }`}>
              <div className="w-full flex items-center h-full">
                <CustomSelect
                  fullWidth={true}
                  iconOnly={isSearchExpanded || searchTerm.length > 0}
                  icon={<MapPin size={18} />}
                  className="w-full"
                  options={[
                    { value: "", label: "All Routes" },
                    ...areas.map(a => ({ value: a.id.toString(), label: a.name }))
                  ]}
                  value={selectedAreaId}
                  onChange={(val) => setSelectedAreaId(val)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full max-w-2xl mx-auto px-5 py-6 flex flex-col gap-3">
        {isLoading ? (
          [1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-white border border-mono-border rounded-card animate-pulse" />)
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer, i) => (
            <motion.div
              key={i}
              layout
              onClick={() => {
                if (customer.id) router.push(`/customers/${customer.id}`);
              }}
              className="w-full bg-white border border-mono-border p-4 sm:p-5 rounded-card flex items-center justify-between hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pr-2">
                <div className={`h-12 w-12 rounded-sm flex items-center justify-center text-lg font-bold shrink-0 ${customer.status === 'Active' ? 'bg-mono-text/10 text-mono-text' : 'bg-mono-surface text-mono-text-disabled'}`}>{customer.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-mono-text group-hover:text-mono-text transition-colors truncate">{customer.name}</h3>
                    {customer.auto_entry === true && (
                      <span
                        title="Auto Entry is on: this customer's deliveries are pre-ticked each shift."
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] shrink-0 bg-mono-surface text-mono-text border border-mono-border/60"
                      >
                        Auto
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-mono-text-disabled flex items-center gap-1 mt-0.5 truncate"><MapPin size={12} className="shrink-0" /> <span className="truncate">{customer.area?.name || 'No Area'}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="flex flex-col items-center justify-center mr-2">
                  <p className={`text-sm font-semibold text-mono-text leading-tight`}>
                    ₹{Math.abs(customer.financials?.current_balance || 0).toLocaleString()}
                  </p>
                  <p className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] border mt-0.5 ${customer.financials && customer.financials.current_balance < 0
                      ? 'text-mono-text bg-mono-surface border-mono-border'
                      : 'text-mono-text bg-mono-surface border-mono-border'
                    }`}>
                    {customer.financials && customer.financials.current_balance < 0 ? 'Advance' : 'Credit'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/billing?search=${encodeURIComponent(customer.name)}`);
                  }}
                  className="p-2.5 bg-surface text-mono-text rounded-sm hover:bg-mono-text/10 transition-colors border border-mono-text/20 flex items-center gap-2"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Bill</span>
                  <ChevronRight size={18} className="text-mono-text group-hover:text-mono-text transition-all translate-x-0 group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <Search size={48} className="mb-4" />
            <p className="font-medium text-mono-text-muted">No customers found</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-hero p-7 shadow-md flex flex-col gap-6">
              <div className="flex justify-between items-center"><p className="text-[18px] font-semibold text-mono-text">New Onboarding</p><button onClick={() => setIsModalOpen(false)} className="p-2 bg-mono-surface rounded-card text-mono-text-muted"><X size={18} /></button></div>
              <form onSubmit={handleAddCustomer} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">FullName</label><input autoFocus placeholder="e.g. Full Name " value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Phone</label><input placeholder="9876543210" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
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
                {autoEntryAvailable && (
                  <AutoEntryToggle
                    enabled={newCustomer.auto_entry}
                    onChange={val => setNewCustomer({ ...newCustomer, auto_entry: val })}
                  />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <CustomSelect
                    label="Daily Product"
                    options={products.map(p => ({ value: p.id, label: `${p.name} (${p.size})` }))}
                    value={newCustomer.default_product_id}
                    onChange={val => setNewCustomer({ ...newCustomer, default_product_id: val })}
                    placeholder="Select Product"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Daily Qty</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newCustomer.default_qty}
                      onChange={e => setNewCustomer({ ...newCustomer, default_qty: e.target.value })}
                      className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled">Past Outstanding (₹)</label><input type="number" placeholder="0.00" value={newCustomer.outstanding} onChange={e => setNewCustomer({ ...newCustomer, outstanding: e.target.value })} className="bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm focus:ring-2 transition-all" /></div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-mono-text text-white font-bold py-4 rounded-card mt-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm">
                  {isSubmitting ? "Registering..." : "Complete Registration"}
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
