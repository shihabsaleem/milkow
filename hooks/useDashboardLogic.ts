import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";

export interface DeliveredItem {
  name: string;
  count: number;
  unit: string;
  vol: string;
}

export function useDashboardLogic() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [manualOverride, setManualOverride] = useState(false);
  const [internalShift, setInternalShift] = useState<"morning" | "evening" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inventory, setInventory] = useState<T.InventoryItem[]>([]);
  const [delivered, setDelivered] = useState<DeliveredItem[]>([]);
  const [adminName, setAdminName] = useState("Sayas R.");
  const [toCollectAmount, setToCollectAmount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [dailySales, setDailySales] = useState(0);
  const [dailyPayments, setDailyPayments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const dayName = useMemo(() => {
    return new Date(date).toLocaleDateString("en-US", { weekday: "long" });
  }, [date]);

  const shift = useMemo(() => {
    if (manualOverride && internalShift) return internalShift;
    const hour = new Date().getHours();
    return hour < 14 ? "morning" : "evening";
  }, [manualOverride, internalShift]);

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const dbShift = shift === 'morning' ? 'Morning Only' : 'Evening Only';

    const [
      { data: invData },
      { data: allDelData },
      { data: prodsData },
      { data: financialsData },
      { count: custCount },
      { data: setsData },
      { data: paymentsData }
    ] = await Promise.all([
      supabase.from('inventory').select('*').not('product_id', 'is', null),
      supabase.from('deliveries').select('*').eq('delivered', true).eq('delivery_date', date),
      supabase.from('products').select('*'),
      supabase.from('customer_financials').select('*'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('system_settings').select('value').eq('key', 'general').single(),
      supabase.from('payments').select('amount').like('payment_date', `${date}%`)
    ]);

    if (invData) setInventory(invData as T.InventoryItem[]);
    if (custCount !== null) setCustomerCount(custCount);

    if (setsData) {
      const val = setsData.value as T.Settings | null;
      if (val) setAdminName(val.system_user?.name || "Sayas R.");
    }

    if (paymentsData) {
      const paySum = paymentsData.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      setDailyPayments(paySum);
    }

    if (allDelData) {
      const salesSum = allDelData.reduce((sum: number, d: any) => sum + (Number(d.total_cost) || 0), 0);
      setDailySales(salesSum);
    }

    if (financialsData) {
      const financials = financialsData as T.CustomerFinancials[];
      const debt = financials.reduce((sum, f) => sum + (f.current_balance > 0 ? f.current_balance : 0), 0);
      const credit = financials.reduce((sum, f) => sum + (f.current_balance < 0 ? Math.abs(f.current_balance) : 0), 0);
      setToCollectAmount(debt);
      setAdvanceAmount(credit);
    }

    const delData = (allDelData || []).filter((d: any) => d.shift === dbShift);

    if (delData && prodsData) {
      const productsMap = new Map<string, T.Product>(prodsData.map((p: any) => [p.id, p as T.Product]));
      const summary: Record<string, { count: number; unit: string; vol: string }> = {};

      delData.forEach((d: any) => {
        const qty = Number(d.milk_qty) || 0;
        if (qty > 0) {
          const prod = productsMap.get(d.product_id);
          const name = prod?.name || 'Cow Milk';
          const unit = prod?.unit || 'Bottles';
          const vol = prod?.size || 'Daily';
          if (!summary[name]) summary[name] = { count: 0, unit, vol };
          summary[name].count += qty;
        }

        const extras = d.misc_items || [];
        extras.forEach((item: any) => {
          if (!summary[item.name]) summary[item.name] = { count: 0, unit: 'Items', vol: 'Extra' };
          summary[item.name].count += (item.qty || 0);
        });
      });

      setDelivered(Object.entries(summary).map(([name, val]) => ({
        name, vol: val.vol, count: val.count, unit: val.unit
      })));
    }
    if (!silent) setIsLoading(false);
  }, [shift, date]);

  useEffect(() => {
    fetchDashboardData();

    const invSub = supabase.channel('inv').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, fetchDashboardData).subscribe();
    const routeSub = supabase.channel('route').on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchDashboardData).subscribe();
    const billsSub = supabase.channel('bills').on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchDashboardData).subscribe();
    const custSub = supabase.channel('cust').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchDashboardData).subscribe();
    const setSub = supabase.channel('sets').on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, fetchDashboardData).subscribe();
    const paySub = supabase.channel('payments').on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchDashboardData).subscribe();

    return () => {
      invSub.unsubscribe();
      routeSub.unsubscribe();
      billsSub.unsubscribe();
      custSub.unsubscribe();
      setSub.unsubscribe();
      paySub.unsubscribe();
    };
  }, [fetchDashboardData]);

  const handleShiftToggle = (newShift: "morning" | "evening") => {
    setManualOverride(true);
    setInternalShift(newShift);
  };

  return {
    date,
    setDate,
    menuOpen,
    setMenuOpen,
    inventory,
    delivered,
    adminName,
    toCollectAmount,
    advanceAmount,
    customerCount,
    dailySales,
    dailyPayments,
    isLoading,
    inputRef,
    dayName,
    shift,
    fetchDashboardData,
    handleShiftToggle
  };
}
