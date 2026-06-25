"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Check, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import CustomSelect from "@/components/ui/CustomSelect";
import * as T from "@/types/database";

type CustomerWithArea = T.Customer & { area?: T.Area };

// ─── Sortable Row ─────────────────────────────────────────────────
function SortableItem({
  customer,
  index,
}: {
  customer: CustomerWithArea;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, active } =
    useSortable({ id: customer.id });

  const isActive = active?.id === customer.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isActive ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-zinc-100 rounded-2xl px-4 py-3.5 shadow-sm"
    >
      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-zinc-900 text-sm truncate">{customer.name}</p>
        <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
          <MapPin size={10} />
          {customer.area?.name || "No Area"} &middot; {customer.frequency}
        </p>
      </div>
      <button
        {...attributes}
        {...listeners}
        className="p-2 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={20} />
      </button>
    </div>
  );
}

function DragCard({ customer }: { customer: CustomerWithArea }) {
  return (
    <div className="flex items-center gap-3 bg-white border-2 border-primary rounded-2xl px-4 py-3.5 shadow-2xl rotate-1">
      <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-black shrink-0">
        #
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-zinc-900 text-sm truncate">{customer.name}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{customer.area?.name}</p>
      </div>
      <GripVertical size={20} className="text-primary" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function RouteOrderPage() {
  const [areas, setAreas] = useState<T.Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [customers, setCustomers] = useState<CustomerWithArea[]>([]);
  const [orderedList, setOrderedList] = useState<CustomerWithArea[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { franchiseId, impersonatedFranchiseId, role } = useAuth();
  const activeFranchiseId = role === 'superadmin' ? ((impersonatedFranchiseId || franchiseId || '00000000-0000-0000-0000-000000000000')) : (franchiseId || '00000000-0000-0000-0000-000000000000');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [{ data: areaData }, { data: custData }] = await Promise.all([
        supabase.from("areas").select("*").eq("franchise_id", activeFranchiseId).order("name"),
        supabase.from("customers").select("*, area:areas(*)").eq("franchise_id", activeFranchiseId).eq("status", "Active"),
      ]);
      if (areaData) {
        setAreas(areaData as T.Area[]);
        if (areaData.length > 0) setSelectedAreaId(areaData[0].id.toString());
      }
      if (custData) setCustomers(custData as CustomerWithArea[]);
      setIsLoading(false);
    }
    fetchData();
  }, [activeFranchiseId]);

  useEffect(() => {
    const filtered = customers
      .filter((c) => c.area_id?.toString() === selectedAreaId)
      .sort((a, b) => (Number(a.delivery_order) || 0) - (Number(b.delivery_order) || 0));
    setOrderedList(filtered);
    setIsDirty(false);
  }, [selectedAreaId, customers]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrderedList((prev) => {
      const oldIdx = prev.findIndex((c) => c.id === active.id);
      const newIdx = prev.findIndex((c) => c.id === over.id);
      setIsDirty(true);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all(
        orderedList.map((c, i) =>
          supabase.from("customers").update({ delivery_order: (i + 1) * 1000 }).eq("id", c.id)
        )
      );
      setSavedOk(true);
      setIsDirty(false);
      setTimeout(() => setSavedOk(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const activeCustomer = activeId ? orderedList.find((c) => c.id === activeId) : null;

  return (
    <div className="min-h-full w-full pb-32 bg-zinc-50/50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-2xl mx-auto px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/customers" className="p-2 bg-zinc-100 rounded-xl text-zinc-500 hover:bg-zinc-200 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <p className="text-[20px] font-black text-zinc-900 leading-none">Route Order</p>
                <p className="text-[12px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                  Drag to reorder delivery stops
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {savedOk ? (
                <motion.div
                  key="saved"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="h-10 px-4 bg-emerald-500 text-white rounded-xl flex items-center gap-2 text-sm font-bold"
                >
                  <Check size={16} strokeWidth={3} /> Saved
                </motion.div>
              ) : (
                <motion.button
                  key="save-btn"
                  animate={{ opacity: isDirty ? 1 : 0.35 }}
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="h-10 px-5 bg-primary text-white rounded-xl font-bold text-sm disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  {isSaving ? "Saving…" : "Save Order"}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <CustomSelect
            fullWidth
            options={areas.map((a) => ({ value: a.id.toString(), label: a.name }))}
            value={selectedAreaId}
            onChange={(val) => { setSelectedAreaId(val); }}
            placeholder="Select Route"
          />
        </div>
      </div>

      {/* List */}
      <main className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-2">
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white border border-black/5 rounded-2xl animate-pulse" />
          ))
        ) : orderedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <MapPin size={48} className="mb-4" />
            <p className="font-bold text-zinc-500">No active customers on this route</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedList.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {orderedList.map((customer, index) => (
                <SortableItem key={customer.id} customer={customer} index={index} />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeCustomer && <DragCard customer={activeCustomer} />}
            </DragOverlay>
          </DndContext>
        )}

        {isDirty && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-xs text-zinc-400 mt-3"
          >
            Unsaved changes — tap "Save Order" to apply
          </motion.p>
        )}
      </main>
    </div>
  );
}
