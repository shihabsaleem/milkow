"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Calendar, Sunrise, Sunset, User, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import data from "../data/data.json";

type InventoryItem = { name: string; vol: string; count: number; unit: string; loaded: number };
type DeliveredItem = { name: string; vol: string; count: number; unit: string };

const fmtDate = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function Dashboard() {
  const [date, setDate] = useState("2026-04-18");
  const [dayName, setDayName] = useState("");
  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [manualOverride, setManualOverride] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDayName(new Date(date).toLocaleDateString("en-US", { weekday: "long" }));
  }, [date]);

  useEffect(() => {
    if (!manualOverride) {
      const hour = new Date().getHours();
      setShift(hour < 14 ? "morning" : "evening"); // Switches to Evening at 2:00 PM
    }
  }, [manualOverride]);

  const handleShiftToggle = (newShift: "morning" | "evening") => {
    setManualOverride(true);
    setShift(newShift);
  };

  return (
    <div className="min-h-full w-full bg-slate-50">

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-40 border-b bg-slate-50/90 border-black/5 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-white shadow-sm flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop"
                alt="Profile" className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <p className="text-[12px] font-medium text-zinc-400">
                {shift === "morning" ? "Good Morning," : "Good Evening,"}
              </p>
              <p className="text-[17px] font-extrabold text-primary">Sayas R.</p>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 active:scale-95">
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 top-12 w-52 bg-white border border-zinc-200 shadow-2xl shadow-zinc-900/10 rounded-2xl overflow-hidden py-1 z-50 origin-top-right text-left"
                >
                  <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 transition-colors">
                    <User size={16} className="text-zinc-400" /> Profile
                  </Link>
                  <div className="w-full h-[1px] bg-zinc-100" />
                  <Link href="/login" className="flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors">
                    <LogOut size={16} className="text-rose-400" /> Log Out
                  </Link>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="w-full max-w-2xl mx-auto pt-5 pb-32 flex flex-col gap-10">

        {/* DATE */}
        <section className="flex flex-col gap-4 px-7">
          <div className="w-full rounded-2xl h-[68px] px-5 text-white flex items-center gap-4 relative bg-primary">
            <div className="p-2.5 rounded-xl flex-shrink-0 pointer-events-none bg-white/20">
              <Calendar size={20} strokeWidth={2} />
            </div>
            <div className="pointer-events-none">
              <p className="text-[17px] font-bold tracking-tight leading-snug">{fmtDate(date)}</p>
              <p className="text-[12px] font-medium leading-none mt-0.5 text-white/70">{dayName}</p>
            </div>
            <div className="ml-auto pointer-events-none flex items-center gap-1 text-white/50">
              <Calendar size={14} strokeWidth={2} />
              <span className="text-[11px] font-medium">Tap to change</span>
            </div>
            <input
              ref={inputRef} type="date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base z-10"
              style={{ WebkitAppearance: "none" }}
              value={date} onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#EBEBEF] relative h-14">
            <motion.div
              layout
              className="absolute inset-y-1 rounded-xl shadow-sm z-0 bg-white"
              style={{ left: shift === "morning" ? "4px" : "50%", width: "calc(50% - 4px)" }}
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
            <button
              onClick={() => handleShiftToggle("morning")}
              className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl transition-all ${shift === "morning" ? "text-primary" : "text-[#A1A1AA] hover:text-[#71717A]"}`}
            >
              <Sunrise size={20} strokeWidth={2.5} />
              <span className="text-[15px] font-bold">Morning</span>
            </button>
            <button
              onClick={() => handleShiftToggle("evening")}
              className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl transition-all ${shift === "evening" ? "text-primary" : "text-[#A1A1AA] hover:text-[#71717A]"}`}
            >
              <Sunset size={20} strokeWidth={2.5} />
              <span className="text-[15px] font-bold">Evening</span>
            </button>
          </div>
        </section>

        {/* INVENTORY */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 mt-2 text-zinc-400 px-7">
            Inventory
          </p>
          {/* mobile scroll */}
          <div className="sm:hidden flex gap-4 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory pl-7">
            {data.inventory.map((item: any, i: number) => <InventoryCard key={i} item={item} />)}
            <div className="min-w-[28px] flex-shrink-0" />
          </div>
          {/* tablet+ grid */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 gap-3 px-7">
            {data.inventory.map((item: any, i: number) => <InventoryCard key={i} item={item} />)}
          </div>
        </section>

        {/* DELIVERED */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 mt-2 text-zinc-400 px-7">
            Delivered
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-7">
            {data.delivered.map((item: any, i: number) => <DeliveredCard key={i} item={item} />)}
          </div>
        </section>

        {/* FINANCIALS */}
        <section className="px-7">
          <p className="text-[12px] font-bold uppercase tracking-widest mb-3 text-zinc-400">
            Financials
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FinanceCard amount="₹25,000" label="To Collect" badge="100 Customers" type="green" />
            <FinanceCard amount="₹15,000" label="To Pay" badge="2 Vendors" type="red" />
          </div>
        </section>

      </div>
    </div>
  );
}

/* INVENTORY CARD */
function InventoryCard({ item }: { item: InventoryItem }) {
  const isEmpty = item.count === 0;
  return (
    <div className="min-w-[210px] sm:min-w-0 flex-shrink-0 rounded-2xl overflow-hidden snap-start hover:brightness-105 transition-all bg-primary">
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-white text-[18px] font-bold leading-tight">{item.name}</p>
        </div>
        <p className="text-[13px] font-medium text-white/60">{item.vol}</p>
        <div className="mt-4">
          <p className="text-white text-[38px] font-black leading-none">{isEmpty ? "—" : item.count}</p>
          <p className="text-[11px] font-semibold uppercase tracking-widest mt-1 text-white/60">{item.unit}</p>
        </div>
      </div>
      <div className="px-5 py-3 flex items-center justify-between bg-black/20">
        <p className="text-[11px] font-semibold tracking-wide text-white/70">Loaded to Van</p>
        <p className="text-[14px] font-bold text-white">
          {isEmpty ? "—" : item.loaded}
          <span className="text-[10px] font-medium ml-1 text-white/70">{item.unit}</span>
        </p>
      </div>
    </div>
  );
}

/* DELIVERED CARD */
function DeliveredCard({ item }: { item: DeliveredItem }) {
  return (
    <div className="rounded-2xl p-5 hover:brightness-105 transition-all bg-primary">
      <p className="text-white text-[17px] font-bold leading-tight">{item.name}</p>
      <p className="text-[13px] font-medium mt-0.5 text-white/60">{item.vol}</p>
      <div className="mt-4">
        <p className="text-white text-[38px] font-black leading-none">{item.count}</p>
        <p className="text-[11px] font-semibold uppercase tracking-widest mt-1 text-white/60">{item.unit}</p>
      </div>
    </div>
  );
}

/* FINANCE CARD */
function FinanceCard({ amount, label, badge, type }: { amount: string; label: string; badge: string; type: "green" | "red" }) {
  const isGreen = type === "green";
  return (
    <div className={`rounded-2xl p-5 flex flex-col items-center gap-1 border ${isGreen ? 'bg-primary/5 border-primary/20' : 'bg-rose-50 border-rose-200'}`}>
      <p className="text-[22px] font-extrabold text-zinc-900">{amount}</p>
      <p className="text-[13px] font-semibold mb-2 text-zinc-600">{label}</p>
      <span className={`px-3 py-1 rounded-full text-white text-[11px] font-bold ${isGreen ? 'bg-emerald-500' : 'bg-rose-500'}`}>
        {badge}
      </span>
    </div>
  );
}