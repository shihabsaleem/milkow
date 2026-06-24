"use client";
import { useEffect } from "react";
import { MoreVertical, Calendar, Sunrise, Sunset, User, LogOut, Wallet, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { InventoryCard, DeliveredCard, FinanceCard } from "@/components/dashboard/DashboardCards";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useDashboardLogic } from "@/hooks/useDashboardLogic";

const fmtDate = (s: string) => {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function Dashboard() {
  const router = useRouter();
  const { logout, user, loading, role } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const {
    date,
    setDate,
    menuOpen,
    setMenuOpen,
    inventory,
    delivered,
    adminName,
    toCollectAmount,
    advanceAmount,
    customerCount,
    dailySales,
    dailyPayments,
    isLoading,
    inputRef,
    dayName,
    shift,
    fetchDashboardData,
    handleShiftToggle
  } = useDashboardLogic();

  const handleLogout = async () => {
    await logout();
    document.cookie = "milkow_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchDashboardData(true)} className="bg-slate-50 pb-32">
      <div className="sticky top-0 z-40 border-b bg-slate-50/90 border-black/5 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-white shadow-sm shrink-0 relative bg-primary flex items-center justify-center">
              <span className="text-white text-lg font-black">{adminName.charAt(0)}</span>
            </div>
            <div className="flex flex-col leading-tight">
              <p className="text-[12px] font-medium text-zinc-400">{shift === "morning" ? "Good Morning," : "Good Evening,"}</p>
              <p className="text-[17px] font-extrabold text-primary">{adminName}</p>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 active:scale-95">
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="absolute right-0 top-12 w-52 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden py-1 z-50 origin-top-right text-left">
                  <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"><User size={16} className="text-zinc-400" /> Profile</Link>
                  <div className="w-full h-px bg-zinc-100" />
                  <Link href="/billing" className="flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"><Wallet size={16} className="text-zinc-400" /> Billing</Link>
                  <div className="w-full h-px bg-zinc-100" />
                  {role === 'superadmin' && (
                    <>
                      <Link href="/superadmin" className="flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition-colors"><ShieldAlert size={16} className="text-emerald-500" /> Superadmin</Link>
                      <div className="w-full h-px bg-zinc-100" />
                    </>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors"><LogOut size={16} className="text-rose-400" /> Log Out</button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto pt-5 pb-32 flex flex-col gap-10">
        <section className="flex flex-col gap-4 px-7">
          <div className="w-full rounded-2xl h-[68px] px-5 text-white flex items-center gap-4 relative bg-primary">
            <div className="p-2.5 rounded-xl shrink-0 pointer-events-none bg-white/20"><Calendar size={20} strokeWidth={2} /></div>
            <div className="pointer-events-none">
              <p className="text-[17px] font-bold tracking-tight leading-snug">{fmtDate(date)}</p>
              <p className="text-[12px] font-medium leading-none mt-0.5 text-white/70">{dayName}</p>
            </div>
            <div className="ml-auto pointer-events-none flex items-center gap-1 text-white/50"><Calendar size={14} strokeWidth={2} /><span className="text-[11px] font-medium">Tap to change</span></div>
            <input ref={inputRef} type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base z-10" value={date} onChange={e => setDate(e.target.value)} onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }} />
          </div>

          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#EBEBEF] relative h-14">
            <motion.div layout className="absolute inset-y-1 rounded-xl shadow-sm z-0 bg-white" style={{ left: shift === "morning" ? "4px" : "50%", width: "calc(50% - 4px)" }} transition={{ type: "spring", stiffness: 450, damping: 35 }} />
            <button onClick={() => handleShiftToggle("morning")} className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl transition-all ${shift === "morning" ? "text-primary" : "text-[#A1A1AA] hover:text-[#71717A]"}`}><Sunrise size={20} strokeWidth={2.5} /><span className="text-[15px] font-bold">Morning</span></button>
            <button onClick={() => handleShiftToggle("evening")} className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl transition-all ${shift === "evening" ? "text-primary" : "text-[#A1A1AA] hover:text-[#71717A]"}`}><Sunset size={20} strokeWidth={2.5} /><span className="text-[15px] font-bold">Evening</span></button>
          </div>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 mt-2 text-zinc-400 px-7">Inventory</p>
          <div className="sm:hidden flex gap-4 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory pl-7">
            {isLoading ? (
              [1, 2].map(i => <div key={i} className="min-w-[210px] h-[180px] rounded-2xl bg-zinc-200 animate-pulse" />)
            ) : (
              inventory.map((item, i) => <InventoryCard key={i} item={item} />)
            )}
            <div className="min-w-[28px] shrink-0" />
          </div>
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 gap-3 px-7">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-[180px] rounded-2xl bg-zinc-200 animate-pulse" />)
            ) : (
              inventory.map((item, i) => <InventoryCard key={i} item={item} />)
            )}
          </div>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 mt-2 text-zinc-400 px-7">Delivered</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-7">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-[140px] rounded-2xl bg-zinc-200 animate-pulse" />)
            ) : (
              delivered.map((item, i) => <DeliveredCard key={i} item={item} />)
            )}
          </div>
        </section>

        <section className="px-7">
          <p className="text-[12px] font-bold uppercase tracking-widest mb-3 text-zinc-400">Financials</p>
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              <>
                <div className="h-[120px] rounded-2xl bg-zinc-200 animate-pulse" />
                <div className="h-[120px] rounded-2xl bg-zinc-200 animate-pulse" />
                <div className="h-[120px] rounded-2xl bg-zinc-200 animate-pulse" />
                <div className="h-[120px] rounded-2xl bg-zinc-200 animate-pulse" />
              </>
            ) : (
              <>
                <FinanceCard amount={`₹${toCollectAmount.toLocaleString()}`} label="To Collect" badge={`${customerCount} Customers`} type="green" />
                <FinanceCard amount={`₹${advanceAmount.toLocaleString()}`} label="Customer Advances" badge="Total Credit" type="green" />
                <FinanceCard amount={`₹${dailySales.toLocaleString()}`} label="Daily Sales" badge={fmtDate(date)} type="blue" />
                <FinanceCard amount={`₹${dailyPayments.toLocaleString()}`} label="Daily Payments" badge="Received Today" type="blue" />
              </>
            )}
          </div>
        </section>
      </div>
    </PullToRefresh>
  );
}
