import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as T from "@/types/database";

export type PipelineStage = { label: string; value: number | string; unit: string; id: number; productId?: string | number; loaded: number };

export function useInventoryLogic() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/404");
    }
  }, [user, loading, router]);

  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [products, setProducts] = useState<T.Product[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({ name: "", size: "", stock: "", price: 0, unit: "Bottles" });

  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [closingShift, setClosingShift] = useState("Morning Only");
  const [closedShifts, setClosedShifts] = useState<{ [date: string]: string[] }>({});
  const [dailyPrices, setDailyPrices] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (dontShowAgain?: boolean) => void;
    type: 'danger' | 'info' | 'success';
    confirmText?: string;
    showDontShowAgain?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: 'info',
    showDontShowAgain: false
  });

  const getProductPriceForDate = useCallback((product: T.Product) => {
    if (!product.name) return Number(product.price) || 0;
    const dateData = dailyPrices[date];
    if (!dateData) return Number(product.price) || 0;

    const keys = Object.keys(dateData);
    let shiftPrice: number | undefined;
    for (const key of keys) {
      if (dateData[key] && typeof dateData[key] === 'object' && 'prices' in dateData[key]) {
        const prices = dateData[key].prices;
        if (prices && prices[product.name] !== undefined) {
          shiftPrice = Number(prices[product.name]);
        }
      }
    }
    if (shiftPrice !== undefined) return shiftPrice;

    if (dateData[product.name] !== undefined && typeof dateData[product.name] === 'number') {
      return Number(dateData[product.name]);
    }

    return Number(product.price) || 0;
  }, [dailyPrices, date]);

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    const targetProduct = products[index];
    setNewProduct({
      ...targetProduct,
      stock: targetProduct.stock?.toString() || "0",
      price: getProductPriceForDate(targetProduct),
      unit: targetProduct.unit || "Bottles"
    });
    setIsModalOpen(true);
  };

  const { franchiseId, impersonatedFranchiseId, role } = useAuth();
  const activeFranchiseId = role === 'superadmin' ? (impersonatedFranchiseId || '00000000-0000-0000-0000-000000000000') : (franchiseId || '00000000-0000-0000-0000-000000000000');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const [{ data: prods }, { data: pipes }, { data: settings }] = await Promise.all([
      supabase.from('products').select('*').eq('franchise_id', activeFranchiseId),
      supabase.from('inventory').select('*').eq('franchise_id', activeFranchiseId).not('product_id', 'is', null),
      supabase.from('system_settings').select('value').eq('franchise_id', activeFranchiseId).eq('key', 'daily_prices').maybeSingle()
    ]);
    if (prods) setProducts(prods as T.Product[]);
    if (pipes) {
      setPipeline((pipes as any[]).map(p => ({ label: p.name, value: p.count === 0 ? "" : p.count, unit: p.unit, id: p.id, productId: p.product_id, loaded: p.loaded || 0 })));
    }
    
    if (settings && settings.value) {
      const dbDailyPrices = settings.value as any;
      setDailyPrices(dbDailyPrices);
      const closed: { [date: string]: string[] } = {};
      Object.keys(dbDailyPrices).forEach(d => {
        closed[d] = Object.keys(dbDailyPrices[d] || {});
      });
      setClosedShifts(closed);
    }

    if (!silent) setIsLoading(false);
  }, [activeFranchiseId]);

  useEffect(() => {
    fetchData();

    const sub = supabase.channel('inv_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [fetchData]);

  const handleSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProduct.name || !newProduct.price || isSubmitting) return;
      
      setIsSubmitting(true);
      const productToSave = {
         name: newProduct.name,
         size: newProduct.size,
         stock: parseInt(newProduct.stock.toString() || "0"),
         price: Number(newProduct.price) || 0,
         unit: newProduct.unit,
         franchise_id: activeFranchiseId
      };

      const isEdit = editingIndex !== null && products[editingIndex].id;
      const targetId = isEdit ? products[editingIndex].id : null;
      const oldStock = isEdit ? (products[editingIndex].stock || 0) : 0;
      
      // Optimistic UI updates
      if (isEdit) {
         setProducts(prev => prev.map((p, idx) => idx === editingIndex ? { ...p, ...productToSave } : p));
         setPipeline(prev => prev.map(p => p.productId === targetId ? { ...p, label: productToSave.name, unit: productToSave.unit, value: productToSave.stock } : p));
      }

      setIsModalOpen(false);
      setNewProduct({ name: "", size: "", stock: "", price: 0, unit: "Bottles" });
      setEditingIndex(null);

      try {
         const runAsync = async () => {
            if (isEdit && targetId) {
               const newStock = productToSave.stock;
               const delta = newStock - oldStock;

               await supabase.from('products').update(productToSave).eq('id', targetId);

               const { data: invItem } = await supabase.from('inventory').select('loaded').eq('product_id', targetId).single();
               const currentLoaded = invItem?.loaded || 0;
               const newLoaded = Math.max(0, currentLoaded + delta);

               await supabase.from('inventory').update({
                  name: productToSave.name,
                  unit: productToSave.unit,
                  count: productToSave.stock,
                  loaded: newLoaded
               }).eq('product_id', targetId);
            } else {
               const { data: insertedProduct, error: insertError } = await supabase.from('products').insert(productToSave).select().single();
               if (!insertError && insertedProduct) {
                  await supabase.from('inventory').insert({
                     product_id: insertedProduct.id,
                     name: insertedProduct.name,
                     unit: insertedProduct.unit,
                     count: productToSave.stock,
                     loaded: productToSave.stock,
                     vol: insertedProduct.size
                  });
               }
            }
            fetchData(true);
         };

         runAsync().catch(err => {
            console.error(err);
            fetchData(true);
         }).finally(() => {
            setIsSubmitting(false);
         });
      } catch (err) {
         console.error(err);
         fetchData(true);
         setIsSubmitting(false);
      }
   };

   const runDeleteProduct = async () => {
      if (editingIndex === null || !products[editingIndex].id) return;
      
      const productId = products[editingIndex].id;

      // Optimistic update
      setProducts(prev => prev.filter(p => p.id !== productId));
      setPipeline(prev => prev.filter(p => p.productId !== productId));
      
      setIsModalOpen(false);
      setEditingIndex(null);
      setModalConfig(prev => ({ ...prev, isOpen: false }));
      
      try {
         const runAsync = async () => {
            await supabase.from('products').delete().eq('id', productId);
            await supabase.from('inventory').delete().eq('product_id', productId);
            fetchData(true);
         };
         runAsync().catch(err => {
            console.error(err);
            fetchData(true);
         });
      } catch (err) { console.error(err); }
   };

  const handleDeleteProduct = async () => {
    if (editingIndex === null || !products[editingIndex].id) return;

    const skip = localStorage.getItem('skip_delete_product_confirm') === 'true';
    if (skip) {
      runDeleteProduct();
      return;
    }

    setModalConfig({
      isOpen: true,
      title: "Delete Product",
      message: `Are you sure you want to delete ${products[editingIndex].name}? This action cannot be undone.`,
      type: 'danger',
      confirmText: "Delete",
      showDontShowAgain: true,
      onConfirm: async (dontShow) => {
        if (dontShow) localStorage.setItem('skip_delete_product_confirm', 'true');
        await runDeleteProduct();
      }
    });
  };

  const updatePipelineValue = async (id: number, newValue: string) => {
    const uiValue = newValue === "" ? "" : parseInt(newValue);
    const dbValue = newValue === "" || isNaN(uiValue as number) ? 0 : (uiValue as number);

    const stage = pipeline.find(p => p.id === id);
    if (!stage) return;

    const currentCount = Number(stage.value) || 0;
    const currentLoaded = stage.loaded || 0;
    const delta = dbValue - currentCount;
    const newLoaded = Math.max(0, currentLoaded + delta);

    setPipeline(prev => prev.map(p => p.id === id ? { ...p, value: uiValue !== null && uiValue !== undefined && !isNaN(uiValue as number) ? uiValue : "", loaded: newLoaded } : p));

    try {
      const { error } = await supabase.from('inventory').update({ count: dbValue, loaded: newLoaded }).eq('id', id);
      if (error) throw error;

      if (stage.productId) {
        await supabase.from('products').update({ stock: dbValue }).eq('id', stage.productId);
      }
    } catch (err) {
      console.error(err);
      await fetchData(true);
    }
  };

   const handleCloseShiftSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      
      setIsSubmitting(true);
      
      // Optimistic update
      setProducts(prev => prev.map(p => ({ ...p, stock: 0 })));
      setPipeline(prev => prev.map(p => ({ ...p, value: "", loaded: 0 })));
      
      setIsCloseShiftModalOpen(false);
      setModalConfig({
         isOpen: true,
         title: "Shift Closed",
         message: `${closingShift} has been closed successfully. All stock levels have been reset to zero.`,
         type: 'success',
         confirmText: "Done",
         onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });

      try {
         const runAsync = async () => {
            const currentPrices = products.reduce((acc, p) => ({ ...acc, [p.name]: p.price }), {});
            const { data: existingPricesData } = await supabase.from('system_settings').select('value').eq('key', 'daily_prices').single();
            const dailyPrices = existingPricesData ? (existingPricesData.value as any) : {};

            const todayData = dailyPrices[date] || {};
            todayData[closingShift] = {
               prices: currentPrices,
               closed_at: new Date().toISOString()
            };

            await supabase.from('system_settings').upsert({
               key: 'daily_prices',
               value: { ...dailyPrices, [date]: todayData }
            });

            const productIds = products.map(p => p.id).filter(id => id);
            const inventoryIds = pipeline.map(p => p.id).filter(id => id);
            
            if (productIds.length > 0) {
               await supabase.from('products').update({ stock: 0 }).in('id', productIds);
            }
            if (inventoryIds.length > 0) {
               await supabase.from('inventory').update({ count: 0, loaded: 0 }).in('id', inventoryIds);
            }

            fetchData(true);
         };

         runAsync().catch(err => {
            console.error(err);
            fetchData(true); // revert
         }).finally(() => {
            setIsSubmitting(false);
         });

      } catch (err) {
         console.error(err);
         setIsSubmitting(false);
         fetchData(true);
      }
   };

  return {
    date,
    setDate,
    isModalOpen,
    setIsModalOpen,
    pipeline,
    products,
    editingIndex,
    setEditingIndex,
    isLoading,
    newProduct,
    setNewProduct,
    isCloseShiftModalOpen,
    setIsCloseShiftModalOpen,
    closingShift,
    setClosingShift,
    closedShifts,
    dateInputRef,
    modalConfig,
    setModalConfig,
    getProductPriceForDate,
    openEditModal,
    handleSaveProduct,
    handleDeleteProduct,
    updatePipelineValue,
    handleCloseShiftSubmit,
    fetchData,
    isSubmitting
  };
}
