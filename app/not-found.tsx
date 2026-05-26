"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-dvh w-full bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={32} className="text-rose-500" />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-4">Page Not Found</h2>
        
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
          The page you are looking for doesn't exist or you don't have permission to view it.
        </p>

        <Link 
          href="/bill"
          className="w-full bg-primary hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn"
        >
          <Home size={18} />
          Go to Bill
        </Link>
      </motion.div>
    </div>
  );
}
