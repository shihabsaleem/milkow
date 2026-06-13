import { supabase } from "@/lib/supabase";

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
      { data: unbilledDeliveries },
      { data: freshFinancials }
   ] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).single(),
      supabase.from('deliveries').select('*').eq('customer_id', customerId).eq('delivered', true).eq('billed', false),
      supabase.from('customer_financials').select('*').eq('id', customerId).single()
   ]);

   if (!customer) throw new Error("Customer not found");

   const pastOutstanding = Number(customer.past_outstanding) || 0;
   const unbilledAmount = (unbilledDeliveries || []).reduce((acc: number, d: any) => acc + (Number(d.total_cost) || 0), 0);

   if (pastOutstanding > 0) {
      await supabase.from('bills').insert({
         customer_id: customerId,
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
      amount: totalOwed,
      method: methodVal as any,
      payment_date: new Date().toISOString(),
      notes: notesVal
   });
}
