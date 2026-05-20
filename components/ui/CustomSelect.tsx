"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  fullWidth?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select option",
  label,
  className = "",
  fullWidth = true,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${fullWidth ? "w-full" : "w-fit"} ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5 block">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-primary/20 ${
          fullWidth ? "w-full" : ""
        } ${isOpen ? "border-primary/30 ring-2 ring-primary/10" : ""}`}
      >
        <span className={selectedOption ? "text-zinc-900 font-bold" : "text-zinc-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-zinc-200/50 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-2xl overflow-hidden z-110 min-w-[200px]"
          >
            <div className="py-1 max-h-60 overflow-y-auto no-scrollbar">
              {options.length > 0 ? (
                options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between transition-all ${
                      value === option.value
                        ? "bg-primary/5 text-primary"
                        : "text-zinc-600 hover:bg-zinc-50"
                    } ${option.disabled ? "opacity-50 cursor-not-allowed bg-zinc-50" : ""}`}
                  >
                    <span>{option.label} {option.disabled && <span className="text-[10px] font-normal uppercase ml-2 text-zinc-400 tracking-wider">(Closed)</span>}</span>
                    {value === option.value && !option.disabled && <Check size={14} strokeWidth={3} />}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-zinc-400 text-center italic">
                  No options available
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
