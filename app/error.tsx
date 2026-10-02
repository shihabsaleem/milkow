"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Segment-level error boundary.
 *
 * Without this, any render throw inside a page blanks the whole screen for the
 * user — worst case a driver mid-route with a hand-truck and no way forward.
 * This catches it in place and offers a retry that does not lose the session.
 *
 * Next.js only passes `error`/`reset` to this client component; `error.message`
 * is stripped in production builds, so never render it to the user.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for logging. Until a monitoring backend is wired up this lands in
    // the browser console only — see `app/global-error.tsx` for the escape hatch.
    console.error("[app] Unhandled render error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh w-full bg-mono-bg flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md w-full bg-white rounded-hero p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] border border-mono-divider flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-mono-surface rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={32} className="text-mono-text" />
        </div>

        <h1 className="text-4xl font-semibold text-mono-text tracking-tight mb-2">Something broke</h1>
        <h2 className="text-xl font-semibold text-mono-text-muted mb-4">
          This screen hit an unexpected error
        </h2>

        <p className="text-sm font-medium text-mono-text-muted mb-8 leading-relaxed">
          Nothing you have delivered or billed was lost. Try again — if it keeps
          happening, go back to the dashboard.
        </p>

        {error.digest && (
          <p className="text-xs font-mono text-mono-text-muted/70 mb-6">
            Reference: {error.digest}
          </p>
        )}

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-mono-text hover:bg-mono-text/80 text-white font-bold py-4 rounded-card shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <RefreshCw size={18} />
            Try Again
          </button>

          <Link
            href="/"
            className="w-full bg-mono-surface hover:bg-mono-divider text-mono-text font-bold py-4 rounded-card active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Home size={18} />
            Go to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
