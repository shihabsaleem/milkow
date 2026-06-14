import * as T from "@/types/database";

export type DeliveredItem = { name: string; vol: string; count: number; unit: string };

export function InventoryCard({ item }: { item: T.InventoryItem }) {
  const isEmpty = item.count === 0;
  return (
    <div className="min-w-[210px] sm:min-w-0 shrink-0 rounded-2xl overflow-hidden snap-start hover:brightness-105 transition-all bg-primary flex flex-col h-full">
      <div className="p-5 pb-4 flex-1">
        <p className="text-white text-[18px] font-bold leading-tight">{item.name}</p>
        <p className="text-[13px] font-medium text-white/60">{item.vol}</p>
        <div className="mt-4">
          <p className="text-white text-[38px] font-black leading-none">{isEmpty ? "—" : item.count}</p>
          <p className="text-[11px] font-semibold uppercase tracking-widest mt-1 text-white/60">{item.unit}</p>
        </div>
      </div>
      <div className="px-5 py-3 flex items-center justify-between bg-black/20 mt-auto">
        <p className="text-[11px] font-semibold tracking-wide text-white/70">Loaded to Van</p>
        <p className="text-[14px] font-bold text-white">{isEmpty ? "—" : item.loaded}<span className="text-[10px] font-medium ml-1 text-white/70">{item.unit}</span></p>
      </div>
    </div>
  );
}

export function DeliveredCard({ item }: { item: DeliveredItem }) {
  return (
    <div className="rounded-2xl p-5 hover:brightness-105 transition-all bg-primary">
      <p className="text-white text-[17px] font-bold leading-tight">{item.name}</p>
      <p className="text-[13px] font-medium mt-0.5 text-white/60">{item.vol}</p>
      <div className="mt-4">
        <p className="text-white text-[38px] font-black leading-none">{item.count}</p>
        <p className="text-[11px] font-semibold uppercase tracking-widest mt-1 text-white/60">{item.unit}</p>
      </div>
    </div>
  );
}

export function FinanceCard({ amount, label, badge, type }: { amount: string; label: string; badge: string; type: "green" | "red" | "blue" }) {
  const isGreen = type === "green";
  const isBlue = type === "blue";
  return (
    <div className={`rounded-2xl p-5 flex flex-col justify-between items-center gap-1 border ${isGreen ? 'bg-primary/5 border-primary/20' : isBlue ? 'bg-blue-50 border-blue-200' : 'bg-rose-50 border-rose-200'}`}>
      <div className="w-full">
        <p className="text-[22px] font-extrabold text-zinc-900 text-center">{amount}</p>
        <p className="text-[13px] font-semibold mb-2 text-zinc-600 text-center leading-tight">{label}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-white text-[11px] font-bold text-center ${isGreen ? 'bg-emerald-500' : isBlue ? 'bg-blue-500' : 'bg-rose-500'}`}>{badge}</span>
    </div>
  );
}
