import { supabase } from "@/lib/supabase";

/**
 * Records a return/refund for a customer.
 * Creates a negative-amount bill (credit note) so that the customer's
 * balance reflects the credit. If balance was 0 after full payment,
 * it will go negative (advance) by the returned amount.
 *
 * @param customerId - The customer's UUID
 * @param returnAmount - The value of the returned item(s) (positive number)
 * @param notes - Description of what was returned e.g. "Returned 1 Curd"
 */
export async function recordReturn(customerId: string, returnAmount: number, notes: string) {
   if (returnAmount <= 0) throw new Error("Return amount must be positive");

   const { data: customer } = await supabase.from('customers').select('franchise_id').eq('id', customerId).single();

   // Insert a credit note bill with negative amount
   const { error } = await supabase.from('bills').insert({
      customer_id: customerId,
      franchise_id: customer?.franchise_id,
      amount: -Math.abs(returnAmount),
      type: 'Spot',
      status: 'Paid',                       // treat as already settled — it's a credit
      notes: notes || 'Return / Refund',
      created_at: new Date().toISOString()
   });

   if (error) throw error;
}

export async function fetchCustomerBalance(customerId: string): Promise<number> {
   const { data, error } = await supabase.from('customer_financials').select('current_balance').eq('id', customerId).single();
   if (error) {
      console.error("Error fetching balance:", error);
      return 0;
   }
   return Number(data?.current_balance) || 0;
}

export async function recordPayment(customerId: string, amountVal: number, methodVal: string, notesVal: string) {
   const [
      { data: customer },
      { data: unbilledDeliveries }
   ] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).single(),
      supabase.from('deliveries').select('*').eq('customer_id', customerId).eq('delivered', true).eq('billed', false)
   ]);

   if (!customer) throw new Error("Customer not found");

   const pastOutstanding = Number(customer.past_outstanding) || 0;
   const unbilledAmount = (unbilledDeliveries || []).reduce((acc: number, d: any) => acc + (Number(d.total_cost) || 0), 0);

   if (pastOutstanding > 0) {
      await supabase.from('bills').insert({
         customer_id: customerId,
         franchise_id: customer.franchise_id,
         amount: pastOutstanding,
         type: 'Opening Balance',
         status: 'Pending',
         notes: 'Converted for settlement',
         created_at: new Date().toISOString()
      });
      await supabase.from('customers').update({ past_outstanding: 0 }).eq('id', customerId);
   }

   if (unbilledDeliveries && unbilledDeliveries.length > 0 && unbilledAmount > 0) {
      await supabase.from('bills').insert({
         customer_id: customerId,
         franchise_id: customer.franchise_id,
         amount: unbilledAmount,
         type: 'Spot',
         status: 'Pending',
         created_at: new Date().toISOString()
      });
      const ids = unbilledDeliveries.map((d: any) => d.id);
      await supabase.from('deliveries').update({ billed: true }).in('id', ids);
   }

   await supabase.from('payments').insert({
      customer_id: customerId,
      franchise_id: customer.franchise_id,
      amount: amountVal,
      method: methodVal as any,
      payment_date: new Date().toISOString(),
      notes: notesVal
   });
}

export async function settleAllDues(customerId: string, methodVal: string = 'Cash', notesVal: string = 'Full Settlement') {
   const [
      { data: customer },
      { data: unbilledDeliveries },
      { data: freshFinancials }
   ] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).single(),
      supabase.from('deliveries').select('*').eq('customer_id', customerId).eq('delivered', true).eq('billed', false),
      supabase.from('customer_financials').select('*').eq('id', customerId).single()
   ]);

   if (!customer || !freshFinancials) throw new Error("Customer or financials not found");

   const pastOutstanding = Number(customer.past_outstanding) || 0;
   const unbilledAmount = (unbilledDeliveries || []).reduce((acc: number, d: any) => acc + (Number(d.total_cost) || 0), 0);
   const totalOwed = Number(freshFinancials.current_balance);

   if (totalOwed <= 0) return;

   if (pastOutstanding > 0) {
      await supabase.from('bills').insert({
         customer_id: customerId,
         franchise_id: customer.franchise_id,
         amount: pastOutstanding,
         type: 'Opening Balance',
         status: 'Pending',
         notes: 'Converted for settlement',
         created_at: new Date().toISOString()
      });
      await supabase.from('customers').update({ past_outstanding: 0 }).eq('id', customerId);
   }

   if (unbilledDeliveries && unbilledDeliveries.length > 0 && unbilledAmount > 0) {
      await supabase.from('bills').insert({
         customer_id: customerId,
         franchise_id: customer.franchise_id,
         amount: unbilledAmount,
         type: 'Spot',
         status: 'Pending',
         created_at: new Date().toISOString()
      });
      const ids = unbilledDeliveries.map((d: any) => d.id);
      await supabase.from('deliveries').update({ billed: true }).in('id', ids);
   }

   await supabase.from('bills')
      .update({ status: 'Paid' })
      .eq('customer_id', customerId)
      .eq('status', 'Pending');

   await supabase.from('payments').insert({
      customer_id: customerId,
      franchise_id: customer.franchise_id,
      amount: totalOwed,
      method: methodVal as any,
      payment_date: new Date().toISOString(),
      notes: notesVal
   });
}
