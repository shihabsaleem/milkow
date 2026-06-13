"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, Sunrise, Sunset, CloudUpload, ChevronRight, Check, PackagePlus, PackageSearch, Search, Minus, Plus, Wallet2, MoreVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { deductInventoryOnDelivery, restoreInventoryOnUndelivery, syncBatchDeliveries } from "@/lib/automation";
import PullToRefresh from "@/components/ui/PullToRefresh";
import Modal from "@/components/ui/Modal";
import * as T from "@/types/database";
import { recordPayment, fetchCustomerBalance } from "@/lib/financials";

type DeliveryWithCustomer = T.Delivery & { customer: T.Customer };

export default function DeliveryPage() {
   const router = useRouter();
   const { user, loading } = useAuth();

   useEffect(() => {
      if (!loading && !user) {
         router.push("/404");
      }
   }, [user, loading, router]);

   const [deliveries, setDeliveries] = useState<DeliveryWithCustomer[]>([]);
   const [serverDeliveries, setServerDeliveries] = useState<DeliveryWithCustomer[]>([]);
   const [isSyncing, setIsSyncing] = useState(false);
   const [isShiftClosed, setIsShiftClosed] = useState(false);
   const [isStagingCollapsed, setIsStagingCollapsed] = useState(false);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [routesList, setRoutesList] = useState<T.Area[]>([]);

   const [searchQuery, setSearchQuery] = useState("");
   const [selectedRoute, setSelectedRoute] = useState<number | "">(() => {
      if (typeof window !== "undefined") {
         const saved = localStorage.getItem('milkow_selected_route');
         if (saved !== null) return saved === "" ? "" : parseInt(saved);
      }
      return "";
   });
   const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
   const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
   const [editingSeqId, setEditingSeqId] = useState<string | null>(null);
   const [editSeqVal, setEditSeqVal] = useState("");
   const [manualShift, setManualShift] = useState<'morning' | 'evening' | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isDevMenuOpen, setIsDevMenuOpen] = useState(false);

   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
   const [paymentAmount, setPaymentAmount] = useState("");
   const [paymentMethod, setPaymentMethod] = useState("Cash");
   const [paymentNotes, setPaymentNotes] = useState("");
   const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<string | null>(null);
   const [paymentTotalDue, setPaymentTotalDue] = useState<number | null>(null);
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

   // Auto-detect shift from time of day
   const shift = useMemo<'morning' | 'evening'>(() => {
      if (manualShift) return manualShift;
      return new Date().getHours() < 14 ? 'morning' : 'evening';
   }, [manualShift]);

   const fetchData = async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      const today = new Date().toLocaleDateString('en-CA'); // Robust YYYY-MM-DD

      const [
         { data: routeSets },
         { data: prodData },
         { data: routeData },
         { data: settingsData }
      ] = await Promise.all([
         supabase.from('areas').select('*').order('name', { ascending: true }),
         supabase.from('products').select('*').order('name', { ascending: true }),
         supabase.from('deliveries')
            .select('*, customer:customers(*)')
            .eq('delivery_date', today)
            .eq('shift', shift === 'morning' ? 'Morning Only' : 'Evening Only'),
         supabase.from('system_settings').select('value').eq('key', 'automation').maybeSingle()
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
         const areas = routeSets as T.Area[];
         setRoutesList(areas);
      }

      if (prodData) setProducts(prodData as T.Product[]);

      if (routeData) {
         const dbDeliveries = routeData as (T.Delivery & { customer: T.Customer })[];
         setServerDeliveries(dbDeliveries);

         // Apply staged changes from localStorage if they exist
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
   };

   /*
   const runRecordPayment = async (amountVal: number, methodVal: string, notesVal: string) => {
      if (!selectedCustomerForPayment) return;
      try {
         setIsLoading(true);
         await recordPayment(selectedCustomerForPayment, amountVal, methodVal, notesVal || 'Custom Payment from Delivery');

         await fetchData();
         setIsPaymentModalOpen(false);
         setSelectedCustomerForPayment(null);

         setModalConfig({
            isOpen: true,
            title: "Payment Recorded",
            message: `Successfully recorded payment of ₹${amountVal.toFixed(2)} using ${methodVal}.`,
            type: 'success'
         });
      } catch (err) {
         console.error("Failed to record payment:", err);
         setModalConfig({
            isOpen: true,
            title: "Payment Failed",
            message: "Failed to record payment. Please check your connection and try again.",
            type: 'danger'
         });
      } finally {
         setIsLoading(false);
      }
   };
   */

   // 1. DATA LOAD & SYNC
   useEffect(() => {
      fetchData();

      const sub = supabase.channel('route_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData(true))
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, [shift]); // eslint-disable-line react-hooks/exhaustive-deps

   // Persist selectedRoute
   useEffect(() => {
      localStorage.setItem('milkow_selected_route', selectedRoute.toString());
   }, [selectedRoute]);

   // Helper to save local staged changes
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

      // Clean up if it matches initial server values
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

      // Update state locally and save to staging cache
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

      // Update state locally and save to staging cache
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

      // Update state locally and save to staging cache
      setDeliveries(prev => prev.map(d => d.id === stopId ? { ...d, milk_qty: newQty } : d));
      saveStagedChange(stopId, { milk_qty: newQty });
   };

   // Memoize changed deliveries
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

   const handleSync = async () => {
      if (changedDeliveries.length === 0) return;
      setIsSyncing(true);
      try {
         await syncBatchDeliveries(changedDeliveries, serverDeliveries);

         const today = new Date().toLocaleDateString('en-CA');
         const currentShift = shift === 'morning' ? 'Morning Only' : 'Evening Only';
         const cacheKey = `milkow_staged_changes_${today}_${currentShift}`;
         localStorage.removeItem(cacheKey);
         setIsStagingCollapsed(false);

         setModalConfig({
            isOpen: true,
            title: "Sync Successful",
            message: `Successfully synchronized ${changedDeliveries.length} delivery changes.`,
            type: 'success'
         });

         await fetchData(true);
      } catch (e: any) {
         console.error("Failed to sync deliveries:", e);
         setModalConfig({
            isOpen: true,
            title: "Sync Failed",
            message: `Error syncing data: ${e?.message || String(e)}`,
            type: 'danger'
         });
      } finally {
         setIsSyncing(false);
      }
   };

   const filteredDeliveries = deliveries.filter(d => {
      const user = d.customer;
      if (!user || user.status === 'Inactive') return false;

      // Filter by selected route (area)
      if (selectedRoute !== "" && user.area_id !== selectedRoute) return false;

      // Filter by shift: show if frequency includes current shift
      const freq = user.frequency;
      if (shift === 'morning' && freq === 'Evening Only') return false;
      if (shift === 'evening' && freq === 'Morning Only') return false;
      // Also filter by delivery shift column
      const dbShift = shift === 'morning' ? 'Morning Only' : 'Evening Only';
      if (d.shift !== dbShift) return false;

      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
   }).sort((a, b) => (Number(a.customer?.delivery_order) || 0) - (Number(b.customer?.delivery_order) || 0));

   const remainingStops = filteredDeliveries.filter(d => !d.delivered).length;

   return (
      <PullToRefresh onRefresh={() => fetchData(true)} className="bg-slate-50 pb-32">
         <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
            <div className="max-w-2xl mx-auto w-full px-5 py-4 flex flex-col gap-3">
               <div className="flex items-center justify-between">
                  <div className="relative">
                     <button onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)} className="flex items-center gap-2 group">
                        <h1 className="text-xl font-black text-zinc-900">{routesList.find(r => r.id === selectedRoute)?.name || 'All Deliveries'}</h1>
                        <ChevronDown size={18} className={`text-zinc-400 transition-transform duration-300 ${isRouteMenuOpen ? 'rotate-180' : ''}`} />
                     </button>
                     <p className="text-xs font-bold text-primary tracking-wider uppercase mt-0.5">{remainingStops} Stops Remaining</p>

                     <AnimatePresence>
                        {isRouteMenuOpen && (
                           <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsRouteMenuOpen(false)} />
                              <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute left-0 mt-3 w-64 bg-white/90 backdrop-blur-xl border border-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden z-50"
                              >
                                 <div className="px-4 py-2 border-b border-zinc-100/50 bg-zinc-50/50">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Route</span>
                                 </div>
                                 <div className="py-1 max-h-80 overflow-y-auto no-scrollbar">
                                    <button
                                       onClick={() => { setSelectedRoute(""); setIsRouteMenuOpen(false); }}
                                       className={`w-full text-left px-4 py-3.5 text-sm font-bold flex items-center justify-between transition-all ${selectedRoute === "" ? 'bg-primary/5 text-primary' : 'text-zinc-600 hover:bg-zinc-50'}`}
                                    >
                                       <span>All Deliveries</span>
                                       {selectedRoute === "" && <Check size={16} strokeWidth={3} />}
                                    </button>
                                    {routesList.map((route) => (
                                       <button
                                          key={route.id}
                                          onClick={() => { setSelectedRoute(route.id); setIsRouteMenuOpen(false); }}
                                          className={`w-full text-left px-4 py-3.5 text-sm font-bold flex items-center justify-between transition-all ${selectedRoute === route.id ? 'bg-primary/5 text-primary' : 'text-zinc-600 hover:bg-zinc-50'}`}
                                       >
                                          <span>{route.name}</span>
                                          {selectedRoute === route.id && <Check size={16} strokeWidth={3} />}
                                       </button>
                                    ))}
                                 </div>
                              </motion.div>
                           </>
                        )}
                     </AnimatePresence>
                  </div>
               </div>

               <div className="flex items-center gap-2">
                  {/* Morning / Evening Toggle */}
                  <div className="flex-1 grid grid-cols-2 p-1 rounded-2xl bg-[#EBEBEF] relative h-11">
                     <motion.div layout className="absolute inset-y-1 rounded-xl shadow-sm z-0 bg-white" style={{ left: shift === 'morning' ? '4px' : '50%', width: 'calc(50% - 4px)' }} transition={{ type: 'spring', stiffness: 450, damping: 35 }} />
                     <button onClick={() => setManualShift('morning')} className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl transition-all text-sm font-bold ${shift === 'morning' ? 'text-primary' : 'text-[#A1A1AA]'}`}>
                        <Sunrise size={15} strokeWidth={2.5} /><span>Morning</span>
                     </button>
                     <button onClick={() => setManualShift('evening')} className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl transition-all text-sm font-bold ${shift === 'evening' ? 'text-primary' : 'text-[#A1A1AA]'}`}>
                        <Sunset size={15} strokeWidth={2.5} /><span>Evening</span>
                     </button>
                  </div>

                  {/* Dev Options Menu */}
                  <div className="relative">
                     <button
                        onClick={() => setIsDevMenuOpen(!isDevMenuOpen)}
                        className="h-11 w-11 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition-colors"
                     >
                        <MoreVertical size={20} />
                     </button>
                     <AnimatePresence>
                        {isDevMenuOpen && (
                           <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsDevMenuOpen(false)} />
                              <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute right-0 mt-3 w-48 bg-white border border-zinc-200 shadow-xl rounded-2xl overflow-hidden z-50 p-2"
                              >
                                 <button
                                    onClick={() => router.push('/billing')}
                                    className="w-full text-left px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 rounded-xl transition-colors"
                                 >
                                    Billing
                                 </button>
                                 <div className="h-px bg-zinc-100 my-1 mx-2" />
                                 <button
                                    onClick={async () => {
                                       setIsDevMenuOpen(false);
                                       const { data } = await supabase.from('system_settings').select('value').eq('key', 'automation').single();
                                       if (data) {
                                          const val = data.value as any;
                                          delete val.lastMorningClose;
                                          delete val.lastEveningClose;
                                          const { error } = await supabase.from('system_settings').update({ value: val }).eq('key', 'automation');
                                          if (error) {
                                             alert('Reset failed: ' + error.message);
                                          } else {
                                             alert('Shift reset successfully!');
                                             window.location.reload();
                                          }
                                       }
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                 >
                                    Reset Shift
                                 </button>
                              </motion.div>
                           </>
                        )}
                     </AnimatePresence>
                  </div>
               </div>
            </div>
         </header>

         <main className="max-w-2xl mx-auto w-full px-5 py-6 flex flex-col gap-4">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
               <input type="text" placeholder="Search customers..." className="w-full bg-white border border-zinc-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {isLoading ? (
               [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                     <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-zinc-200 rounded-full shrink-0" />
                        <div className="flex-1">
                           <div className="h-4 bg-zinc-200 rounded w-1/2 mb-2" />
                           <div className="h-3 bg-zinc-100 rounded w-1/3" />
                        </div>
                        <div className="h-12 w-12 bg-zinc-200 rounded-full" />
                     </div>
                  </div>
               ))
            ) : filteredDeliveries.length > 0 ? (
               filteredDeliveries.map((delivery, index) => {
                  const isExpanded = expandedStopId === delivery.id;
                  const activeItems = delivery.misc_items || [];
                  return (
                     <motion.div key={delivery.id} layout className={`border rounded-2xl transition-all ${delivery.delivered ? 'bg-zinc-50 border-zinc-200 opacity-70' : 'bg-white border-primary/20 shadow-sm'}`}>
                        <div className="p-4">
                           <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedStopId(isExpanded ? null : delivery.id)}>
                              <div className="flex items-start gap-3">
                                 <div className={`mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs text-center transition-all ${delivery.delivered ? 'bg-zinc-200 text-zinc-500' : 'bg-primary text-white shadow-md'}`}>
                                    {index + 1}
                                 </div>
                                 <div>
                                    <h3 className={`font-bold text-lg ${delivery.delivered ? 'text-zinc-600 line-through' : 'text-zinc-900'}`}>{delivery.customer?.name}</h3>
                                    {(() => {
                                       const prod = products.find(p => p.id === delivery.product_id);
                                       return (
                                          <p className="font-semibold text-primary text-sm mt-0.5">
                                             {delivery.milk_qty} {prod ? `${prod.name} (${prod.size})` : 'Milk'}
                                          </p>
                                       );
                                    })()}
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button onClick={async (e) => {
                                    e.stopPropagation();
                                    router.push(`/customers/${delivery.customer_id}`);
                                    /*
                                    setSelectedCustomerForPayment(delivery.customer_id);
                                    setPaymentAmount("");
                                    setPaymentMethod("Cash");
                                    setPaymentNotes("");
                                    setPaymentTotalDue(null);
                                    setIsPaymentModalOpen(true);
                                    const bal = await fetchCustomerBalance(delivery.customer_id);
                                    setPaymentTotalDue(bal);
                                 }} className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors shadow-sm"><Wallet2 size={18} strokeWidth={2.5} /></button>
                                 <button onClick={(e) => { e.stopPropagation(); toggleDelivery(delivery.id); }} className={`h-12 w-12 flex items-center justify-center rounded-full ${delivery.delivered ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400 hover:text-emerald-500 border border-zinc-200'} ${isShiftClosed ? 'opacity-50 cursor-not-allowed' : ''}`}><Check size={20} strokeWidth={3} /></button>
                              </div>
                           </div>
                           {!isExpanded && activeItems.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 mb-2">
                                 {activeItems.map((item: any) => (<span key={item.name} className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-md">{item.qty}x {item.name}</span>))}
                              </div>
                           )}
                           <div className="mt-4 pt-3 border-t border-zinc-100">
                              <button onClick={() => setExpandedStopId(delivery.id)} className={`flex items-center gap-1.5 text-xs font-bold transition-colors py-1 rounded-lg ${isExpanded ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'}`}><PackagePlus size={14} />{activeItems.length > 0 ? 'Edit Extra Items' : 'Add Additional Products'}</button>
                           </div>
                        </div>
                     </motion.div>
                  );
               })
            ) : (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <PackageSearch size={48} className="mb-4" />
                  <p className="font-bold">No deliveries scheduled</p>
               </div>
            )}
         </main>

         <AnimatePresence>
            {expandedStopId !== null && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-5">
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl pt-6 pb-12 px-6 flex flex-col relative">
                     <button onClick={() => setExpandedStopId(null)} className="absolute top-4 right-4 p-2 bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
                     <div className="mb-6"><h2 className="text-xl font-black text-zinc-900">Add Products</h2><p className="text-sm text-zinc-500">For {deliveries.find(d => d.id === expandedStopId)?.customer?.name}</p></div>
                     <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar py-1">
                        {/* Milk Control */}
                        {(() => {
                           const stop = deliveries.find(d => d.id === expandedStopId);
                           const milkQty = stop?.milk_qty || 0;
                           const prod = products.find(p => p.id === stop?.product_id);
                           return (
                              <div className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${milkQty > 0 ? 'bg-primary/5 border-primary/40' : 'bg-white border-zinc-100'}`}>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-black text-zinc-800">{prod ? prod.name : 'Fresh Milk'}</span>
                                    <span className="text-[11px] font-medium text-zinc-500">{prod ? prod.size : 'Standard Delivery'}</span>
                                 </div>
                                 <div className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl p-1 shadow-sm">
                                    <button onClick={() => updateMilkQty(expandedStopId!, -1)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-rose-500"><Minus size={16} /></button>
                                    <span className="text-sm font-black w-5 text-center">{milkQty}</span>
                                    <button onClick={() => updateMilkQty(expandedStopId!, 1)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-emerald-500"><Plus size={16} /></button>
                                 </div>
                              </div>
                           );
                        })()}

                        <div className="h-px bg-zinc-100 my-1" />

                        {products.filter(p => {
                           const stop = deliveries.find(d => d.id === expandedStopId);
                           return p.id !== stop?.product_id;
                        }).map((product) => {
                           const stopItems = deliveries.find(d => d.id === expandedStopId)?.misc_items || [];
                           const item = stopItems.find((i: any) => i.name === product.name);
                           const qty = item ? item.qty : 0;
                           return (
                              <div key={product.name} className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${qty > 0 ? 'bg-primary/10 border-primary/20' : 'bg-white border-zinc-100'}`}>
                                 <div className="flex flex-col"><span className="text-sm font-bold text-zinc-800">{product.name}</span><span className="text-[11px] font-medium text-zinc-500">{product.size} • {product.price}</span></div>
                                 <div className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl p-1 shadow-sm">
                                    <button onClick={() => updateProductQty(expandedStopId!, product.name, -1)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-rose-500"><Minus size={16} /></button>
                                    <span className="text-sm font-black w-5 text-center">{qty}</span>
                                    <button onClick={() => updateProductQty(expandedStopId!, product.name, 1)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-emerald-500"><Plus size={16} /></button>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                     <button onClick={() => setExpandedStopId(null)} className="w-full bg-primary text-white py-4 rounded-2xl font-bold mt-8 shadow-xl">Done</button>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/*
         <AnimatePresence>
            {isPaymentModalOpen && (
               <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-5">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-2xl flex flex-col gap-6 text-zinc-900">
                     <div className="flex justify-between items-center"><p className="text-[18px] font-black text-slate-900">Record Payment</p><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button></div>

                     {paymentTotalDue !== null ? (
                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between">
                           <span className="text-orange-800 text-xs font-bold uppercase tracking-widest">Total Outstanding</span>
                           <span className="text-orange-600 font-black text-lg">₹{paymentTotalDue.toFixed(2)}</span>
                        </div>
                     ) : (
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-center animate-pulse h-14" />
                     )}

                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseFloat(paymentAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        // runRecordPayment(amt, paymentMethod, paymentNotes);
                     }} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payment Amount (₹)</label>
                           <input
                              autoFocus
                              type="number"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all font-bold"
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payment Method</label>
                           <div className="grid grid-cols-2 gap-2">
                              {['Cash', 'UPI', 'Bank Transfer', 'Other'].map(method => (
                                 <button
                                    type="button"
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-2 text-sm font-bold rounded-xl border transition-all ${paymentMethod === method ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                 >
                                    {method}
                                 </button>
                              ))}
                           </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notes (Optional)</label>
                           <input
                              type="text"
                              placeholder="e.g. Received at door"
                              value={paymentNotes}
                              onChange={e => setPaymentNotes(e.target.value)}
                              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all"
                           />
                        </div>
                        <button disabled={isLoading} type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-all shadow-xl disabled:opacity-50">
                           {isLoading ? "Saving..." : "Record Payment"}
                        </button>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
         */}

         <AnimatePresence>
            {hasUnsavedChanges && !isStagingCollapsed && (
               <motion.div
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 80, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-md bg-linear-to-r from-zinc-950 via-primary/95 to-zinc-950 backdrop-blur-xl text-white rounded-2xl py-3.5 px-4 shadow-[0_20px_50px_rgba(5,0,68,0.3)] z-110 flex items-center justify-between border border-white/10"
               >
                  <div className="flex items-center gap-3">
                     <div className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                     </div>
                     <div className="flex flex-col text-left">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Offline Staging</span>
                        <span className="text-sm font-bold text-white">{changedDeliveries.length} {changedDeliveries.length === 1 ? 'Change' : 'Changes'} Pending</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-[0_8px_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                     >
                        {isSyncing ? (
                           <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                              <span>Syncing...</span>
                           </>
                        ) : (
                           <>
                              <CloudUpload size={14} strokeWidth={2.5} />
                              <span>Sync</span>
                           </>
                        )}
                     </button>
                     <button
                        onClick={() => setIsStagingCollapsed(true)}
                        className="p-2 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors"
                        title="Collapse"
                     >
                        <ChevronRight size={18} />
                     </button>
                  </div>
               </motion.div>
            )}

            {hasUnsavedChanges && isStagingCollapsed && (
               <motion.button
                  key="collapsed-staging"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={() => setIsStagingCollapsed(false)}
                  className="fixed bottom-24 right-5 z-110 bg-linear-to-r from-primary/95 to-[#0b0080]/95 backdrop-blur-md text-white py-2.5 px-4 rounded-full shadow-[0_12px_30px_rgba(5,0,68,0.4)] border border-white/10 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  title="Expand Staging Banner"
               >
                  <CloudUpload size={18} className="text-emerald-400 animate-bounce" />
                  <div className="w-px h-4 bg-white/20" />
                  <span className="text-xs font-black text-white">{changedDeliveries.length} Pending</span>
               </motion.button>
            )}
         </AnimatePresence>

         <Modal
            isOpen={modalConfig.isOpen}
            onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            onConfirm={(dontShow) => {
               if (modalConfig.onConfirm) {
                  modalConfig.onConfirm(dontShow);
               } else {
                  setModalConfig(prev => ({ ...prev, isOpen: false }));
               }
            }}
            title={modalConfig.title}
            message={modalConfig.message}
            type={modalConfig.type}
            confirmText="Okay"
            showDontShowAgain={modalConfig.showDontShowAgain}
         />
      </PullToRefresh>
   );
}
