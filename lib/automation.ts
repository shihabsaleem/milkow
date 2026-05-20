
import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}



// ─────────────────────────────────────────────
// 1. DAILY ROUTE RESET
// ─────────────────────────────────────────────

export async function resetDailyRoute(): Promise<{ ran: boolean; message: string }> {
  const today = todayStr();

  try {
    // 1. Get all active customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*, default_product_id, default_qty')
      .eq('status', 'Active')
      .order('delivery_order', { ascending: true });

    if (!customers || customers.length === 0) {
      return { ran: false, message: "No active customers found." };
    }

    // 2. Get existing deliveries for today to avoid duplicates
    const { data: existingDeliveries } = await supabase
      .from('deliveries')
      .select('customer_id, shift')
      .eq('delivery_date', today);

    const existingMap = new Set(existingDeliveries?.map((d: any) => `${d.customer_id}-${d.shift}`) || []);

    // 3. Identify missing records
    const deliveriesToCreate: any[] = [];
    customers.forEach((c: any) => {
      const freq = c.frequency || 'Morning Only';

      const needsMorning = freq === 'Morning Only' || freq === 'Morning & Evening';
      const needsEvening = freq === 'Evening Only' || freq === 'Morning & Evening';

      if (needsMorning && !existingMap.has(`${c.id}-Morning Only`)) {
        deliveriesToCreate.push({
          customer_id: c.id,
          delivery_date: today,
          shift: 'Morning Only',
          product_id: c.default_product_id,
          milk_qty: c.default_qty || 1,
          sequence_no: Math.floor(Number(c.delivery_order) || 0),
          delivered: false,
          inventory_deducted: false,
          misc_items: []
        });
      }

      if (needsEvening && !existingMap.has(`${c.id}-Evening Only`)) {
        deliveriesToCreate.push({
          customer_id: c.id,
          delivery_date: today,
          shift: 'Evening Only',
          product_id: c.default_product_id,
          milk_qty: c.default_qty || 1,
          sequence_no: Math.floor(Number(c.delivery_order) || 0),
          delivered: false,
          inventory_deducted: false,
          misc_items: []
        });
      }
    });

    if (deliveriesToCreate.length > 0) {
      const { error: insertError } = await supabase.from('deliveries').insert(deliveriesToCreate);
      if (insertError) throw insertError;

      // 1. Fetch current settings to merge
      const { data: currentSettings } = await supabase.from('system_settings').select('value').eq('key', 'automation').maybeSingle();
      const existingValue = (currentSettings as any)?.value || {};

      // 2. Update lastReset timestamp without losing other keys
      await supabase.from('system_settings').upsert({
        key: 'automation',
        value: { ...existingValue, lastRouteReset: today }
      });

      console.log(`[Automation] ✅ Created ${deliveriesToCreate.length} missing route records for ${today}`);
      return { ran: true, message: `Added ${deliveriesToCreate.length} new records to today's route.` };
    }

    return { ran: false, message: `All ${customers.length} customers are already on the route for ${today}.` };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error("[Automation] ❌ Route sync failed:", errorMsg);
    return { ran: false, message: `Sync failed: ${errorMsg}` };
  }
}

// ─────────────────────────────────────────────
// 2. INVENTORY AUTO-DEDUCTION
// ─────────────────────────────────────────────

