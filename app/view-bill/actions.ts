"use server";

import { supabase } from "@/lib/supabase";
import type { CustomerBill } from "@/types/supabase";

export async function getPublicBill(phone: string): Promise<{ success?: boolean; data?: CustomerBill; error?: string }> {
  const sanitizedPhone = phone.trim();
  
  // Basic validation: ensure digits only and suitable length
  const digitsOnly = sanitizedPhone.replace(/\D/g, "");
  if (!digitsOnly || digitsOnly.length < 10) {
    return { error: "Please enter a valid 10-digit mobile number." };
  }

  try {
    // Invoke the PostgreSQL security definer RPC function in Supabase
    const { data, error } = await supabase.rpc("get_customer_bill_by_phone", {
      phone_input: digitsOnly,
    });

    if (error) {
      console.error("RPC Error:", error);
      return { error: "An error occurred while fetching your bill. Please try again." };
    }

    if (!data || data.length === 0) {
      return { error: "No customer found with this phone number. Please verify the digits or contact the administrator." };
    }

    // Since RPC returns a list of rows, we grab the first matching result
    const bill = data[0];

    return {
      success: true,
      data: {
        customer_name: bill.customer_name,
        phone: bill.phone,
        area_name: bill.area_name,
        current_balance: Number(bill.current_balance),
        upi_id: bill.upi_id,
        payee_name: bill.payee_name,
        currency_code: bill.currency_code,
      },
    };
  } catch (error) {
    console.error("Public bill retrieval failed:", error);
    return { error: "Failed to connect to the database. Please try again later." };
  }
}
