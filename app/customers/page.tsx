"use client";

import { motion } from "framer-motion";
import { UserPlus, Search, Phone, MapPin } from "lucide-react";
import data from "../../data/data.json";

export default function CustomersPage() {


  return (
    <div className="flex h-full w-full flex-col bg-slate-50 text-zinc-900 font-sans overflow-y-auto overflow-x-hidden pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-zinc-200/50">
        <h1 className="text-xl font-bold text-zinc-900">Customers</h1>
        <p className="text-sm text-zinc-500">Manage onboarding and directories</p>
      </header>

      <main className="px-5 py-6 flex flex-col gap-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or area..."
            className="w-full bg-white border border-zinc-200 placeholder:text-zinc-400 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-3">
          {data.users.map((user: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-3"
            >
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

              <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                <div className="flex items-center gap-1 text-zinc-600 text-xs font-medium">
                  <Phone size={12} /> {user.phone}
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{user.frequency}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* FAB */}
      <button className="fixed bottom-24 right-5 h-14 w-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all">
        <UserPlus size={24} />
      </button>
    </div>
  );
}
