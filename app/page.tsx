"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  MoreVertical, 
  Calendar, 
  Sunrise, 
  Sunset,
  MoreHorizontal
} from "lucide-react";
import Preloader from "@/components/Preloader";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState("2026-04-18");
  const [activeShift, setActiveShift] = useState<"morning" | "evening">("morning");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const currentDay = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="flex h-full w-full flex-col bg-[#EBEBEB] text-[#1A1A1A] font-sans overflow-y-auto pt-8 pb-32">
      <Preloader />
      
      {/* Header */}
      <header className="flex items-center justify-between mb-8 px-5">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-300">
             <img 
               src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=2574&auto=format&fit=crop" 
               alt="Profile" 
               className="h-full w-full object-cover"
             />
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-400 text-sm font-medium">Good Morning,</span>
            <span className="text-[#5D55F3] text-lg font-bold">Sayas R.</span>
          </div>
        </div>
        <button className="text-zinc-400 p-2">
          <MoreVertical size={24} />
        </button>
      </header>

      {/* Date and Shifts */}
      <section className="flex gap-3 mb-8 px-5">
        {/* Date Picker Button */}
        <button 
          onClick={() => dateInputRef.current?.showPicker()}
          className="flex-1 bg-[#5D55F3] rounded-[2rem] h-24 p-6 text-white flex items-center gap-4 shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform"
        >
          <div className="bg-white/20 p-3 rounded-2xl">
            <Calendar size={24} />
          </div>
          <div className="flex flex-col items-start translate-y-0.5">
            <span className="text-lg font-bold tracking-tight leading-none">{formatDate(selectedDate)}</span>
            <span className="text-white/80 text-xs font-medium mt-1">{currentDay}</span>
          </div>
          <input 
            ref={dateInputRef}
            type="date" 
            className="absolute opacity-0 pointer-events-none" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </button>

        {/* Shift Toggle Pill */}
        <div className="bg-[#5D55F3] rounded-[2.2rem] h-24 p-2 flex items-center gap-1 shadow-sm">
           <button 
             onClick={() => setActiveShift("morning")}
             className={`h-full w-16 rounded-[1.6rem] flex flex-col items-center justify-center transition-all duration-300 relative ${
               activeShift === "morning" ? "bg-white text-[#5D55F3]" : "text-white/80 hover:text-white"
             }`}
           >
              <div className="relative flex flex-col items-center">
                <div className="flex flex-col items-center translate-y-1">
                  <div className="mb-0.5">
                    <svg width="18" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mb-1 translate-y-1.5">
                      <path d="m17 7-5-5-5 5M12 2v22" className={activeShift === "morning" ? "opacity-100" : "opacity-80"} />
                    </svg>
                  </div>
                  <Sunrise size={20} strokeWidth={3} />
                </div>
              </div>
           </button>

           <button 
             onClick={() => setActiveShift("evening")}
             className={`h-full w-16 rounded-[1.6rem] flex flex-col items-center justify-center transition-all duration-300 ${
               activeShift === "evening" ? "bg-white text-[#5D55F3]" : "text-white/80 hover:text-white"
             }`}
           >
              <div className="relative flex flex-col items-center">
                <div className="flex flex-col items-center translate-y-1">
                  <div className="mb-0.5">
                    <svg width="18" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mb-1 -translate-y-1.5 rotate-180">
                      <path d="m17 7-5-5-5 5M12 2v22" className={activeShift === "evening" ? "opacity-100" : "opacity-80"} />
                    </svg>
                  </div>
                  <Sunset size={20} strokeWidth={3} />
                </div>
              </div>
           </button>
        </div>
      </section>

      {/* Inventory Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-black mb-4 px-5">Inventory<span className="text-[#5D55F3]">.</span></h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
          <div className="min-w-[220px] bg-[#5C54F1] rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col">
                <span className="text-white text-2xl font-black">Milk</span>
                <span className="text-white/80 text-sm font-medium">500ml</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white text-3xl font-black">100</span>
                <span className="text-white/80 text-sm font-medium uppercase tracking-wider">Bottles</span>
              </div>
            </div>
            <div className="bg-[#E7E6FF] px-6 py-3 flex justify-between items-center text-[#5C54F1]">
              <span className="text-[10px] font-bold uppercase">loaded to van</span>
              <span className="text-xs font-black">125 <span className="font-medium text-[10px]">Bottles</span></span>
            </div>
          </div>

          <div className="min-w-[220px] bg-[#5C54F1] rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col">
                <span className="text-white text-2xl font-black leading-tight">Curd (Skim</span>
                <span className="text-white/80 text-sm font-medium">500ml</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white text-3xl font-black">--</span>
                <span className="text-white/80 text-sm font-medium uppercase tracking-wider">Bottles</span>
              </div>
            </div>
            <div className="bg-[#E7E6FF] px-6 py-3 flex justify-between items-center text-[#5C54F1]">
              <span className="text-[10px] font-bold uppercase">loaded to van</span>
              <span className="text-xs font-black">-- <span className="font-medium text-[10px]">Bottles</span></span>
            </div>
          </div>
          {/* Invisible spacer to maintain end padding */}
          <div className="min-w-[5px] h-full" />
        </div>
      </section>

      {/* Delivered Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-black mb-4 px-5">Delivered<span className="text-[#5D55F3]">.</span></h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
          {[
            { name: "Milk", vol: "500ml", count: 100, unit: "Bottles" },
            { name: "Milk", vol: "1000ml", count: 50, unit: "Bottles" },
            { name: "Curd (Skim)", vol: "500ml", count: 20, unit: "Boxes" },
            { name: "Ghee", vol: "250ml", count: 10, unit: "Bottles" }
          ].map((item, i) => (
            <div key={i} className="min-w-[150px] bg-[#5C54F1] rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm">
               <div className="flex flex-col">
                <span className="text-white text-xl font-black leading-tight">{item.name}</span>
                <span className="text-white/80 text-[10px] font-bold">{item.vol}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white text-3xl font-black">{item.count}</span>
                <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{item.unit}</span>
              </div>
            </div>
          ))}
          {/* Invisible spacer to maintain end padding */}
          <div className="min-w-[5px] h-full" />
        </div>
      </section>

      {/* Summary Section */}
      <section className="grid grid-cols-2 gap-4 px-5">
        <div className="bg-[#DBEDE5] rounded-[2rem] p-6 flex flex-col items-center border border-[#B8D7C9]">
           <span className="text-2xl font-black flex items-center gap-1">
             <span className="text-sm font-bold">₹</span> 25000
           </span>
           <span className="text-xs font-bold text-zinc-600 mb-4">To Collect</span>
           <div className="bg-[#A0C9B1] px-3 py-1.5 rounded-full text-white text-[9px] font-black uppercase">
             from 100 Customers
           </div>
        </div>
        <div className="bg-[#EFDEE0] rounded-[2rem] p-6 flex flex-col items-center border border-[#E2CBCF]">
           <span className="text-2xl font-black flex items-center gap-1">
             <span className="text-sm font-bold">₹</span> 15000
           </span>
           <span className="text-xs font-bold text-zinc-600 mb-4">To Pay</span>
           <div className="bg-[#CB979D] px-3 py-1.5 rounded-full text-white text-[9px] font-black uppercase">
             to 2 Vendors
           </div>
        </div>
      </section>

    </div>
  );
}
