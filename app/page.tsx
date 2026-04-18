"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Calendar,
  Sunrise,
  Sunset,
} from "lucide-react";
import Preloader from "@/components/Preloader";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState("2026-04-18");
  const [currentDay, setCurrentDay] = useState("");
  const [activeShift, setActiveShift] = useState<"morning" | "evening">("morning");
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentDay(new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" }));
  }, [selectedDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const inventoryItems = [
    { name: "Milk", vol: "500ml", count: 100, unit: "Bottles", loaded: 125 },
    { name: "Curd (Skim)", vol: "500ml", count: 0, unit: "Bottles", loaded: 0 },
    { name: "Ghee", vol: "250ml", count: 45, unit: "Bottles", loaded: 30 },
    { name: "Paneer", vol: "200g", count: 60, unit: "Packs", loaded: 50 },
  ];

  const deliveredItems = [
    { name: "Milk", vol: "500ml", count: 100, unit: "Bottles" },
    { name: "Milk", vol: "1000ml", count: 50, unit: "Bottles" },
    { name: "Curd (Skim)", vol: "500ml", count: 20, unit: "Boxes" },
    { name: "Ghee", vol: "250ml", count: 10, unit: "Bottles" },
  ];

  return (
    <div className="flex min-h-full w-full flex-col bg-[#EBEBEB] text-[#1A1A1A] font-sans pt-6 sm:pt-8 md:pt-10 pb-8">
      <Preloader />

      {/* Responsive container for larger screens */}
      <div className="w-full max-w-3xl mx-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-6 sm:mb-8 px-5 sm:px-6 md:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-zinc-300 flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop"
                alt="Profile"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-400 text-xs sm:text-sm font-medium">Good Morning,</span>
              <span className="text-[#5D55F3] text-base sm:text-lg font-bold">Sayas R.</span>
            </div>
          </div>
          <button className="text-zinc-400 p-2 hover:bg-zinc-200 rounded-xl transition-colors" aria-label="More options">
            <MoreVertical size={24} />
          </button>
        </header>

        {/* Date and Shifts */}
        <section className="flex gap-3 mb-6 sm:mb-8 px-5 sm:px-6 md:px-8">
          {/* Date Picker Card */}
          <div
            className="flex-1 bg-[#5D55F3] rounded-[1.5rem] sm:rounded-[2rem] h-20 sm:h-24 p-4 sm:p-6 text-white flex items-center gap-3 sm:gap-4 shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0">
              <Calendar size={20} className="sm:hidden" />
              <Calendar size={24} className="hidden sm:block" />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-base sm:text-lg font-bold tracking-tight leading-none">{formatDate(selectedDate)}</span>
              <span className="text-white/80 text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1">{currentDay}</span>
            </div>
            {/* Native date input covers the entire card for reliable mobile touch */}
            <input
              ref={dateInputRef}
              type="date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ WebkitAppearance: "none", fontSize: "16px" }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Shift Toggle Pill */}
          <div className="bg-[#5D55F3] rounded-[1.5rem] sm:rounded-[2.2rem] h-20 sm:h-24 p-1.5 sm:p-2 flex items-center gap-1 shadow-sm flex-shrink-0">
            <button
              onClick={() => setActiveShift("morning")}
              className={`h-full w-14 sm:w-16 rounded-[1.2rem] sm:rounded-[1.6rem] flex flex-col items-center justify-center transition-all duration-300 ${
                activeShift === "morning" ? "bg-white text-[#5D55F3]" : "text-white/80"
              }`}
              aria-label="Morning shift"
            >
              <Sunrise size={20} strokeWidth={2.5} className="sm:hidden" />
              <Sunrise size={22} strokeWidth={2.5} className="hidden sm:block" />
            </button>

            <button
              onClick={() => setActiveShift("evening")}
              className={`h-full w-14 sm:w-16 rounded-[1.2rem] sm:rounded-[1.6rem] flex flex-col items-center justify-center transition-all duration-300 ${
                activeShift === "evening" ? "bg-white text-[#5D55F3]" : "text-white/80"
              }`}
              aria-label="Evening shift"
            >
              <Sunset size={20} strokeWidth={2.5} className="sm:hidden" />
              <Sunset size={22} strokeWidth={2.5} className="hidden sm:block" />
            </button>
          </div>
        </section>

        {/* Inventory Section */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4 px-5 sm:px-6 md:px-8">
            Inventory<span className="text-[#5D55F3]">.</span>
          </h2>

          {/* Mobile: horizontal scroll / Tablet+: grid */}
          <div className="sm:hidden flex flex-nowrap gap-3 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: "touch" }}>
            {inventoryItems.map((item, i) => (
              <div key={i} className="min-w-[220px] flex-shrink-0 bg-[#5C54F1] rounded-[2rem] overflow-hidden shadow-sm flex flex-col snap-start">
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex flex-col">
                    <span className="text-white text-2xl font-black leading-tight">{item.name}</span>
                    <span className="text-white/80 text-sm font-medium">{item.vol}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-3xl font-black">{item.count || "--"}</span>
                    <span className="text-white/80 text-xs font-bold uppercase tracking-[0.2em]">{item.unit}</span>
                  </div>
                </div>
                <div className="bg-[#E7E6FF] px-6 py-3 flex justify-between items-center text-[#5C54F1]">
                  <span className="text-[10px] font-extrabold uppercase tracking-tight">loaded to van</span>
                  <span className="text-xs font-black">{item.loaded || "--"} <span className="font-bold text-[10px]">{item.unit}</span></span>
                </div>
              </div>
            ))}
            <div className="min-w-[1px] flex-shrink-0" aria-hidden="true" />
          </div>

          {/* Tablet+: responsive grid */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 gap-4 px-6 md:px-8">
            {inventoryItems.map((item, i) => (
              <div key={i} className="bg-[#5C54F1] rounded-[2rem] overflow-hidden shadow-sm flex flex-col hover:scale-[1.02] transition-transform">
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex flex-col">
                    <span className="text-white text-2xl font-black leading-tight">{item.name}</span>
                    <span className="text-white/80 text-sm font-medium">{item.vol}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-3xl font-black">{item.count || "--"}</span>
                    <span className="text-white/80 text-xs font-bold uppercase tracking-[0.2em]">{item.unit}</span>
                  </div>
                </div>
                <div className="bg-[#E7E6FF] px-6 py-3 flex justify-between items-center text-[#5C54F1]">
                  <span className="text-[10px] font-extrabold uppercase tracking-tight">loaded to van</span>
                  <span className="text-xs font-black">{item.loaded || "--"} <span className="font-bold text-[10px]">{item.unit}</span></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivered Section */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4 px-5 sm:px-6 md:px-8">
            Delivered<span className="text-[#5D55F3]">.</span>
          </h2>

          {/* Mobile: horizontal scroll */}
          <div className="sm:hidden flex flex-nowrap gap-3 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: "touch" }}>
            {deliveredItems.map((item, i) => (
              <div key={i} className="min-w-[150px] flex-shrink-0 bg-[#5C54F1] rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm snap-start">
                <div className="flex flex-col">
                  <span className="text-white text-xl font-black leading-tight">{item.name}</span>
                  <span className="text-white/80 text-[10px] font-bold">{item.vol}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-3xl font-black">{item.count}</span>
                  <span className="text-white/80 text-[10px] font-bold uppercase tracking-[0.15em]">{item.unit}</span>
                </div>
              </div>
            ))}
            <div className="min-w-[1px] flex-shrink-0" aria-hidden="true" />
          </div>

          {/* Tablet+: responsive grid */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 px-6 md:px-8">
            {deliveredItems.map((item, i) => (
              <div key={i} className="bg-[#5C54F1] rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm hover:scale-[1.02] transition-transform">
                <div className="flex flex-col">
                  <span className="text-white text-xl font-black leading-tight">{item.name}</span>
                  <span className="text-white/80 text-[11px] font-bold">{item.vol}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-3xl font-black">{item.count}</span>
                  <span className="text-white/80 text-[10px] font-bold uppercase tracking-[0.15em]">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Summary Section */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 px-5 sm:px-6 md:px-8">
          <div className="bg-[#DBEDE5] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 flex flex-col items-center border border-[#B8D7C9]">
            <span className="text-xl sm:text-2xl font-black flex items-center gap-1">
              <span className="text-xs sm:text-sm font-bold">₹</span> 25000
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-zinc-600 mb-3 sm:mb-4">To Collect</span>
            <div className="bg-[#A0C9B1] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-[8px] sm:text-[9px] font-black uppercase whitespace-nowrap">
              from 100 Customers
            </div>
          </div>
          <div className="bg-[#EFDEE0] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 flex flex-col items-center border border-[#E2CBCF]">
            <span className="text-xl sm:text-2xl font-black flex items-center gap-1">
              <span className="text-xs sm:text-sm font-bold">₹</span> 15000
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-zinc-600 mb-3 sm:mb-4">To Pay</span>
            <div className="bg-[#CB979D] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-[8px] sm:text-[9px] font-black uppercase whitespace-nowrap">
              to 2 Vendors
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
