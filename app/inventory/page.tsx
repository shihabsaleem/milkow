"use client";

import { Plus, Box, ThermometerSnowflake, ChevronRight } from "lucide-react";
import data from "../../data/data.json";

export default function InventoryPage() {


  return (
    <div className="min-h-full w-full pb-32" style={{ background: "var(--bg)" }}>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 border-b" style={{ background: "rgba(244,244,248,0.92)", borderColor: "rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4">
          <p className="text-[20px] font-extrabold" style={{ color: "var(--text-1)" }}>Inventory</p>
          <p className="text-[13px] font-medium" style={{ color: "var(--text-3)" }}>Supply, freezing & bottling</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-6 flex flex-col gap-7">

        {/* ── PIPELINE ── */}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
            Supply Pipeline
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.pipeline.map((stage: any, i: number) => (
              <div
                key={i}
                className="rounded-2xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform"
                style={{ background: stage.bg, border: "1.5px solid rgba(0,0,0,0.04)" }}
              >
                <div style={{ color: stage.accent }}>
                  {stage.type === 'box' ? <Box size={20} /> : stage.type === 'thermometer' ? <ThermometerSnowflake size={20} /> : <span className="text-xl">{stage.emoji}</span>}
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>{stage.label}</p>
                  <p className="text-[26px] font-extrabold leading-tight" style={{ color: stage.accent }}>
                    {stage.value}
                    <span className="text-[13px] font-medium ml-1" style={{ color: "var(--text-3)" }}>{stage.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PRODUCTS ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
              Products
            </p>
            <button
              className="text-[12px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
              style={{ color: "var(--primary)", background: "var(--primary-dim)" }}
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {data.products.map((p: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-pointer"
                style={{ background: "var(--surface)", borderColor: "rgba(0,0,0,0.05)" }}
              >
                <div>
                  <p className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>{p.name}</p>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--text-3)" }}>{p.size} · {p.stock} in stock</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[16px] font-extrabold" style={{ color: "var(--text-1)" }}>{p.price}</p>
                  <ChevronRight size={18} style={{ color: "var(--text-3)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
