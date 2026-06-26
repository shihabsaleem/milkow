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
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Drop up if there's less than 200px below and more space above
      if (spaceBelow < 200 && rect.top > spaceBelow) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, [isOpen]);

  return (
    <div className={`relative ${fullWidth ? "w-full" : "w-fit"} ${isOpen ? "z-100" : "z-10"} ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled mb-1.5 block">
          {label}
        </label>
      )}
      
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between bg-mono-bg border border-mono-divider rounded-card px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-primary/20 ${
          fullWidth ? "w-full" : ""
        } ${isOpen ? "border-mono-border ring-2 ring-primary/10" : ""}`}
      >
        <span className={selectedOption ? "text-mono-text font-bold" : "text-mono-text-disabled"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-mono-text-disabled transition-transform duration-300 ${isOpen ? (dropUp ? "rotate-0" : "rotate-180") : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: dropUp ? 5 : -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 5 : -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute left-0 right-0 ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} bg-white/90 backdrop-blur-xl border border-mono-border/50 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-card overflow-hidden z-110 min-w-[200px]`}
          >
            {/* Hard-capped max height to ensure it fits and forces scrollbar on small screens */}
            <div className="py-1 overflow-y-auto max-h-[160px] overscroll-contain">
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
                    className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center justify-between transition-all ${
                      value === option.value
                        ? "bg-mono-text/5 text-mono-text"
                        : "text-mono-text-muted hover:bg-mono-bg"
                    } ${option.disabled ? "opacity-50 cursor-not-allowed bg-mono-bg" : ""}`}
                  >
                    <span>{option.label} {option.disabled && <span className="text-[10px] font-normal uppercase ml-2 text-mono-text-disabled tracking-wider">(Closed)</span>}</span>
                    {value === option.value && !option.disabled && <Check size={14} strokeWidth={3} />}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-mono-text-disabled text-center italic">
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

