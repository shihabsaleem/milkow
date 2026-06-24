import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as T from "@/types/database";
import { syncBatchDeliveries } from "@/lib/automation";
import { settleAllDues } from "@/lib/financials";

type DeliveryWithCustomer = T.Delivery & { customer: T.Customer & { financials?: { current_balance: number } } };

export function useDeliveryLogic() {
   const { franchiseId, impersonatedFranchiseId, role } = useAuth();
   const activeFranchiseId = role === 'superadmin' ? (impersonatedFranchiseId || '00000000-0000-0000-0000-000000000000') : (franchiseId || '00000000-0000-0000-0000-000000000000');

   const [deliveries, setDeliveries] = useState<DeliveryWithCustomer[]>([]);
   const [serverDeliveries, setServerDeliveries] = useState<DeliveryWithCustomer[]>([]);
   const [isSyncing, setIsSyncing] = useState(false);
   const isSubmitting = useRef(false);
   const [isShiftClosed, setIsShiftClosed] = useState(false);
   const [isStagingCollapsed, setIsStagingCollapsed] = useState(false);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [routesList, setRoutesList] = useState<T.Area[]>([]);
   const [manualShift, setManualShift] = useState<'morning' | 'evening' | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      type: 'danger' | 'info' | 'success';
      showDontShowAgain?: boolean;
      onConfirm?: (dontShow?: boolean) => void;
   }>({
      isOpen: false,
      title: "",
      message: "",
      type: 'info'
   });

   const shift = useMemo<'morning' | 'evening'>(() => {
      if (manualShift) return manualShift;
      return new Date().getHours() < 14 ? 'morning' : 'evening';
   }, [manualShift]);

   const fetchData = useCallback(async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      const today = new Date().toLocaleDateString('en-CA');

      const [
         { data: routeSets },
         { data: prodData },
         { data: routeData },
         { data: settingsData },
         { data: financialsData }
      ] = await Promise.all([
         supabase.from('areas').select('*').eq('franchise_id', activeFranchiseId).order('name', { ascending: true }),
         supabase.from('products').select('*').eq('franchise_id', activeFranchiseId).order('name', { ascending: true }),
         supabase.from('deliveries')
            .select('*, customer:customers(*)')
            .eq('franchise_id', activeFranchiseId)
            .eq('delivery_date', today)
            .eq('shift', shift === 'morning' ? 'Morning Only' : 'Evening Only'),
         supabase.from('system_settings').select('value').eq('franchise_id', activeFranchiseId).eq('key', 'automation').maybeSingle(),
         supabase.from('customer_financials').select('id, current_balance').eq('franchise_id', activeFranchiseId)
      ]);

      if (settingsData) {
         const settings = (settingsData as any).value || {};
         if (shift === 'morning') {
            setIsShiftClosed(settings.lastMorningClose === today);
         } else {
            setIsShiftClosed(settings.lastEveningClose === today);
         }
      } else {
         setIsShiftClosed(false);
      }

      if (routeSets) {
         setRoutesList(routeSets as T.Area[]);
      }

      if (prodData) setProducts(prodData as T.Product[]);

      if (routeData) {
         let dbDeliveries = routeData as any[];
         if (financialsData) {
            dbDeliveries = dbDeliveries.map(d => {
               if (d.customer) {
                  const fin = financialsData.find((f: any) => f.id === d.customer.id);
                  return {
                     ...d,
                     customer: {
                        ...d.customer,
                        financials: fin ? { current_balance: Number(fin.current_balance) } : undefined
                     }
                  };
               }
               return d;
            });
         }
         setServerDeliveries(dbDeliveries);

         const cacheKey = `milkow_staged_changes_${today}_${shift === 'morning' ? 'Morning Only' : 'Evening Only'}`;
         const cached = localStorage.getItem(cacheKey);
         if (cached) {
            try {
               const stagedUpdates = JSON.parse(cached) as Record<string, Partial<T.Delivery>>;
               const merged = dbDeliveries.map(d => {
                  const update = stagedUpdates[d.id];
                  if (update) {
                     return { ...d, ...update } as DeliveryWithCustomer;
                  }
                  return d;
               });
               setDeliveries(merged);
            } catch (e) {
               console.error("Failed to parse cached staged changes:", e);
               setDeliveries(dbDeliveries);
            }
         } else {
            setDeliveries(dbDeliveries);
         }
      }
      setIsLoading(false);
   }, [activeFranchiseId, shift]);

   useEffect(() => {
      fetchData();

      const sub = supabase.channel('route_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, [shift, activeFranchiseId, fetchData]);

   const saveStagedChange = (id: string, update: Partial<T.Delivery>) => {
      const today = new Date().toLocaleDateString('en-CA');
      const currentShift = shift === 'morning' ? 'Morning Only' : 'Evening Only';
      const cacheKey = `milkow_staged_changes_${today}_${currentShift}`;

      const cached = localStorage.getItem(cacheKey);
      let stagedUpdates: Record<string, Partial<T.Delivery>> = {};
      if (cached) {
         try {
            stagedUpdates = JSON.parse(cached);
         } catch (e) {
            console.error("Failed to parse cached staged changes:", e);
         }
      }

      stagedUpdates[id] = {
         ...(stagedUpdates[id] || {}),
         ...update
      };

      const initial = serverDeliveries.find(sd => sd.id === id);
      if (initial) {
         const currentMerged = { ...initial, ...stagedUpdates[id] };
         const isSameAsServer =
            currentMerged.delivered === initial.delivered &&
            currentMerged.milk_qty === initial.milk_qty &&
            JSON.stringify(currentMerged.misc_items) === JSON.stringify(initial.misc_items);

         if (isSameAsServer) {
            delete stagedUpdates[id];
         }
      }

      if (Object.keys(stagedUpdates).length === 0) {
         localStorage.removeItem(cacheKey);
      } else {
         localStorage.setItem(cacheKey, JSON.stringify(stagedUpdates));
      }
   };

   const changedDeliveries = useMemo(() => {
      return deliveries.filter(d => {
         const initial = serverDeliveries.find(sd => sd.id === d.id);
         if (!initial) return false;
         return initial.delivered !== d.delivered ||
            initial.milk_qty !== d.milk_qty ||
            JSON.stringify(initial.misc_items) !== JSON.stringify(d.misc_items);
      });
   }, [deliveries, serverDeliveries]);

   const hasUnsavedChanges = changedDeliveries.length > 0;

   const getAvailableStockById = (prodId: string) => {
      const prod = products.find(p => p.id === prodId);
      if (!prod) return 0;
      if (prod.stock == null) return Infinity;
      let available = prod.stock;

      changedDeliveries.forEach(cd => {
         const initial = serverDeliveries.find(sd => sd.id === cd.id);
         if (!initial) return;

         const initialMilkConsumed = (initial.delivered && initial.product_id === prodId) ? initial.milk_qty : 0;
         const currentMilkConsumed = (cd.delivered && cd.product_id === prodId) ? cd.milk_qty : 0;
         available -= (currentMilkConsumed - initialMilkConsumed);

         const initialMiscQty = initial.delivered
            ? (initial.misc_items || []).find((i: any) => i.name === prod.name)?.qty || 0
            : 0;
         const currentMiscQty = cd.delivered
            ? (cd.misc_items || []).find((i: any) => i.name === prod.name)?.qty || 0
            : 0;
         available -= (currentMiscQty - initialMiscQty);
      });

      return available;
   };

   const toggleDelivery = async (id: string) => {
      if (isShiftClosed) {
         const skip = localStorage.getItem('skip_shift_closed_modal') === 'true';
         if (!skip) {
            setModalConfig({
               isOpen: true,
               title: "Shift Closed",
               message: `The ${shift} shift is closed for today.`,
               type: 'info',
               showDontShowAgain: true,
               onConfirm: (dontShow) => {
                  if (dontShow) localStorage.setItem('skip_shift_closed_modal', 'true');
                  setModalConfig(prev => ({ ...prev, isOpen: false }));
               }
            });
         }
         return;
      }
      const stop = deliveries.find(d => d.id === id);
      if (!stop) return;

      const nowDelivered = !stop.delivered;

      if (nowDelivered) {
         const zeroStockItems: string[] = [];
         const tempAvailable = new Map<string, number>();

         const getTempAvail = (prodId: string) => {
            if (!tempAvailable.has(prodId)) {
               tempAvailable.set(prodId, getAvailableStockById(prodId));
            }
            return tempAvailable.get(prodId)!;
         };

         if (stop.milk_qty > 0 && stop.product_id) {
            const avail = getTempAvail(stop.product_id);
            if (avail < stop.milk_qty) {
               const prod = products.find(p => p.id === stop.product_id);
               zeroStockItems.push(prod ? prod.name : 'Unknown Product');
            } else {
               tempAvailable.set(stop.product_id, avail - stop.milk_qty);
            }
         }

         const miscProducts = stop.misc_items || [];
         miscProducts.forEach((item: any) => {
            if (item.qty > 0) {
               const prod = products.find(p => p.name === item.name);
               if (prod) {
                  const avail = getTempAvail(prod.id);
                  if (avail < item.qty) {
                     zeroStockItems.push(prod.name);
                  } else {
                     tempAvailable.set(prod.id, avail - item.qty);
                  }
               }
            }
         });

         if (zeroStockItems.length > 0) {
            setModalConfig({
               isOpen: true,
               title: "Out of Stock",
               message: `Cannot mark delivery. Insufficient stock for: ${zeroStockItems.join(", ")}.`,
               type: 'danger'
            });
            return;
         }
      }

      setDeliveries(prev => prev.map(d => d.id === id ? { ...d, delivered: nowDelivered } : d));
      saveStagedChange(id, { delivered: nowDelivered });
   };

   const updateProductQty = async (stopId: string, productName: string, delta: number) => {
      if (isShiftClosed) {
         setModalConfig({ isOpen: true, title: "Shift Closed", message: `The ${shift} shift is closed for today.`, type: 'info' });
         return;
      }
      const stop = deliveries.find(d => d.id === stopId);
      if (!stop) return;

      const currentExtras = stop.misc_items || [];
      const itemIndex = currentExtras.findIndex((item: any) => item.name === productName);
      const updatedExtras = [...currentExtras];

      if (stop.delivered && delta > 0) {
         const prod = products.find(p => p.name === productName);
         if (prod) {
            const available = getAvailableStockById(prod.id);
            if (available < delta) {
               setModalConfig({
                  isOpen: true,
                  title: "Out of Stock",
                  message: `Cannot add ${productName}. Insufficient stock.`,
                  type: 'danger'
               });
               return;
            }
         }
      }

      if (itemIndex > -1) {
         const newQty = Math.max(0, updatedExtras[itemIndex].qty + delta);
         if (newQty === 0) {
            updatedExtras.splice(itemIndex, 1);
         } else {
            updatedExtras[itemIndex] = { ...updatedExtras[itemIndex], qty: newQty };
         }
      } else if (delta > 0) {
         updatedExtras.push({ name: productName, qty: delta });
      }

      setDeliveries(prev => prev.map(d => d.id === stopId ? { ...d, misc_items: updatedExtras } : d));
      saveStagedChange(stopId, { misc_items: updatedExtras });
   };

   const updateMilkQty = async (stopId: string, delta: number) => {
      if (isShiftClosed) {
         const skip = localStorage.getItem('skip_shift_closed_modal') === 'true';
         if (!skip) {
            setModalConfig({
               isOpen: true,
               title: "Shift Closed",
               message: `The ${shift} shift is closed for today.`,
               type: 'info',
               showDontShowAgain: true,
               onConfirm: (dontShow) => {
                  if (dontShow) localStorage.setItem('skip_shift_closed_modal', 'true');
                  setModalConfig(prev => ({ ...prev, isOpen: false }));
               }
            });
         }
         return;
      }
      const stop = deliveries.find(d => d.id === stopId);
      if (!stop) return;
      const newQty = Math.max(0, (stop.milk_qty || 0) + delta);

      if (stop.delivered && delta > 0 && stop.product_id) {
         const available = getAvailableStockById(stop.product_id);
         if (available < delta) {
            setModalConfig({
               isOpen: true,
               title: "Out of Stock",
               message: `Cannot increase quantity. Insufficient stock for ${products.find(p => p.id === stop.product_id)?.name}.`,
               type: 'danger'
            });
            return;
         }
      }

      setDeliveries(prev => prev.map(d => d.id === stopId ? { ...d, milk_qty: newQty } : d));
      saveStagedChange(stopId, { milk_qty: newQty });
   };

   const handleSync = async () => {
      if (changedDeliveries.length === 0 || isSubmitting.current) return;
      
      const numChanges = changedDeliveries.length;
      isSubmitting.current = true;
      
      const today = new Date().toLocaleDateString('en-CA');
      const currentShift = shift === 'morning' ? 'Morning Only' : 'Evening Only';
      const cacheKey = `milkow_staged_changes_${today}_${currentShift}`;
      
      // Optimistic UI updates
      setServerDeliveries([...deliveries]); // Update server deliveries locally to match current view
      localStorage.removeItem(cacheKey);
      setIsStagingCollapsed(false);

      setModalConfig({
         isOpen: true,
         title: "Sync Successful",
         message: `Successfully synchronized ${numChanges} delivery changes.`,
         type: 'success'
      });

      try {
         const runAsync = async () => {
            await syncBatchDeliveries(changedDeliveries, serverDeliveries);
            fetchData(true);
         };

         runAsync().catch(err => {
            console.error("Sync error:", err);
            fetchData(true); // Revert on failure
         }).finally(() => {
            isSubmitting.current = false;
         });
      } catch (err) {
         console.error("Trigger failed:", err);
         fetchData(true);
         isSubmitting.current = false;
      }
   };

   const runMarkAsPaid = async (customerId: string) => {
      // Optimistic update
      setDeliveries(prev => prev.map(d => {
         if (d.customer_id === customerId && d.customer?.financials) {
            return { ...d, customer: { ...d.customer, financials: { current_balance: 0 } } };
         }
         return d;
      }));
      setServerDeliveries(prev => prev.map(d => {
         if (d.customer_id === customerId && d.customer?.financials) {
            return { ...d, customer: { ...d.customer, financials: { current_balance: 0 } } };
         }
         return d;
      }));

      setModalConfig({
         isOpen: true,
         title: "Payment Recorded",
         message: "Payment has been recorded and all dues settled successfully!",
         type: 'success'
      });

      try {
         const runAsync = async () => {
            await settleAllDues(customerId, 'Cash', 'Full Settlement on Route');
            fetchData(true);
         };

         runAsync().catch(err => {
            console.error("Payment failed:", err);
            fetchData(true);
         });
      } catch (err) {
         console.error("Trigger failed:", err);
         fetchData(true);
      }
   };

   return {
      deliveries,
      products,
      routesList,
      shift,
      manualShift,
      setManualShift,
      isLoading,
      isSyncing,
      isShiftClosed,
      isStagingCollapsed,
      setIsStagingCollapsed,
      modalConfig,
      setModalConfig,
      changedDeliveries,
      hasUnsavedChanges,
      toggleDelivery,
      updateProductQty,
      updateMilkQty,
      handleSync,
      runMarkAsPaid,
      fetchData,
   };
}
