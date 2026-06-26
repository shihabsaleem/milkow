import * as T from "@/types/database";

export type DeliveredItem = { name: string; vol: string; count: number; unit: string };

export function InventoryCard({ item }: { item: T.InventoryItem }) {
  const isEmpty = item.count === 0;
  const progress = item.loaded > 0 ? Math.min((item.count / item.loaded) * 100, 100) : 0;
  return (
    <div className="rounded-card bg-white border border-mono-border flex flex-col gap-3 p-4">
      {/* Name */}
      <p className="text-[12px] font-medium text-mono-text-muted leading-tight truncate">{item.name}</p>

      {/* Count */}
      <div className="flex items-baseline gap-1">
        <p className="text-[28px] font-bold text-mono-text leading-none">{isEmpty ? "—" : item.count}</p>
        <p className="text-[11px] text-mono-text-disabled">{item.unit}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-[3px] bg-mono-divider rounded-full overflow-hidden">
        <div className="h-full bg-mono-text rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-mono-text-disabled">Loaded</p>
        <p className="text-[12px] font-semibold text-mono-text">
          {isEmpty ? "—" : item.loaded}
          <span className="text-[10px] font-normal text-mono-text-muted ml-0.5">{item.unit}</span>
        </p>
      </div>
    </div>
  );
}

export function DeliveredCard({ item }: { item: DeliveredItem }) {
  return (
    <div className="rounded-card p-4 bg-white border border-mono-border flex flex-col gap-3">
      <p className="text-[12px] font-medium text-mono-text-muted leading-tight truncate">{item.name}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-[28px] font-bold text-mono-text leading-none">{item.count}</p>
        <p className="text-[11px] text-mono-text-disabled">{item.unit}</p>
      </div>
    </div>
  );
}

export function FinanceCard({ amount, label, badge, type }: { amount: string; label: string; badge: string; type: "green" | "red" | "blue" }) {
  return (
    <div className="rounded-card p-4 bg-white border border-mono-border flex flex-col gap-3 justify-between">
      <div>
        <p className="text-[22px] font-bold text-mono-text leading-none truncate">{amount}</p>
        <p className="text-[12px] font-medium text-mono-text-muted mt-2 leading-tight">{label}</p>
      </div>
      {badge ? <p className="text-[11px] text-mono-text-disabled">{badge}</p> : <span />}
    </div>
  );
}

