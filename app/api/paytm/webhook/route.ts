import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// @ts-expect-error - `paytmchecksum` ships no type declarations; checksum is verified at runtime.
import PaytmChecksum from 'paytmchecksum';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    const paytmChecksum = body.CHECKSUMHASH;
    delete body.CHECKSUMHASH;

    if (!body.ORDERID) {
      return NextResponse.json({ error: 'Missing ORDERID' }, { status: 400 });
    }

    // Extract bill ID from ORDERID (Format: BILL_<billId>_<timestamp>)
    const parts = body.ORDERID.split('_');
    const billId = parts[1];

    if (!billId) {
      return NextResponse.json({ error: 'Invalid ORDERID format' }, { status: 400 });
    }

    // 1. Fetch the bill to get the franchise_id
    const { data: bill } = await supabase
      .from('bills')
      .select('id, franchise_id, status')
      .eq('id', billId)
      .maybeSingle();

    if (!bill) {
      // Could be a spot bill or not found
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // 2. Fetch Paytm credentials for this franchise to verify checksum
    const { data: paytmSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'paytm')
      .eq('franchise_id', bill.franchise_id)
      .maybeSingle();

    if (!paytmSettings || !paytmSettings.value?.enabled) {
      return NextResponse.json({ error: 'Paytm not enabled for this franchise' }, { status: 400 });
    }

    const { merchant_key } = paytmSettings.value;

    // 3. Verify Checksum
    const isVerifySignature = PaytmChecksum.verifySignature(body, merchant_key, paytmChecksum);
    
    if (!isVerifySignature) {
      return NextResponse.json({ error: 'Checksum verification failed' }, { status: 400 });
    }

    // 4. Update Bill Status if payment successful
    if (body.STATUS === 'TXN_SUCCESS') {
      if (bill.status !== 'Paid') {
        await supabase
          .from('bills')
          .update({ status: 'Paid' })
          .eq('id', billId);
          
        // Log the payment
        await supabase
          .from('payments')
          .insert({
            customer_id: body.CUST_ID || '00000000-0000-0000-0000-000000000000',
            franchise_id: bill.franchise_id,
            bill_id: billId,
            amount: parseFloat(body.TXNAMOUNT),
            method: 'UPI',
            notes: `Paytm TXN: ${body.TXNID}`,
          });
      }
    }

    return NextResponse.json({ success: true, status: body.STATUS });

  } catch (error: any) {
    console.error('Paytm Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