export async function deductInventoryOnDelivery(
  stopId: string,
  productId: string | null,
  milkQty: number,
  miscProducts: Record<string, number> = {},
  force: boolean = false
): Promise<void> {
  try {
    if (!force) {
      // 1. Check if already deducted
      const { data: stopData } = await supabase
        .from('deliveries')
        .select('inventory_deducted, product_id')
        .eq('id', stopId)
        .single();

      const stop = stopData as T.Delivery | null;
      if (stop?.inventory_deducted) return;
      productId = stop?.product_id || null;
    }

    if (productId && milkQty > 0) {
      const { data: prodData } = await supabase.from('products').select('*').eq('id', productId).single();
      const prod = prodData as T.Product | null;
      if (prod) {
        await supabase
          .from('products')
          .update({ stock: Math.max(0, (prod.stock || 0) - milkQty) })
          .eq('id', prod.id);
        
        // Also update the linked inventory pipeline record if it exists
        const { data: invData } = await supabase.from('inventory').select('*').eq('product_id', prod.id).single();
        if (invData) {
          await supabase
            .from('inventory')
            .update({ 
              loaded: Math.max(0, (invData.loaded || 0) - milkQty)
            })
            .eq('id', invData.id);
        }
      }
    }

    // 3. Deduct Extras from products
    for (const [name, qtyUsed] of Object.entries(miscProducts)) {
      if (qtyUsed > 0) {
        const { data: prodData } = await supabase.from('products').select('*').eq('name', name).single();
        const prod = prodData as T.Product | null;
        if (prod) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, (prod.stock || 0) - qtyUsed) })
            .eq('id', prod.id);
        }
      }
    }

    // 4. Mark as deducted
    await supabase.from('deliveries').update({ inventory_deducted: true }).eq('id', stopId);

    console.log(`[Automation] ✅ Inventory deducted for delivery #${stopId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Automation] ❌ Inventory deduction failed:", message);
  }
}

// ─────────────────────────────────────────────
// 2.5 INVENTORY AUTO-RESTORE
// ─────────────────────────────────────────────

export async function restoreInventoryOnUndelivery(
  stopId: string,
  productId: string | null,
  milkQty: number,
  miscProducts: Record<string, number> = {},
  force: boolean = false
): Promise<void> {
  try {
    if (!force) {
      // 1. Check if actually deducted
      const { data: stopData } = await supabase
        .from('deliveries')
        .select('inventory_deducted, product_id')
        .eq('id', stopId)
        .single();

      const stop = stopData as T.Delivery | null;
      if (!stop?.inventory_deducted) return;
      productId = stop?.product_id || null;
    }

    if (productId && milkQty > 0) {
      const { data: prodData } = await supabase.from('products').select('*').eq('id', productId).single();
      const prod = prodData as T.Product | null;
      if (prod) {
        await supabase
          .from('products')
          .update({ stock: (prod.stock || 0) + milkQty })
          .eq('id', prod.id);
        
        // Also update the linked inventory pipeline record if it exists
        const { data: invData } = await supabase.from('inventory').select('*').eq('product_id', prod.id).single();
        if (invData) {
          await supabase
            .from('inventory')
            .update({ 
              loaded: (invData.loaded || 0) + milkQty
            })
            .eq('id', invData.id);
        }
      }
    }

    // 3. Restore Extras to products
    for (const [name, qtyUsed] of Object.entries(miscProducts)) {
      if (qtyUsed > 0) {
        const { data: prodData } = await supabase.from('products').select('*').eq('name', name).single();
        const prod = prodData as T.Product | null;
        if (prod) {
          await supabase
            .from('products')
            .update({ stock: (prod.stock || 0) + qtyUsed })
            .eq('id', prod.id);
        }
      }
    }

    // 4. Mark as not deducted
    await supabase.from('deliveries').update({ inventory_deducted: false }).eq('id', stopId);

    console.log(`[Automation] ✅ Inventory restored for delivery #${stopId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Automation] ❌ Inventory restoration failed:", message);
  }
}

// ─────────────────────────────────────────────
// 3. AUTO BILL GENERATION
// ─────────────────────────────────────────────

