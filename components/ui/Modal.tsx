import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Check } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dontShowAgain?: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'success';
  showDontShowAgain?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = 'info',
  showDontShowAgain = false
}: ModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-mono-text/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-hero shadow-md overflow-hidden"
          >
            <div className="p-8 pb-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`h-16 w-16 rounded-hero flex items-center justify-center ${type === 'danger' ? 'bg-mono-surface text-mono-text' :
                  type === 'success' ? 'bg-mono-surface text-mono-text' :
                    'bg-mono-text/10 text-mono-text'
                  }`}>
                  {type === 'danger' ? <AlertTriangle size={32} /> : <X size={32} />}
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-mono-text uppercase tracking-tight">{title}</h3>
                  <p className="text-sm text-mono-text-muted font-medium mt-2 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              {showDontShowAgain && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDontShowAgain(!dontShowAgain)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${dontShowAgain ? 'bg-mono-text border-mono-text text-white' : 'border-mono-border bg-mono-bg'
                      }`}
                  >
                    {dontShowAgain && <Check size={12} strokeWidth={4} />}
                  </button>
                  <span className="text-xs font-bold text-mono-text-disabled uppercase tracking-wider cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
                    Don&apos;t show this again
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-8">
                <button
                  onClick={() => onConfirm(dontShowAgain)}
                  className={`w-full py-4 rounded-card font-bold text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg ${type === 'danger' ? 'bg-mono-text text-white shadow-md' :
                    'bg-mono-text text-white shadow-sm'
                    }`}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-card font-bold text-sm uppercase tracking-widest text-mono-text-disabled hover:text-mono-text-muted hover:bg-mono-bg transition-all active:scale-95"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
