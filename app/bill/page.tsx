"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { Search, ArrowLeft, Milk, AlertCircle, Share2, Check, RefreshCw, Smartphone, CheckCircle2, Copy, DollarSign } from "lucide-react";
import { getPublicBill } from "./actions";
import Link from "next/link";
import Image from "next/image";

interface BillData {
  customer_name: string;
  phone: string;
  area_name: string;
  current_balance: number;
  upi_id: string;
  payee_name: string;
  currency_code: string;
}

export default function PublicBillPage() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [billData, setBillData] = useState<BillData | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 10) {
      setPhone(val);
      setError("");
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await getPublicBill(phone);
      if (res.error) {
        setError(res.error);
        setBillData(null);
      } else if (res.success && res.data) {
        setBillData(res.data as BillData);
      }
    } catch (err) {
      setError("Failed to fetch bill details. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setBillData(null);
    setPhone("");
    setError("");
  };

  const copyUpiId = () => {
    if (!billData) return;
    navigator.clipboard.writeText(billData.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareBillLink = async () => {
    if (!billData) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `Hi, view your latest milk bill outstanding balance of ₹${billData.current_balance.toFixed(2)} on Milkow.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Milkow Public Bill",
          text,
          url,
        });
      } else {
        await navigator.clipboard.writeText(`${text} Link: ${url}`);
        alert("Bill details copied to clipboard!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getUpiLink = () => {
    if (!billData) return "";
    const { upi_id, payee_name, currency_code } = billData;
    return `upi://pay?pa=${upi_id}&pn=${encodeURIComponent(payee_name)}&am=${billData.current_balance.toFixed(2)}&cu=${currency_code}`;
  };

  return (
    <div className="min-h-dvh w-full bg-slate-50/50 text-zinc-850 flex flex-col items-center justify-between p-4 sm:p-6 font-sans relative">
      
      {/* Header */}
      <header className="w-full max-w-md flex justify-end items-center z-10 pt-2">
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 border border-zinc-200/50 px-2.5 py-1 rounded-full">
          Client Portal
        </span>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md flex-1 flex flex-col justify-center py-6 sm:py-12 z-10">
        
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/assets/logo.svg"
            alt="Milkow Logo"
            width={120}
            height={32}
            className="object-contain w-[120px] h-auto mb-1"
            priority
          />
         
        </div>

        <AnimatePresence mode="wait">
          {!billData ? (
            /* ================= SEARCH FORM STATE ================= */
            <motion.div
              key="search-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)]"
            >
              <div className="text-center mb-6">
                
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight">View Your Bill</h1>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  Enter your registered mobile number to fetch your balance and generate your payment link.
                </p>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 relative">
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-zinc-400 flex items-center">
                      <span className="text-xs font-bold mr-1.5">+91</span>
                      <div className="w-px h-3.5 bg-zinc-200 mr-1.5" />
                    </div>
                    <input
                      type="tel"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-zinc-50/50 border border-zinc-200 hover:border-zinc-300 focus:border-primary focus:bg-white rounded-xl pl-16 pr-4 py-3.5 text-sm font-semibold text-zinc-900 focus:outline-none transition-all placeholder:text-zinc-400"
                      placeholder="Mobile number"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold flex items-start gap-2 overflow-hidden"
                    >
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoading || phone.length < 10}
                  className="w-full bg-primary hover:bg-zinc-800 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-1 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Search Bill
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : billData.current_balance <= 0 ? (
            /* ================= SETTLED STATE ================= */
            <motion.div
              key="settled-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} />
              </div>

              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Account Settled</h2>

              <div className="bg-zinc-50/50 border border-zinc-150 rounded-2xl px-4 py-3.5 my-5 text-left text-xs">
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Customer</p>
                <p className="font-bold text-zinc-900 mt-0.5">{billData.customer_name}</p>
                <p className="text-zinc-500 mt-0.5">{billData.area_name}</p>

                <div className="w-full h-px bg-zinc-200/60 my-2.5" />

                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Outstanding Balance</p>
                <p className={`font-bold mt-0.5 ${billData.current_balance < 0 ? "text-indigo-600" : "text-emerald-600"}`}>
                  {billData.current_balance < 0 ? (
                    `₹${Math.abs(billData.current_balance).toFixed(2)} (Advance)`
                  ) : (
                    "₹0.00"
                  )}
                </p>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed px-1">
                {billData.current_balance < 0 ? (
                  "You have an advance credit with us. No payment is required."
                ) : (
                  "No outstanding balance. Thank you for your support!"
                )}
              </p>

              <button
                onClick={handleReset}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-xl border border-zinc-200/50 transition-all active:scale-[0.98] mt-6 cursor-pointer text-xs"
              >
                Search Another Number
              </button>
            </motion.div>
          ) : (
            /* ================= ACTIVE OUTSTANDING BILL STATE ================= */
            <motion.div
              key="bill-details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-4"
            >
              {/* Receipt Ticket Container */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.03)] overflow-hidden p-5 sm:p-6 relative">
                
                {/* Back Button */}
                <button
                  onClick={handleReset}
                  className="absolute top-4 left-4 p-1.5 bg-zinc-50 hover:bg-zinc-150 border border-zinc-200/50 rounded-full text-zinc-500 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                </button>

                {/* Top Receipt Info */}
                <div className="text-center pt-8 pb-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Payable Balance</p>
                  <h2 className="text-3xl font-black text-zinc-950 mt-1 tracking-tight">
                    ₹{billData.current_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </h2>
                </div>

                {/* Info Block */}
                <div className="bg-zinc-50/70 border border-zinc-200/60 rounded-xl px-4 py-3 my-4 flex justify-between items-center text-left text-xs">
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 block leading-none">Bill To</span>
                    <span className="font-extrabold text-zinc-900 mt-1.5 block leading-none">{billData.customer_name}</span>
                    <span className="text-zinc-500 mt-1 block leading-none">{billData.phone}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 block leading-none">Route</span>
                    <span className="text-[10px] font-bold text-zinc-700 bg-zinc-200/50 px-2.5 py-1 rounded-md mt-1.5 inline-block border border-zinc-200">
                      {billData.area_name}
                    </span>
                  </div>
                </div>

                <div className="w-full border-t border-zinc-200 my-4" />

                {/* QR Code Container */}
                <div className="flex flex-col items-center">
                  <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-2xl shadow-xs relative">
                    <QRCodeCanvas
                      value={getUpiLink()}
                      size={150}
                      includeMargin={false}
                      level="H"
                      imageSettings={{
                        src: "/assets/icon.svg",
                        x: undefined,
                        y: undefined,
                        height: 28,
                        width: 28,
                        excavate: true,
                      }}
                    />
                  </div>
                  
                  <div className="mt-3.5 text-center text-zinc-500">
                    <p className="text-[8px] font-bold uppercase tracking-widest">{billData.payee_name}</p>
                    <p className="text-[9px] font-bold tracking-widest uppercase mt-0.5 text-zinc-400">Scan with any UPI App</p>
                  </div>
                </div>

                {/* Payment Action Buttons */}
                <div className="w-full mt-6 flex flex-col gap-2">
                  <a
                    href={getUpiLink()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-xs"
                  >
                    <Smartphone size={16} />
                    Pay via UPI App
                  </a>

                  <div className="flex gap-2">
                    <button
                      onClick={copyUpiId}
                      className="flex-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 py-2.5 rounded-xl font-bold text-xs border border-zinc-200/60 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copied ? "Copied" : "Copy UPI ID"}
                    </button>
                    <button
                      onClick={shareBillLink}
                      className="flex-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 py-2.5 rounded-xl font-bold text-xs border border-zinc-200/60 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 size={12} />
                      Share Bill
                    </button>
                  </div>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="bg-zinc-50 border border-zinc-200/70 rounded-xl p-4 flex gap-3 text-left">
                <AlertCircle className="text-zinc-400 shrink-0 mt-0.5" size={15} />
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 leading-none">Important Payment Notice</h4>
                  <p className="text-[10px] text-zinc-500 mt-1.5 leading-normal">
                    After completing your payment on your UPI app, it may take up to 24 hours to reflect on this dashboard as payments require manual verification by the administrator.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full z-10 pb-2">
        <p className="text-center text-zinc-400 text-[9px] font-semibold tracking-wide uppercase opacity-70">
          &copy; 2026 Milkow &bull; <a href="https://shihabsaleem.site" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 transition-colors">shihab saleem</a>
        </p>
      </footer>
    </div>
  );
}
