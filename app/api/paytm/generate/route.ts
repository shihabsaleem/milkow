import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// @ts-ignore
import PaytmChecksum from 'paytmchecksum';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const { amount, customerId, franchiseId, billId } = await req.json();

    if (!amount || !franchiseId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch Paytm credentials for this franchise
    const { data: paytmSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'paytm')
      .eq('franchise_id', franchiseId)
      .maybeSingle();

    if (!paytmSettings || !paytmSettings.value?.enabled) {
      return NextResponse.json({ error: 'Paytm API is not enabled for this franchise' }, { status: 400 });
    }

    const { mid, merchant_key } = paytmSettings.value;
    if (!mid || !merchant_key) {
      return NextResponse.json({ error: 'Invalid Paytm API credentials' }, { status: 400 });
    }

    // 2. Generate a unique Order ID
    const orderId = `BILL_${billId || randomUUID().split('-')[0]}_${Date.now()}`;

    // 3. Prepare Paytm Parameters for Dynamic QR / Initiate Transaction
    const paytmParams: any = {
      body: {
        requestType: "Payment",
        mid: mid,
        websiteName: "DEFAULT",
        orderId: orderId,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/api/paytm/webhook`,
        txnAmount: {
          value: Number(amount).toFixed(2),
          currency: "INR",
        },
        userInfo: {
          custId: customerId || "CUST_001",
        },
      }
    };

    // 4. Generate Checksum
    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), merchant_key);
    paytmParams.head = { signature: checksum };

    // 5. Call Paytm Initiate Transaction API
    // Note: Use staging URL for testing: https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction
    const apiUrl = `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paytmParams),
    });

    const data = await response.json();

    if (data.body?.resultInfo?.resultStatus === 'S') {
      return NextResponse.json({
        success: true,
        txnToken: data.body.txnToken,
        orderId,
        mid,
        amount: paytmParams.body.txnAmount.value
      });
    } else {
      return NextResponse.json({ error: data.body?.resultInfo?.resultMsg || 'Failed to initiate transaction' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Paytm Generate Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