export async function generateDailyBills(): Promise<{ ran: boolean; count: number; message: string }> {
  const today = todayStr();

  try {
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'automation')
      .maybeSingle();

    const settings = settingsData as { value: T.AutomationSettings } | null;
    const lastBillGen = settings?.value?.lastBillGeneration;
    if (lastBillGen === today) {
      return { ran: false, count: 0, message: `Bills already generated for ${today}` };
    }

    const { data: deliveryData } = await supabase
      .from('deliveries')
      .select('*, customer:customers(*)')
      .eq('delivered', true)
      .eq('billed', false)
      .eq('delivery_date', today);

    const completedDeliveries = deliveryData as (T.Delivery & { customer: T.Customer })[] | null;

    if (!completedDeliveries || completedDeliveries.length === 0) {
      return { ran: false, count: 0, message: "No completed deliveries found for today." };
    }

    const { data: productsData } = await supabase.from('products').select('*');
    const productsList = productsData as T.Product[] | null;
    const prices: Record<string, number> = {};
    productsList?.forEach(p => {
      prices[p.id] = p.price;
      prices[p.name] = p.price;
    });

    const billsToCreate = completedDeliveries.map(delivery => {
      const qty = delivery.milk_qty || 0;
      const unitPrice = prices[delivery.product_id || ""] || 0;
      let totalAmount = qty * unitPrice;
      const miscItems = delivery.misc_items || [];

      miscItems.forEach((item: any) => {
        // ... (remaining logic for misc items remains same)
        const itemPrice = prices[item.name] || 0;
        totalAmount += item.qty * itemPrice;
      });

      return {
        customer_id: delivery.customer_id,
        type: 'Monthly',
        amount: totalAmount,
        status: 'Pending',
        created_at: new Date().toISOString(),
      };
    });

    // Batch insert bills
    const { error: insertError } = await supabase.from('bills').insert(billsToCreate);
    if (insertError) throw insertError;

    // 4. Mark these deliveries as billed
    const deliveryIds = completedDeliveries.map(d => d.id);
    await supabase.from('deliveries').update({ billed: true }).in('id', deliveryIds);

    // Update timestamp
    const newValue = { ...(settings?.value || {}), lastBillGeneration: today };
    await supabase.from('system_settings').upsert({ key: 'automation', value: newValue });

    return { ran: true, count: billsToCreate.length, message: `Generated ${billsToCreate.length} bills.` };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error("[Automation] ❌ Bill generation failed:", errorMsg);
    return { ran: false, count: 0, message: `Bill generation failed: ${errorMsg}` };
  }
}


// ─────────────────────────────────────────────
// 4. SHIFT CLOSE — AUTO BILL DELIVERED ITEMS
// ─────────────────────────────────────────────

export async function closeShift(shift: 'Morning Only' | 'Evening Only'): Promise<{ ran: boolean; count: number; message: string }> {
  const today = todayStr();
  const settingsKey = shift === 'Morning Only' ? 'lastMorningClose' : 'lastEveningClose';

  try {
    // Guard: only run once per day per shift
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'automation')
      .maybeSingle();

    const settings = (settingsData as any)?.value || {};
    if (settings[settingsKey] === today) {
      return { ran: false, count: 0, message: `${shift} already closed for ${today}` };
    }

    // Find all delivered+unbilled deliveries for this shift today
    const { data: unbilled, error } = await supabase
      .from('deliveries')
      .select('id')
      .eq('delivery_date', today)
      .eq('shift', shift)
      .eq('delivered', true)
      .eq('billed', false);

    if (error) throw error;

    if (!unbilled || unbilled.length === 0) {
      // Still stamp the timestamp so we don't re-check repeatedly
      await supabase.from('system_settings').upsert({
        key: 'automation',
        value: { ...settings, [settingsKey]: today }
      });
      return { ran: false, count: 0, message: `No unbilled deliveries for ${shift} on ${today}.` };
    }

    const ids = unbilled.map((d: any) => d.id);
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ billed: true })
      .in('id', ids);

    if (updateError) throw updateError;

    // Stamp close time
    await supabase.from('system_settings').upsert({
      key: 'automation',
      value: { ...settings, [settingsKey]: today }
    });

    console.log(`[Automation] ✅ ${shift} closed — ${ids.length} deliveries marked as billed.`);
    return { ran: true, count: ids.length, message: `${shift} closed: ${ids.length} deliveries billed.` };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[Automation] ❌ Shift close failed (${shift}):`, errorMsg);
    return { ran: false, count: 0, message: `Shift close failed: ${errorMsg}` };
  }
}

// ─────────────────────────────────────────────
// 5. MASTER RUNNER
// ─────────────────────────────────────────────

let isRunning = false;

export async function checkAndRunAutomations(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    console.log("[Automation] 🚀 Running daily checks (Supabase)...");
    await resetDailyRoute();

    const hour = new Date().getHours();

    // Morning shift closes at 12pm (noon)
    if (hour >= 12) {
      await closeShift('Morning Only');
    }

    // Evening shift closes at 10pm
    if (hour >= 22) {
      await closeShift('Evening Only');
    }
  } finally {
    isRunning = false;
  }
}
