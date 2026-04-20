"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, Phone, MapPin, Wallet2, X, Map } from "lucide-react";
import Link from "next/link";
import data from "../../data/data.json";

export default function CustomersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState(data.users);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", area: "", frequency: "Morning & Evening", status: "Active", order: "", serialNumber: "", outstanding: "" });

  const handleOpenModal = () => {
    setNewCustomer({
      name: "",
      phone: "",
      area: "",
      frequency: "Morning & Evening",
      status: "Active",
      order: "1L Cow Milk",
      serialNumber: String(customers.length + 1),
      outstanding: ""
    });
    setIsModalOpen(true);
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) return;
    
    setCustomers([newCustomer, ...customers]);
    setNewCustomer({ name: "", phone: "", area: "", frequency: "Morning & Evening", status: "Active", order: "", serialNumber: "", outstanding: "" });
    setIsModalOpen(false);
  };


  return (
    <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-2xl mx-auto w-full px-5 py-4">
          <h1 className="text-xl font-bold text-zinc-900">Customers</h1>
          <p className="text-sm text-zinc-500">Manage onboarding and directories</p>
        </div>
      </header>

       <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or area..."
            className="w-full bg-white border border-zinc-200 placeholder:text-zinc-400 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-3">
          {customers.map((user: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-3"
            >
              <Link href={`/customers/${encodeURIComponent(user.name)}`} className="block">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-zinc-900">{user.name}</h3>
                    <div className="flex items-center gap-1 text-zinc-500 text-xs mt-1">
                      <MapPin size={12} /> {user.area}
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                    {user.status}
                  </span>
                </div>
              </Link>

              <div className="flex gap-2 mt-2 pt-3 border-t border-zinc-100">
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-zinc-600 text-[11px] font-medium">
                    <Phone size={10} /> {user.phone}
                  </div>
                  <span className="text-[10px] font-semibold text-primary mt-0.5">{user.frequency}</span>
                </div>
                <Link 
                  href={`/billing?search=${encodeURIComponent(user.name)}`}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Wallet2 size={14} /> Bills
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* FAB */}
      <button 
        onClick={handleOpenModal}
        className="fixed bottom-24 right-5 h-14 w-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all z-[60]"
      >
        <UserPlus size={24} />
      </button>

      {/* Add Customer Modal */}
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
                <p className="text-[18px] font-black text-slate-900">Add New Customer</p>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                  <input 
                    autoFocus
                    placeholder="e.g. John Doe"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                  <input 
                    placeholder="+91 00000 00000"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Area / Location</label>
                  <div className="relative">
                    <Map size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      placeholder="e.g. Downtown"
                      value={newCustomer.area}
                      onChange={e => setNewCustomer({...newCustomer, area: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Order / Qty</label>
                    <input 
                      placeholder="e.g. 1L Cow Milk"
                      value={newCustomer.order}
                      onChange={e => setNewCustomer({...newCustomer, order: e.target.value})}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Route SL No</label>
                    <input 
                      type="number"
                      placeholder="e.g. 14"
                      value={newCustomer.serialNumber}
                      onChange={e => setNewCustomer({...newCustomer, serialNumber: e.target.value})}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Delivery Frequency</label>
                  <select 
                    value={newCustomer.frequency}
                    onChange={e => setNewCustomer({...newCustomer, frequency: e.target.value})}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option>Morning Only</option>
                    <option>Evening Only</option>
                    <option>Morning & Evening</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 mt-2 pt-4 border-t border-slate-100">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Past Outstanding Balance (₹)</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={newCustomer.outstanding}
                    onChange={e => setNewCustomer({...newCustomer, outstanding: e.target.value})}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl mt-4 active:scale-95 transition-all shadow-xl shadow-primary/20"
                >
                  Add Customer
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
