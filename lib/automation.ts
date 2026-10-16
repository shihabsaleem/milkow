
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

/**
 * Whether the Auto Entry columns exist yet.
 *
 * The migration (Documentations/auto_entry_migration.md) may not have been applied, and
 * shipping code that inserts a non-existent column would fail the WHOLE route reset —
 * meaning no delivery rows at all, for every customer. So probe once and degrade to the
 * pre-Auto-Entry behaviour until the migration lands.
 */
let autoEntrySupported: boolean | null = null;

export async function isAutoEntrySupported(): Promise<boolean> {
  if (autoEntrySupported !== null) return autoEntrySupported;

  const { error } = await supabase.from('deliveries').select('auto_marked').limit(1);
  autoEntrySupported = !error;

  if (!autoEntrySupported) {
    console.warn(
      '[Automation] ⚠️ Auto Entry columns not found — deliveries will be created undelivered as before. Apply Documentations/auto_entry_migration.md to enable the feature.'
    );
  }
  return autoEntrySupported;
}



// ─────────────────────────────────────────────
// 1. DAILY ROUTE RESET
// ─────────────────────────────────────────────

export async function resetDailyRoute(franchiseId: string): Promise<{ ran: boolean; message: string }> {
  const today = todayStr();

  try {
    // 1. Get all active customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*, default_product_id, default_qty')
      .eq('franchise_id', franchiseId)
      .eq('status', 'Active')
      .order('delivery_order', { ascending: true });

    if (!customers || customers.length === 0) {
      return { ran: false, message: "No active customers found." };
    }

    // 2. Get existing deliveries for today to avoid duplicates
    const { data: existingDeliveries } = await supabase
      .from('deliveries')
      .select('customer_id, shift')
      .eq('franchise_id', franchiseId)
      .eq('delivery_date', today);

    const existingMap = new Set(existingDeliveries?.map((d: any) => `${d.customer_id}-${d.shift}`) || []);

    // Probe for the Auto Entry columns. If the migration hasn't been applied we fall back
    // to the previous behaviour (everything created undelivered) rather than failing.
    const autoEntry = await isAutoEntrySupported();

    // 3. Identify missing records
    const deliveriesToCreate: any[] = [];

    // Stock owed by auto-marked rows, aggregated per product. Deducted at creation
    // because a row the driver never touches is never synced, so syncBatchDeliveries
    // would never deduct it.
    const autoStockByProduct = new Map<string, number>();
    const addAutoStock = (productId: string | null, qty: number) => {
      if (!productId || qty <= 0) return;
      autoStockByProduct.set(productId, (autoStockByProduct.get(productId) || 0) + qty);
    };

    customers.forEach((c: any) => {
      const freq = c.frequency || 'Morning Only';

      // Strict true only. A NULL (migration not applied / not yet set) means "off".
      const isAuto = autoEntry && c.auto_entry === true;

      const needsMorning = freq === 'Morning Only' || freq === 'Morning & Evening';
      const needsEvening = freq === 'Evening Only' || freq === 'Morning & Evening';

      const base = {
        customer_id: c.id,
        franchise_id: c.franchise_id,
        delivery_date: today,
        product_id: c.default_product_id,
        milk_qty: c.default_qty || 1,
        sequence_no: Math.floor(Number(c.delivery_order) || 0),
        // An auto row starts delivered AND already deducted, so that an uncheck later
        // hits the existing "delivered -> undelivered" restore path in syncBatchDeliveries
        // and puts the stock back exactly once.
        delivered: isAuto,
        inventory_deducted: isAuto,
        misc_items: [],
        // Omit the auto_marked KEY entirely unless the column exists. PostgREST rejects the whole
        // statement when a payload key references a missing column — even when the value is
        // `false` — so gating the value is not enough. Gating the key is what makes this
        // genuinely deploy-safe before the migration is applied.
        ...(autoEntry ? { auto_marked: isAuto } : {})
      };

      if (needsMorning && !existingMap.has(`${c.id}-Morning Only`)) {
        deliveriesToCreate.push({ ...base, shift: 'Morning Only' });
        if (isAuto) addAutoStock(base.product_id, base.milk_qty);
      }

      if (needsEvening && !existingMap.has(`${c.id}-Evening Only`)) {
        deliveriesToCreate.push({ ...base, shift: 'Evening Only' });
        if (isAuto) addAutoStock(base.product_id, base.milk_qty);
      }
    });

    if (deliveriesToCreate.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('deliveries')
        .insert(deliveriesToCreate)
        .select(autoEntry ? 'id, auto_marked' : 'id');

      if (insertError) throw insertError;

      const insertedRows = (inserted || []) as { id: string; auto_marked?: boolean }[];

      // 3b. Deduct stock for auto-marked rows.
      // Order matters: we insert first, then deduct. If the deduction fails we delete the
      // rows we just created, so the next login retries cleanly instead of leaving rows
      // that claim delivery without the stock having left the building.
      if (autoStockByProduct.size > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, stock')
          .eq('franchise_id', franchiseId);

        const productsById = new Map<string, T.Product>(
          (productsData || []).map((p: any) => [p.id, p as T.Product])
        );
        const autoIds = autoEntry ? insertedRows.filter((r) => r.auto_marked).map((r) => r.id) : [];
        let deductionFailed = false;

        for (const [productId, qty] of autoStockByProduct.entries()) {
          const prod = productsById.get(productId);
          if (!prod) {
            console.error(`[Automation] ⚠️ Auto Entry: product ${productId} not found, cannot deduct ${qty}`);
            deductionFailed = true;
            break;
          }

          const { error: stockError } = await supabase
            .from('products')
            .update({ stock: Math.max(0, (prod.stock || 0) - qty) })
            .eq('id', productId);

          if (stockError) {
            console.error(`[Automation] ❌ Auto Entry stock deduction failed for ${prod.name}:`, stockError.message);
            deductionFailed = true;
            break;
          }
        }

        if (deductionFailed) {
          // Roll back the auto rows so the next reset retries the whole thing.
          if (autoIds.length > 0) {
            const { error: rollbackError } = await supabase.from('deliveries').delete().in('id', autoIds);
            if (rollbackError) {
              console.error('[Automation] ❌ CRITICAL: could not roll back auto-marked rows:', rollbackError.message);
            }
          }
          throw new Error('Auto Entry stock deduction failed — route rows rolled back');
        }
      }

      // 1. Fetch current settings to merge
      const { data: currentSettings } = await supabase.from('system_settings').select('value').eq('franchise_id', franchiseId).eq('key', 'automation').maybeSingle();
      const existingValue = (currentSettings as any)?.value || {};

      // 2. Update lastReset timestamp without losing other keys
      await supabase.from('system_settings').upsert({
        key: 'automation',
        franchise_id: franchiseId,
        value: { ...existingValue, lastRouteReset: today }
      });

      const autoCount = autoEntry ? insertedRows.filter((r) => r.auto_marked).length : 0;
      console.log(`[Automation] ✅ Created ${deliveriesToCreate.length} missing route records for ${today} (${autoCount} auto-marked)`);
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
  franchiseId: string,
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
        // NOTE: Only deduct from product stock, NOT from 'loaded' — loaded is a static snapshot until shift close
      }
    }

    // 3. Deduct Extras from products
    for (const [name, qtyUsed] of Object.entries(miscProducts)) {
      if (qtyUsed > 0) {
        const { data: prodData } = await supabase.from('products').select('*').eq('name', name).eq('franchise_id', franchiseId).single();
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
  franchiseId: string,
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
        // NOTE: Only restore product stock, NOT 'loaded' — loaded is a static snapshot until shift close
      }
    }

    // 3. Restore Extras to products
    for (const [name, qtyUsed] of Object.entries(miscProducts)) {
      if (qtyUsed > 0) {
        const { data: prodData } = await supabase.from('products').select('*').eq('name', name).eq('franchise_id', franchiseId).single();
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

export async function generateDailyBills(franchiseId: string): Promise<{ ran: boolean; count: number; message: string }> {
  const today = todayStr();

  try {
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('franchise_id', franchiseId)
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
      .eq('franchise_id', franchiseId)
      .eq('delivered', true)
      .eq('billed', false)
      .eq('delivery_date', today);

    const completedDeliveries = deliveryData as (T.Delivery & { customer: T.Customer })[] | null;

    if (!completedDeliveries || completedDeliveries.length === 0) {
      return { ran: false, count: 0, message: "No completed deliveries found for today." };
    }

    const { data: productsData } = await supabase.from('products').select('*').eq('franchise_id', franchiseId);
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
        franchise_id: delivery.franchise_id,
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
    await supabase.from('system_settings').upsert({ key: 'automation', franchise_id: franchiseId, value: newValue });

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

export async function closeShift(shift: 'Morning Only' | 'Evening Only', franchiseId: string): Promise<{ ran: boolean; count: number; message: string }> {
  const today = todayStr();
  const settingsKey = shift === 'Morning Only' ? 'lastMorningClose' : 'lastEveningClose';

  try {
    // Guard: only run once per day per shift
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('franchise_id', franchiseId)
      .eq('key', 'automation')
      .maybeSingle();

    const settings = (settingsData as any)?.value || {};

    // NOTE: this function is intentionally re-entrant — there is no "already closed" early
    // return. The query below only selects `billed = false`, so re-running bills nothing extra,
    // which makes repeat calls safe. The guard this replaced caused a real loss of revenue: a
    // delivery re-marked as delivered after the shift closed could never be billed, because the
    // day's close was already stamped.

    // Find all delivered+unbilled deliveries for this shift today
    const { data: unbilled, error } = await supabase
      .from('deliveries')
      .select('id, customer_id, total_cost, franchise_id')
      .eq('franchise_id', franchiseId)
      .eq('delivery_date', today)
      .eq('shift', shift)
      .eq('delivered', true)
      .eq('billed', false);

    if (error) throw error;

    if (!unbilled || unbilled.length === 0) {
      // Nothing to bill right now. The timestamp is still stamped so the UI knows the shift
      // is closed, but it no longer gates this function — see the note above.
      await supabase.from('system_settings').upsert({
        key: 'automation',
        franchise_id: franchiseId,
        value: { ...settings, [settingsKey]: today }
      });
      return { ran: false, count: 0, message: `No unbilled deliveries for ${shift} on ${today}.` };
    }

    // 2. Create Bills for the delivered items using pre-calculated total_cost
    const billsToCreate = unbilled.map((d: any) => {
      return {
        customer_id: d.customer_id,
        franchise_id: d.franchise_id,
        type: 'Spot',
        amount: Number(d.total_cost) || 0,
        status: 'Pending',
        created_at: new Date().toISOString(),
      };
    });

    if (billsToCreate.length > 0) {
      const { error: insertError } = await supabase.from('bills').insert(billsToCreate);
      if (insertError) throw insertError;
    }

    // 3. Mark deliveries as billed AND update their total_cost
    const ids = unbilled.map((d: any) => d.id);
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ billed: true })
      .in('id', ids);

    if (updateError) throw updateError;

    // Stamp close time
    await supabase.from('system_settings').upsert({
      key: 'automation',
      franchise_id: franchiseId,
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

export async function checkAndRunAutomations(franchiseId: string): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    console.log("[Automation] 🚀 Running daily checks (Supabase)...");
    await resetDailyRoute(franchiseId);

    const { data: autoData } = await supabase.from('system_settings').select('value').eq('franchise_id', franchiseId).eq('key', 'automation').maybeSingle();
    const autoVal = (autoData?.value as T.AutomationSettings) || {};

    const autoCloseEnabled = autoVal.autoCloseEnabled ?? true;
    const morningTime = autoVal.morningCloseTime ?? "23:59";
    const eveningTime = autoVal.eveningCloseTime ?? "23:59";

    const d = new Date();
    const currentMins = d.getHours() * 60 + d.getMinutes();

    const parseMins = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    if (autoCloseEnabled) {
      if (currentMins >= parseMins(morningTime)) {
        await closeShift('Morning Only', franchiseId);
      }

      if (currentMins >= parseMins(eveningTime)) {
        await closeShift('Evening Only', franchiseId);
      }
    }
  } finally {
    isRunning = false;
  }
}

// ─────────────────────────────────────────────
// 6. BATCH ROUTE SYNCHRONIZATION
// ─────────────────────────────────────────────

export async function syncBatchDeliveries(
  franchiseId: string,
  changedDeliveries: any[],
  initialDeliveries: any[]
): Promise<void> {
  if (changedDeliveries.length === 0) return;

  // 1. Fetch all products to get stock levels and name maps
  const { data: productsData } = await supabase.from('products').select('*').eq('franchise_id', franchiseId);
  const products = (productsData || []) as T.Product[];
  const productByName = new Map(products.map(p => [p.name, p]));
  const productById = new Map(products.map(p => [p.id, p]));

  // 2. Bulk Update deliveries
  // Guard the auto_marked column so a sync still succeeds before the migration is applied.
  const autoEntry = await isAutoEntrySupported();

  const dbUpdates = changedDeliveries.map(d => {
    // Calculate total cost
    const mainProd = productById.get(d.product_id || "");
    const mainPrice = mainProd ? mainProd.price : 0;
    let total = (d.milk_qty || 0) * mainPrice;

    (d.misc_items || []).forEach((item: any) => {
      const p = productByName.get(item.name);
      if (p) total += (item.qty || 0) * p.price;
    });

    const initial = initialDeliveries.find(sd => sd.id === d.id);

    const row: any = {
      id: d.id,
      customer_id: d.customer_id,
      franchise_id: d.franchise_id,
      delivery_date: d.delivery_date,
      shift: d.shift,
      product_id: d.product_id,
      milk_qty: d.milk_qty,
      misc_items: d.misc_items,
      delivered: d.delivered,
      sequence_no: d.sequence_no,
      // Bookkeeping only. The live deduct/restore helpers that read this flag are dead code;
      // actual stock movement is driven by the delivered-transition cases below. Kept accurate
      // anyway so reviving those helpers later wouldn't corrupt stock.
      inventory_deducted: d.delivered,
      billed: d.billed,
      total_cost: total
    };

    if (autoEntry) {
      // Drop the "auto" badge only when the driver actually flipped the delivered state.
      // Quantity-only edits keep it, so the badge keeps meaning "not yet confirmed by hand".
      row.auto_marked = initial && initial.delivered !== d.delivered ? false : (d.auto_marked ?? false);
    }

    return row;
  });

  const { error: upsertError } = await supabase
    .from('deliveries')
    .upsert(dbUpdates);

  if (upsertError) {
    throw upsertError;
  }

  // ── Supplementary billing for already-billed deliveries that gained extra items ──
  // If a delivery was already billed (billed=true) and the new total_cost > old total_cost,
  // create a Spot bill for the difference so the extra amount is captured in the ledger.
  const supplementaryBills: any[] = [];
  for (const d of changedDeliveries) {
    const initial = initialDeliveries.find(sd => sd.id === d.id);
    if (!initial) continue;

    // Only care about deliveries that were already billed before this sync
    if (!initial.billed) continue;
    // Only care if delivery stays delivered (not being un-delivered)
    if (!d.delivered) continue;

    // Recalculate new total cost using current product prices
    const mainProd = productById.get(d.product_id || "");
    const mainPrice = mainProd ? mainProd.price : 0;
    let newTotal = (d.milk_qty || 0) * mainPrice;
    (d.misc_items || []).forEach((item: any) => {
      const p = productByName.get(item.name);
      if (p) newTotal += (item.qty || 0) * p.price;
    });

    // Old total cost (what was already billed)
    const oldTotal = Number(initial.total_cost) || 0;
    const diff = newTotal - oldTotal;

    if (diff > 0.001) {
      // Extra items were added — charge the difference
      supplementaryBills.push({
        customer_id: d.customer_id,
        franchise_id: d.franchise_id,
        type: 'Spot',
        amount: Math.round(diff * 100) / 100,
        status: 'Pending',
        notes: `Supplementary charge for extra items added after billing`,
        created_at: new Date().toISOString()
      });
    }
  }

  if (supplementaryBills.length > 0) {
    const { error: billError } = await supabase.from('bills').insert(supplementaryBills);
    if (billError) {
      console.error('[Sync] ⚠️ Failed to create supplementary bills:', billError);
    } else {
      console.log(`[Sync] ✅ Created ${supplementaryBills.length} supplementary bill(s) for extra items.`);
    }
  }

  // Calculate net changes for each product ID
  // Positive delta: ADD back to stock (restoring undelivered)
  // Negative delta: SUBTRACT from stock (delivering)
  const stockDeltas = new Map<string, number>();

  const adjustDelta = (productId: string, amount: number) => {
    if (!productId) return;
    const current = stockDeltas.get(productId) || 0;
    stockDeltas.set(productId, current + amount);
  };

  for (const d of changedDeliveries) {
    const initial = initialDeliveries.find(sd => sd.id === d.id);
    if (!initial) continue;

    const getExtrasRecord = (miscItems: any[]): Record<string, number> => {
      const record: Record<string, number> = {};
      (miscItems || []).forEach(item => {
        if (item.name && item.qty != null) {
          record[item.name] = item.qty;
        }
      });
      return record;
    };

    const initialExtras = getExtrasRecord(initial.misc_items);
    const currentExtras = getExtrasRecord(d.misc_items);

    // Case 1: Toggled Undelivered -> Delivered
    if (!initial.delivered && d.delivered) {
      if (d.product_id) {
        adjustDelta(d.product_id, -d.milk_qty);
      }
      for (const [name, qty] of Object.entries(currentExtras)) {
        const prod = productByName.get(name);
        if (prod) {
          adjustDelta(prod.id, -qty);
        }
      }
    }
    // Case 2: Toggled Delivered -> Undelivered
    else if (initial.delivered && !d.delivered) {
      if (initial.product_id) {
        adjustDelta(initial.product_id, initial.milk_qty);
      }
      for (const [name, qty] of Object.entries(initialExtras)) {
        const prod = productByName.get(name);
        if (prod) {
          adjustDelta(prod.id, qty);
        }
      }
    }
    // Case 3: Remains Delivered, but internal changes
    else if (initial.delivered && d.delivered) {
      if (initial.product_id === d.product_id) {
        const milkDelta = initial.milk_qty - d.milk_qty;
        if (d.product_id) {
          adjustDelta(d.product_id, milkDelta);
        }
      } else {
        if (initial.product_id) {
          adjustDelta(initial.product_id, initial.milk_qty);
        }
        if (d.product_id) {
          adjustDelta(d.product_id, -d.milk_qty);
        }
      }

      const allExtraNames = new Set([
        ...Object.keys(initialExtras),
        ...Object.keys(currentExtras)
      ]);
      for (const name of allExtraNames) {
        const initQty = initialExtras[name] || 0;
        const curQty = currentExtras[name] || 0;
        const diff = initQty - curQty;
        if (diff !== 0) {
          const prod = productByName.get(name);
          if (prod) {
            adjustDelta(prod.id, diff);
          }
        }
      }
    }
  }

  // 3. Commit the stock updates to products and inventory
  for (const [productId, delta] of stockDeltas.entries()) {
    if (delta === 0) continue;

    const prod = productById.get(productId);
    if (!prod) continue;

    const newStock = Math.max(0, (prod.stock || 0) + delta);

    const { error: prodError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId);

    if (prodError) {
      console.error(`[Sync] Error updating product stock for ${prod.name}:`, prodError);
    }
    // NOTE: Do NOT update inventory.loaded here — loaded is a static snapshot until shift close
  }

  console.log(`[Sync] ✅ Successfully synchronized ${changedDeliveries.length} delivery records and updated inventory stock.`);
}

