
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
      return { ran: false, message: `Route already reset for ${today}` };
    }

    // 2. Reset active_route
    const { error: resetError } = await supabase
      .from('active_route')
      .update({
        delivered: false,
        extras: {},
        inventory_deducted: false
      })
      .neq('id', 0); // Update all

    if (resetError) throw resetError;

    // 3. Update lastReset timestamp
    const newValue = { ...(settings?.value || {}), lastRouteReset: today };
    await supabase.from('system_settings').update({ value: newValue }).eq('key', 'automation');

    console.log(`[Automation] ✅ Route reset for ${today}`);
    return { ran: true, message: `Route reset for ${today} completed.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Automation] ❌ Route reset failed:", message);
    return { ran: false, message: `Reset failed: ${message}` };
  }
}

// ─────────────────────────────────────────────
// 2. INVENTORY AUTO-DEDUCTION
// ─────────────────────────────────────────────

export async function deductInventoryOnDelivery(
  stopId: number,
  qty: string,
  miscProducts: Record<string, number> = {}
): Promise<void> {
  try {
    // 1. Check if already deducted
    const { data: stopData } = await supabase
      .from('active_route')
      .select('inventory_deducted')
      .eq('id', stopId)
      .single();

    const stop = stopData as T.ActiveRouteStop | null;
    if (stop?.inventory_deducted) return;

    const milkBottles = parseInt(qty, 10) || 0;

    // 2. Deduct Milk from inventory
    const { data: inventoryData } = await supabase.from('inventory').select('*');
    const inventory = inventoryData as T.InventoryItem[] | null;
    if (inventory) {
      const milkItem = inventory.find(i => i.name.toLowerCase().includes('milk'));
      if (milkItem && milkBottles > 0) {
        await supabase
          .from('inventory')
          .update({
            count: Math.max(0, (milkItem.count || 0) - milkBottles),
            loaded: Math.max(0, (milkItem.loaded || 0) - milkBottles),
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
    await supabase.from('active_route').update({ inventory_deducted: true }).eq('id', stopId);

    console.log(`[Automation] ✅ Inventory deducted for stop #${stopId}`);
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

    const { data: stopData } = await supabase
      .from('active_route')
      .select('*')
      .eq('delivered', true);

    const completedStops = stopData as T.ActiveRouteStop[] | null;

    if (!completedStops || completedStops.length === 0) {
      return { ran: false, count: 0, message: "No completed deliveries found." };
    }

    const { data: productsData } = await supabase.from('products').select('*');
    const products = productsData as T.Product[] | null;
    const prices: Record<string, number> = {};
    products?.forEach(p => prices[p.name] = parsePrice(p.price));

    const milkItemName = Object.keys(prices).find(n => n.toLowerCase().includes("milk")) || "";
    const milkPrice = prices[milkItemName] || 50;

    const billsToCreate: T.Bill[] = completedStops.map(stop => {
      const qty = parseInt(stop.qty, 10) || 0;
      let totalAmount = qty * milkPrice;
      const extras = stop.extras || {};
      const extraDetails: string[] = [];

      Object.entries(extras).forEach(([name, count]) => {
        const itemPrice = prices[name] || 0;
        const itemTotal = (count as number) * itemPrice;
        totalAmount += itemTotal;
        if (itemTotal > 0) extraDetails.push(`${count}x ${name}`);
      });

      const billId = `BILL-${today.replace(/-/g, "")}-${stop.id}`;
      return {
        id: billId,
        customer_name: stop.name,
        phone: stop.phone,
        type: "Daily",
        amount: totalAmount,
        status: "Pending",
        date: today,
        date_label: todayLabel(),
        qty: qty,
        details: extraDetails.length > 0 ? `Extras: ${extraDetails.join(", ")}` : "Regular Delivery",
        auto_generated: true,
      };
    });

    // Batch insert bills
    await supabase.from('bills').upsert(billsToCreate);

    // Update timestamp
    const newValue = { ...(settings?.value || {}), lastBillGeneration: today };
    await supabase.from('system_settings').update({ value: newValue }).eq('key', 'automation');

    return { ran: true, count: billsToCreate.length, message: `Generated ${billsToCreate.length} bills.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Automation] ❌ Bill generation failed:", message);
    return { ran: false, count: 0, message: `Bill generation failed: ${message}` };
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
