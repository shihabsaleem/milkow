"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Calendar, Sunrise, Sunset } from "lucide-react";
import { motion } from "framer-motion";
import data from "../data/data.json";

type InventoryItem = { name: string; vol: string; count: number; unit: string; loaded: number };
type DeliveredItem = { name: string; vol: string; count: number; unit: string };

const fmtDate = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const SIDE_PAD = "1.75rem"; // 28px — matches px-7

export default function Dashboard() {
  const [date, setDate] = useState("2026-04-18");
  const [dayName, setDayName] = useState("");
  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDayName(new Date(date).toLocaleDateString("en-US", { weekday: "long" }));
  }, [date]);

  return (
    <div className="min-h-full w-full" style={{ background: "var(--bg)" }}>

      {/* STICKY HEADER */}
      <div
        className="sticky top-0 z-40 border-b"
        style={{ background: "rgba(244,244,248,0.92)", borderColor: "rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-white shadow-sm flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop"
                alt="Profile" className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <p className="text-[12px] font-medium" style={{ color: "var(--text-3)" }}>
                {shift === "morning" ? "Good Morning," : "Good Evening,"}
              </p>
              <p className="text-[17px] font-extrabold" style={{ color: "var(--primary)" }}>Sayas R.</p>
            </div>
          </div>
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: "var(--text-3)" }}
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="w-full max-w-2xl mx-auto pt-5 pb-32 flex flex-col gap-10">

        {/* DATE */}
        <section className="flex flex-col gap-4" style={{ paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD }}>
          <div
            className="w-full rounded-2xl h-[68px] px-5 text-white flex items-center gap-4 relative"
            style={{ background: "var(--primary)" }}
          >
            <div className="p-2.5 rounded-xl flex-shrink-0 pointer-events-none" style={{ background: "rgba(255,255,255,0.18)" }}>
              <Calendar size={20} strokeWidth={2} />
            </div>
            <div className="pointer-events-none">
              <p className="text-[17px] font-bold tracking-tight leading-snug">{fmtDate(date)}</p>
              <p className="text-[12px] font-medium leading-none mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>{dayName}</p>
            </div>
            <div className="ml-auto pointer-events-none flex items-center gap-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Calendar size={14} strokeWidth={2} />
              <span className="text-[11px] font-medium">Tap to change</span>
            </div>
            <input
              ref={inputRef} type="date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ WebkitAppearance: "none", fontSize: "16px", zIndex: 10 }}
              value={date} onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#EBEBEF] relative h-14">
            <motion.div
              layout
              className="absolute inset-y-1 rounded-xl shadow-sm z-0"
              style={{
                background: "white",
                left: shift === "morning" ? "4px" : "50%",
                width: "calc(50% - 4px)"
              }}
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
            <button
              onClick={() => setShift("morning")}
              className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl transition-all ${shift === "morning" ? "text-[color:var(--primary)]" : "text-[#A1A1AA] hover:text-[#71717A]"}`}
            >
              <Sunrise size={20} strokeWidth={2.5} />
              <span className="text-[15px] font-bold">Morning</span>
            </button>
            <button
              onClick={() => setShift("evening")}
              className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl transition-all ${shift === "evening" ? "text-[color:var(--primary)]" : "text-[#A1A1AA] hover:text-[#71717A]"}`}
            >
              <Sunset size={20} strokeWidth={2.5} />
              <span className="text-[15px] font-bold">Evening</span>
            </button>
          </div>
        </section>

        {/* INVENTORY */}
        <section>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 mt-2"
            style={{ color: "var(--text-3)", paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD }}
          >
            Inventory
          </p>
          {/* mobile scroll */}
          <div
            className="sm:hidden flex gap-4 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch", paddingLeft: SIDE_PAD }}
          >
            {data.inventory.map((item: any, i: number) => <InventoryCard key={i} item={item} />)}
            <div style={{ minWidth: SIDE_PAD, flexShrink: 0 }} />
          </div>
          {/* tablet+ grid */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 gap-3" style={{ paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD }}>
            {data.inventory.map((item: any, i: number) => <InventoryCard key={i} item={item} />)}
          </div>
        </section>

        {/* DELIVERED */}
        <section>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 mt-2"
            style={{ color: "var(--text-3)", paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD }}
          >
            Delivered
          </p>
          {/* mobile scroll */}
          <div
            className="sm:hidden flex gap-4 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch", paddingLeft: SIDE_PAD }}
          >
            {data.delivered.map((item: any, i: number) => <DeliveredCard key={i} item={item} />)}
            <div style={{ minWidth: SIDE_PAD, flexShrink: 0 }} />
          </div>
          {/* tablet+ grid */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-3" style={{ paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD }}>
            {data.delivered.map((item: any, i: number) => <DeliveredCard key={i} item={item} />)}
          </div>
        </section>

        {/* FINANCIALS */}
        <section style={{ paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD }}>
          <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
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
    <div
      className="min-w-[210px] sm:min-w-0 flex-shrink-0 rounded-2xl overflow-hidden snap-start hover:brightness-105 transition-all"
      style={{ background: "var(--primary-card)" }}
    >
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-white text-[18px] font-bold leading-tight">{item.name}</p>
        </div>
        <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{item.vol}</p>
        <div className="mt-4">
          <p className="text-white text-[38px] font-black leading-none">{isEmpty ? "—" : item.count}</p>
          <p className="text-[11px] font-semibold uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>{item.unit}</p>
        </div>
      </div>
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: "rgba(0,0,0,0.18)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>Loaded to Van</p>
        <p className="text-[14px] font-bold text-white">
          {isEmpty ? "—" : item.loaded}
          <span className="text-[10px] font-medium ml-1" style={{ color: "rgba(255,255,255,0.65)" }}>{item.unit}</span>
        </p>
      </div>
    </div>
  );
}

/* DELIVERED CARD */
function DeliveredCard({ item }: { item: DeliveredItem }) {
  return (
    <div
      className="min-w-[155px] sm:min-w-0 flex-shrink-0 rounded-2xl p-5 snap-start hover:brightness-105 transition-all"
      style={{ background: "var(--primary-card)" }}
    >
      <p className="text-white text-[17px] font-bold leading-tight">{item.name}</p>
      <p className="text-[13px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{item.vol}</p>
      <div className="mt-4">
        <p className="text-white text-[38px] font-black leading-none">{item.count}</p>
        <p className="text-[11px] font-semibold uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>{item.unit}</p>
      </div>
    </div>
  );
}

/* FINANCE CARD */
function FinanceCard({ amount, label, badge, type }: { amount: string; label: string; badge: string; type: "green" | "red" }) {
  const isGreen = type === "green";
  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center gap-1 border"
      style={{
        background: isGreen ? "var(--primary-dim)" : "var(--red-soft)",
        borderColor: isGreen ? "var(--primary-soft)" : "var(--red-border)",
      }}
    >
      <p className="text-[22px] font-extrabold" style={{ color: "var(--text-1)" }}>{amount}</p>
      <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-2)" }}>{label}</p>
      <span
        className="px-3 py-1 rounded-full text-white text-[11px] font-bold"
        style={{ background: isGreen ? "var(--green)" : "var(--red)" }}
      >
        {badge}
      </span>
    </div>
  );
}