
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

function todayLabel(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parsePrice(priceStr: string | number | null | undefined): number {
  if (!priceStr) return 0;
  if (typeof priceStr === 'number') return priceStr;
  return parseInt(priceStr.replace(/\D/g, ""), 10) || 0;
}

// ─────────────────────────────────────────────
// 1. DAILY ROUTE RESET
// ─────────────────────────────────────────────

export async function resetDailyRoute(): Promise<{ ran: boolean; message: string }> {
  const today = todayStr();

  try {
    // 1. Check automation settings
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'automation')
      .single();

    const settings = settingsData as { value: T.AutomationSettings } | null;
    const lastReset = settings?.value?.lastRouteReset;

    if (lastReset === today) {
      return { ran: false, message: `Route already initialized for ${today}` };
    }

    // 2. Initialize deliveries for the day
    // Get all active customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('status', 'Active');

    if (customers && customers.length > 0) {
      const deliveriesToCreate = customers.map((c: any) => ({
        customer_id: c.id,
        delivery_date: today,
        shift: c.frequency === 'Evening Only' ? 'evening' : 'morning',
        milk_qty: c.default_qty || 1,
        sequence_no: c.route_sl_no || 0,
        delivered: false,
        inventory_deducted: false,
        misc_items: []
      }));

      const { error: insertError } = await supabase.from('deliveries').insert(deliveriesToCreate);
      if (insertError) throw insertError;
    }

    // 3. Update lastReset timestamp
    const newValue = { ...(settings?.value || {}), lastRouteReset: today };
    await supabase.from('system_settings').upsert({ key: 'automation', value: newValue });

    console.log(`[Automation] ✅ Route initialized for ${today}`);
    return { ran: true, message: `Route initialized for ${today} completed.` };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error("[Automation] ❌ Route initialization failed:", errorMsg);
    return { ran: false, message: `Initialization failed: ${errorMsg}` };
  }
}

// ─────────────────────────────────────────────
// 2. INVENTORY AUTO-DEDUCTION
// ─────────────────────────────────────────────

export async function deductInventoryOnDelivery(
  stopId: string,
  milkQty: number,
  miscProducts: Record<string, number> = {}
): Promise<void> {
  try {
    // 1. Check if already deducted
    const { data: stopData } = await supabase
      .from('deliveries')
      .select('inventory_deducted')
      .eq('id', stopId)
      .single();

    const stop = stopData as T.Delivery | null;
    if (stop?.inventory_deducted) return;

    // 2. Deduct Milk from inventory
    const { data: inventoryData } = await supabase.from('inventory').select('*');
    const inventory = inventoryData as T.InventoryItem[] | null;
    if (inventory) {
      const milkItem = inventory.find(i => i.name.toLowerCase().includes('milk'));
      if (milkItem && milkQty > 0) {
        await supabase
          .from('inventory')
          .update({
            count: Math.max(0, (milkItem.count || 0) - milkQty),
            loaded: Math.max(0, (milkItem.loaded || 0) - milkQty),
          })
          .eq('id', milkItem.id);
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
// 3. AUTO BILL GENERATION
// ─────────────────────────────────────────────

export async function generateDailyBills(): Promise<{ ran: boolean; count: number; message: string }> {
  const today = todayStr();

  try {
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'automation')
      .single();

    const settings = settingsData as { value: T.AutomationSettings } | null;
    const lastBillGen = settings?.value?.lastBillGeneration;
    if (lastBillGen === today) {
      return { ran: false, count: 0, message: `Bills already generated for ${today}` };
    }

    const { data: deliveryData } = await supabase
      .from('deliveries')
      .select('*, customer:customers(*)')
      .eq('delivered', true)
      .eq('delivery_date', today);

    const completedDeliveries = deliveryData as (T.Delivery & { customer: T.Customer })[] | null;

    if (!completedDeliveries || completedDeliveries.length === 0) {
      return { ran: false, count: 0, message: "No completed deliveries found for today." };
    }

    const { data: productsData } = await supabase.from('products').select('*');
    const productsList = productsData as T.Product[] | null;
    const prices: Record<string, number> = {};
    productsList?.forEach(p => prices[p.name] = p.price);

    const milkItemName = Object.keys(prices).find(n => n.toLowerCase().includes("milk")) || "";
    const milkPrice = prices[milkItemName] || 50;

    const billsToCreate = completedDeliveries.map(delivery => {
      const qty = delivery.milk_qty || 0;
      let totalAmount = qty * milkPrice;
      const miscItems = delivery.misc_items || [];

      miscItems.forEach((item: any) => {
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
// 4. MASTER RUNNER
// ─────────────────────────────────────────────

export async function checkAndRunAutomations(): Promise<void> {
  console.log("[Automation] 🚀 Running daily checks (Supabase)...");
  await resetDailyRoute();
  const hour = new Date().getHours();
  if (hour >= 18) {
    await generateDailyBills();
  }
}
