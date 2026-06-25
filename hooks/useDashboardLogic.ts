import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
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
  const [adminName, setAdminName] = useState("Franchisee .");
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

  const { franchiseId, impersonatedFranchiseId, role } = useAuth();
  const activeFranchiseId = role === 'superadmin' ? ((impersonatedFranchiseId || franchiseId || '00000000-0000-0000-0000-000000000000')) : (franchiseId || '00000000-0000-0000-0000-000000000000');

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const dbShift = shift === 'morning' ? 'Morning Only' : 'Evening Only';

    const [year, month, day] = date.split('-').map(Number);
    const startIso = new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
    const endIso = new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();

    const [
      { data: invData },
      { data: allDelData },
      { data: prodsData },
      { data: financialsData },
      { count: custCount },
      { data: setsData },
      { data: paymentsData }
    ] = await Promise.all([
      supabase.from('inventory').select('*').eq('franchise_id', activeFranchiseId).not('product_id', 'is', null),
      supabase.from('deliveries').select('*').eq('franchise_id', activeFranchiseId).eq('delivered', true).eq('delivery_date', date),
      supabase.from('products').select('*').eq('franchise_id', activeFranchiseId),
      supabase.from('customer_financials').select('*').eq('franchise_id', activeFranchiseId),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('franchise_id', activeFranchiseId),
      supabase.from('system_settings').select('value').eq('franchise_id', activeFranchiseId).eq('key', 'general').maybeSingle(),
      supabase.from('payments').select('amount').eq('franchise_id', activeFranchiseId).gte('payment_date', startIso).lte('payment_date', endIso)
    ]);

    if (invData) setInventory(invData as T.InventoryItem[]);
    if (custCount !== null) setCustomerCount(custCount);

    if (setsData) {
      const val = setsData.value as T.Settings | null;
      if (val) setAdminName(val.system_user?.name || "Franchisee.");
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

    let deliveredArr: DeliveredItem[] = [];
    if (delData && prodsData) {
      const productsMap = new Map<string, T.Product>(prodsData.map((p: any) => [p.id, p as T.Product]));
      const productTotals = new Map<string, number>();

      delData.forEach((d: any) => {
        if (d.product_id) {
          const current = productTotals.get(d.product_id) || 0;
          productTotals.set(d.product_id, current + (Number(d.milk_qty) || 0));
        }
        if (d.misc_items && Array.isArray(d.misc_items)) {
          d.misc_items.forEach((item: any) => {
            if (item.name && item.qty) {
              const p = prodsData.find((prod: any) => prod.name === item.name);
              if (p) {
                const current = productTotals.get(p.id) || 0;
                productTotals.set(p.id, current + (Number(item.qty) || 0));
              }
            }
          });
        }
      });

      deliveredArr = Array.from(productTotals.entries()).map(([pid, qty]) => {
        const prod = productsMap.get(pid);
        return {
          name: prod?.name || 'Unknown',
          count: qty,
          unit: prod?.unit || 'Units',
          vol: prod?.size || ''
        };
      }).sort((a, b) => b.count - a.count);
      setDelivered(deliveredArr);
    }

    // Cache the data to prevent flicker on page navigation
    const cacheKey = `milkow_dashboard_${activeFranchiseId}_${date}_${dbShift}`;
    const cacheData = {
       invData,
       custCount,
       adminName: setsData?.value?.system_user?.name || "Franchise.",
       paySum: paymentsData ? paymentsData.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) : 0,
       salesSum: allDelData ? allDelData.reduce((sum: number, d: any) => sum + (Number(d.total_cost) || 0), 0) : 0,
       debt: financialsData ? (financialsData as T.CustomerFinancials[]).reduce((sum, f) => sum + (f.current_balance > 0 ? f.current_balance : 0), 0) : 0,
       credit: financialsData ? (financialsData as T.CustomerFinancials[]).reduce((sum, f) => sum + (f.current_balance < 0 ? Math.abs(f.current_balance) : 0), 0) : 0,
       deliveredArr
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    if (!silent) setIsLoading(false);
  }, [date, shift, activeFranchiseId]);

  useEffect(() => {
    // Attempt to load from cache first for instant render
    const cacheKey = `milkow_dashboard_${activeFranchiseId}_${date}_${shift === 'morning' ? 'Morning Only' : 'Evening Only'}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.invData) setInventory(parsed.invData);
        if (parsed.custCount !== undefined) setCustomerCount(parsed.custCount);
        if (parsed.adminName) setAdminName(parsed.adminName);
        if (parsed.paySum !== undefined) setDailyPayments(parsed.paySum);
        if (parsed.salesSum !== undefined) setDailySales(parsed.salesSum);
        if (parsed.debt !== undefined) setToCollectAmount(parsed.debt);
        if (parsed.credit !== undefined) setAdvanceAmount(parsed.credit);
        if (parsed.deliveredArr) setDelivered(parsed.deliveredArr);
        setIsLoading(false); // Disable skeleton immediately since we have cached data
      } catch (e) {}
    }

    fetchDashboardData(!!cached);

    const invSub = supabase.channel('inv').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `franchise_id=eq.${activeFranchiseId}` }, fetchDashboardData).subscribe();
    const routeSub = supabase.channel('route').on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `franchise_id=eq.${activeFranchiseId}` }, fetchDashboardData).subscribe();
    const billsSub = supabase.channel('bills').on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `franchise_id=eq.${activeFranchiseId}` }, fetchDashboardData).subscribe();
    const custSub = supabase.channel('cust').on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `franchise_id=eq.${activeFranchiseId}` }, fetchDashboardData).subscribe();
    const setSub = supabase.channel('sets').on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: `franchise_id=eq.${activeFranchiseId}` }, fetchDashboardData).subscribe();
    const paySub = supabase.channel('payments').on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `franchise_id=eq.${activeFranchiseId}` }, fetchDashboardData).subscribe();

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
