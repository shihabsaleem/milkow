"use client";

import { useState, useRef, ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function PullToRefresh({ onRefresh, children, className = "", disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    const container = e.currentTarget;
    if (container.scrollTop <= 0) {
      startY.current = e.touches[0].pageY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const touchY = e.touches[0].pageY;
    const diff = touchY - startY.current;

    if (diff > 0 && e.currentTarget.scrollTop <= 0) {
      // Apply resistance
      const distance = Math.pow(diff, 0.7);
      setPullDistance(Math.min(distance * 2, 80));
      if (diff > 10 && e.cancelable) e.preventDefault();
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(40);
      try {
        await onRefresh();
      } catch (err) {
        console.error("Refresh failed", err);
      }
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      className={`flex flex-col h-full w-full overflow-y-auto overscroll-contain no-scrollbar ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        animate={{ height: pullDistance }}
        style={{ opacity: Math.min(pullDistance / 40, 1) }}
        className="flex items-center justify-center overflow-hidden shrink-0"
      >
        <div className={`transition-transform duration-300 ${pullDistance > 60 ? 'rotate-180' : ''}`}>
          <ChevronDown size={20} className={isRefreshing ? 'hidden' : 'text-mono-text'} />
        </div>
        {isRefreshing && (
          <div className="w-5 h-5 border-2 border-mono-text border-t-transparent rounded-full animate-spin" />
        )}
        {!isRefreshing && pullDistance > 10 && (
          <span className="text-[10px] font-bold uppercase tracking-widest ml-2 text-mono-text">
            {pullDistance > 60 ? 'Release' : 'Pull'}
          </span>
        )}
      </motion.div>
      {children}
    </div>
  );
}
