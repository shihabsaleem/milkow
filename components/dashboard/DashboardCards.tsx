import * as T from "@/types/database";

export type DeliveredItem = { name: string; vol: string; count: number; unit: string };

export function InventoryCard({ item }: { item: T.InventoryItem }) {
  const isEmpty = item.count === 0;
  const progress = item.loaded > 0 ? (item.count / item.loaded) * 100 : 0;
  return (
    <div className="min-w-[210px] sm:min-w-0 shrink-0 rounded-card overflow-hidden snap-start bg-white border border-mono-border flex flex-col h-full p-[20px]">
      <div className="flex-1">
        <p className="text-mono-text text-[16px] font-medium leading-tight">{item.name}</p>
        <div className="mt-4 mb-3 flex items-baseline gap-2">
          <p className="text-mono-text text-[36px] font-bold leading-none">{isEmpty ? "—" : item.count}</p>
          <p className="text-mono-text-muted text-[13px]">{item.unit}</p>
        </div>
        <div className="w-full h-[4px] bg-mono-divider mt-2 mb-4 rounded-full overflow-hidden">
          <div className="h-full bg-mono-text" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
      <div className="mt-auto pt-2 flex justify-between items-center border-t border-mono-divider">
        <p className="text-[13px] text-mono-text-muted">Loaded</p>
        <p className="text-mono-text text-[16px] font-medium">{isEmpty ? "—" : item.loaded} <span className="text-mono-text-muted text-[13px] font-normal">{item.unit}</span></p>
      </div>
    </div>
  );
}

export function DeliveredCard({ item }: { item: DeliveredItem }) {
  return (
    <div className="rounded-card p-[20px] bg-white border border-mono-border flex flex-col h-full">
      <p className="text-mono-text text-[16px] font-medium leading-tight">{item.name}</p>
      <div className="mt-auto pt-4 flex items-baseline gap-2">
        <p className="text-mono-text text-[36px] font-bold leading-none">{item.count}</p>
        <p className="text-mono-text-muted text-[13px]">{item.unit}</p>
      </div>
    </div>
  );
}

export function FinanceCard({ amount, label, badge, type }: { amount: string; label: string; badge: string; type: "green" | "red" | "blue" }) {
  return (
    <div className="rounded-card p-[20px] bg-white border border-mono-border flex flex-col h-full justify-between gap-4">
      <div>
        <p className="text-mono-text text-[28px] font-bold leading-none truncate">{amount}</p>
        <p className="text-mono-text text-[16px] font-medium mt-2">{label}</p>
      </div>
      <div>
        <p className="text-mono-text-muted text-[13px]">{badge}</p>
      </div>
    </div>
  );
}
