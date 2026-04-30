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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 pb-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`h-16 w-16 rounded-3xl flex items-center justify-center ${
                  type === 'danger' ? 'bg-rose-50 text-rose-500' : 
                  type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                  'bg-primary/10 text-primary'
                }`}>
                  {type === 'danger' ? <AlertTriangle size={32} /> : <X size={32} />}
                </div>
                
                <div>
                  <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{title}</h3>
                  <p className="text-sm text-zinc-500 font-medium mt-2 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              {showDontShowAgain && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDontShowAgain(!dontShowAgain)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      dontShowAgain ? 'bg-primary border-primary text-white' : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    {dontShowAgain && <Check size={12} strokeWidth={4} />}
                  </button>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
                    Don't show this again
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-8">
                <button
                  onClick={() => onConfirm(dontShowAgain)}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                    type === 'danger' ? 'bg-rose-500 text-white shadow-rose-200' : 
                    'bg-primary text-white shadow-primary/20'
                  }`}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95"
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
