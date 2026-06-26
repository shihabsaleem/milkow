"use client";
import { useEffect } from "react";
import { MoreVertical, Calendar, User, LogOut, Wallet, ShieldAlert, Sunrise, Sunset } from "lucide-react";
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
    totalOrders,
    deliveredCount,
    pendingCount,
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
      <div className="min-h-screen w-full flex items-center justify-center bg-mono-bg">
        <div className="w-8 h-8 border-4 border-mono-text border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchDashboardData(true)} className="bg-mono-bg pb-32 min-h-screen">
      <div className="sticky top-0 z-40 border-b bg-mono-bg/90 border-mono-divider backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <>
                <div className="h-10 w-10 rounded-card bg-mono-skeleton animate-pulse shrink-0" />
                <div className="flex flex-col gap-1.5 w-32">
                  <div className="h-3 bg-mono-border rounded-md w-2/3 animate-pulse" />
                  <div className="h-4 bg-mono-border rounded-md w-full animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-card overflow-hidden border border-mono-border shrink-0 relative bg-mono-text flex items-center justify-center">
                  <span className="text-white text-[18px] font-bold">{adminName.charAt(0)}</span>
                </div>
                <div className="flex flex-col leading-tight">
                  <p className="text-[13px] font-medium text-mono-text-muted">{shift === "morning" ? "Good Morning" : "Good Evening"}</p>
                  <p className="text-[22px] font-semibold text-mono-text">{adminName}</p>
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 rounded-card flex items-center justify-center transition-colors text-mono-text active:scale-95">
              <MoreVertical size={24} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="absolute right-0 top-12 w-52 bg-white border border-mono-border shadow-lg rounded-card overflow-hidden py-1 z-50 origin-top-right text-left">
                  <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-[16px] font-medium text-mono-text hover:bg-mono-surface transition-colors"><User size={18} className="text-mono-text" /> Profile</Link>
                  <div className="w-full h-px bg-mono-divider" />
                  <Link href="/billing" className="flex items-center gap-3 px-4 py-3 text-[16px] font-medium text-mono-text hover:bg-mono-surface transition-colors"><Wallet size={18} className="text-mono-text" /> Billing</Link>
                  <div className="w-full h-px bg-mono-divider" />
                  {role === 'superadmin' && (
                    <>
                      <Link href="/superadmin" className="flex items-center gap-3 px-4 py-3 text-[16px] font-medium text-mono-text hover:bg-mono-surface transition-colors"><ShieldAlert size={18} className="text-mono-text" /> Superadmin</Link>
                      <div className="w-full h-px bg-mono-divider" />
                    </>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-[16px] font-medium text-mono-text hover:bg-mono-surface transition-colors"><LogOut size={18} className="text-mono-text" /> Log Out</button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto pt-5 pb-32 flex flex-col gap-10">
        <section className="flex flex-col gap-4 px-7">
          <div className="w-full rounded-card h-[68px] px-5 text-mono-text flex items-center gap-4 relative bg-white border border-mono-border">
            <div className="shrink-0 pointer-events-none text-mono-text"><Calendar size={24} strokeWidth={2} /></div>
            <div className="pointer-events-none">
              <p className="text-[16px] font-medium tracking-tight leading-snug">{fmtDate(date)}</p>
              <p className="text-[13px] text-mono-text-muted mt-0.5">{dayName}</p>
            </div>
            <div className="ml-auto pointer-events-none flex items-center gap-1 text-mono-text-muted"><span className="text-[13px]">Tap to change</span></div>
            <input ref={inputRef} type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base z-10" value={date} onChange={e => setDate(e.target.value)} onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }} />
          </div>

          <div className="grid grid-cols-2 p-1 rounded-card bg-mono-surface border border-mono-border relative h-[56px]">
            <motion.div layout className="absolute inset-y-1 rounded-card z-0 bg-mono-text" style={{ left: shift === "morning" ? "4px" : "50%", width: "calc(50% - 4px)" }} transition={{ type: "spring", stiffness: 450, damping: 35 }} />
            <button onClick={() => handleShiftToggle("morning")} className={`relative z-10 flex items-center justify-center gap-2.5 rounded-card transition-all ${shift === "morning" ? "text-white" : "text-mono-text"}`}><Sunrise size={15} strokeWidth={2.5} /><span className="text-[16px] font-medium">Morning</span></button>
            <button onClick={() => handleShiftToggle("evening")} className={`relative z-10 flex items-center justify-center gap-2.5 rounded-card transition-all ${shift === "evening" ? "text-white" : "text-mono-text"}`}><Sunset size={15} strokeWidth={2.5} /><span className="text-[16px] font-medium">Evening</span></button>
          </div>
        </section>

        <section className="px-7">
          <p className="text-[16px] font-semibold mb-4 text-mono-text">Today's Summary</p>
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              <>
                <div className="h-[110px] rounded-card bg-mono-skeleton animate-pulse" />
                <div className="h-[110px] rounded-card bg-mono-skeleton animate-pulse" />
                <div className="h-[110px] rounded-card bg-mono-skeleton animate-pulse" />
                <div className="h-[110px] rounded-card bg-mono-skeleton animate-pulse" />
              </>
            ) : (
              <>
                <div className="bg-white border border-mono-border rounded-card p-4 flex flex-col justify-between h-[110px]">
                  <p className="text-mono-text-muted text-[16px] font-medium">Orders</p>
                  <p className="text-mono-text text-[36px] font-bold leading-none">{totalOrders}</p>
                </div>
                <div className="bg-white border border-mono-border rounded-card p-4 flex flex-col justify-between h-[110px]">
                  <p className="text-mono-text-muted text-[16px] font-medium">Delivered</p>
                  <p className="text-mono-text text-[36px] font-bold leading-none">{deliveredCount}</p>
                </div>
                <div className="bg-white border border-mono-border rounded-card p-4 flex flex-col justify-between h-[110px]">
                  <p className="text-mono-text-muted text-[16px] font-medium">Pending</p>
                  <p className="text-mono-text text-[36px] font-bold leading-none">{pendingCount}</p>
                </div>
                <div className="bg-white border border-mono-border rounded-card p-4 flex flex-col justify-between h-[110px]">
                  <p className="text-mono-text-muted text-[16px] font-medium">Customers</p>
                  <p className="text-mono-text text-[36px] font-bold leading-none">{customerCount}</p>
                </div>
              </>
            )}
          </div>
        </section>

        <section>
          <p className="text-[16px] font-semibold mb-4 text-mono-text px-7">Inventory</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-7">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-[190px] rounded-card bg-mono-skeleton animate-pulse" />)
            ) : (
              inventory.map((item, i) => <InventoryCard key={i} item={item} />)
            )}
          </div>
        </section>

        <section>
          <p className="text-[16px] font-semibold mb-4 text-mono-text px-7">Delivered</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-7">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-[120px] rounded-card bg-mono-skeleton animate-pulse" />)
            ) : (
              delivered.map((item, i) => <DeliveredCard key={i} item={item} />)
            )}
          </div>
        </section>

        <section className="px-7">
          <p className="text-[16px] font-semibold mb-4 text-mono-text">Financials</p>
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              <>
                <div className="h-[140px] rounded-card bg-mono-skeleton animate-pulse" />
                <div className="h-[140px] rounded-card bg-mono-skeleton animate-pulse" />
                <div className="h-[140px] rounded-card bg-mono-skeleton animate-pulse" />
                <div className="h-[140px] rounded-card bg-mono-skeleton animate-pulse" />
              </>
            ) : (
              <>
                <FinanceCard amount={`₹${toCollectAmount.toLocaleString()}`} label="To Collect" badge={`${customerCount} Customers`} type="green" />
                <FinanceCard amount={`₹${advanceAmount.toLocaleString()}`} label="Customer Advance" badge="Total Credit" type="green" />
                <FinanceCard amount={`₹${dailySales.toLocaleString()}`} label="Today's Sales" badge="" type="blue" />
                <FinanceCard amount={`₹${dailyPayments.toLocaleString()}`} label="Today's Payments" badge="" type="blue" />
              </>
            )}
          </div>
        </section>
      </div>
    </PullToRefresh>
  );
}

