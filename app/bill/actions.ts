"use server";

import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";

export type FullLedgerResponse = {
  customer: T.Customer & { area_name: string };
  financials: T.CustomerFinancials;
  settings: { payment?: T.PaymentSetup };
  bills: T.Bill[];
  deliveries: T.Delivery[];
  unbilled: T.Delivery[];
  payments: T.Payment[];
  products: T.Product[];
};

export async function getPublicBill(phone: string): Promise<{ success?: boolean; data?: FullLedgerResponse; error?: string }> {
  const sanitizedPhone = phone.trim();
  
  const digitsOnly = sanitizedPhone.replace(/\D/g, "");
  if (!digitsOnly || digitsOnly.length < 10) {
    return { error: "Please enter a valid 10-digit mobile number." };
  }

  try {
    const { data, error } = await supabase.rpc("get_full_customer_ledger_by_phone", {
      phone_input: digitsOnly,
    });

    if (error) {
      console.error("RPC Error:", error);
      return { error: "An error occurred while fetching your bill. Please try again." };
    }

    if (!data) {
      return { error: "No customer found with this phone number. Please verify the digits or contact the administrator." };
    }

    const typedData = data as FullLedgerResponse & { paytmSettings?: any };

    // Fetch Paytm settings to see if we should generate dynamic QR
    if (typedData.customer?.franchise_id) {
      const { data: paytmData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'paytm')
        .eq('franchise_id', typedData.customer.franchise_id)
        .maybeSingle();

      if (paytmData) {
        typedData.paytmSettings = paytmData.value;
      }
    }

    return {
      success: true,
      data: typedData,
    };
  } catch (error) {
    console.error("Public bill retrieval failed:", error);
    return { error: "Failed to connect to the database. Please try again later." };
  }
}
