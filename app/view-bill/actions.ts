"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Use Service Role Key on the server side to bypass RLS
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return { error: "Database configuration is missing. Please contact the administrator." };
    }

    const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    // 1. Fetch customer matching the phone number (matching both raw or numeric-only suffix/prefix)
    // We try exact match first, then fallback to suffix match for flexible user input
    let { data: customer, error: customerError } = await supabaseServer
      .from("customers")
      .select("id, name, phone, area_id")
      .eq("phone", sanitizedPhone)
      .maybeSingle();

    if (!customer && !customerError && sanitizedPhone.length >= 10) {
      const last10Digits = sanitizedPhone.slice(-10);
      const { data: suffixMatch, error: suffixError } = await supabaseServer
        .from("customers")
        .select("id, name, phone, area_id")
        .like("phone", `%${last10Digits}`)
        .maybeSingle();
      
      if (suffixMatch) {
        customer = suffixMatch;
      } else {
        customerError = suffixError;
      }
    }

    if (customerError) {
      console.error("Error fetching customer:", customerError);
      return { error: "An error occurred while searching. Please try again." };
    }

    if (!customer) {
      return { error: "No customer found with this phone number. Please contact the administrator if you believe this is an error." };
    }

    // 2. Fetch financials, area name, and payment settings in parallel
    const [financialsRes, areaRes, settingsRes] = await Promise.all([
      supabaseServer
        .from("customer_financials")
        .select("current_balance")
        .eq("id", customer.id)
        .maybeSingle(),
      customer.area_id
        ? supabaseServer.from("areas").select("name").eq("id", customer.area_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabaseServer
        .from("system_settings")
        .select("value")
        .eq("key", "general")
        .maybeSingle(),
    ]);

    const balance = financialsRes.data ? Number(financialsRes.data.current_balance) : 0;
    const areaName = areaRes.data?.name || "No Area";

    let payment = {
      upi_id: "milkow@ybl",
      payee_name: "Milkow Distributor",
      currency_code: "INR",
    };

    if (settingsRes.data && settingsRes.data.value) {
      const generalSettings = settingsRes.data.value as { payment?: typeof payment };
      if (generalSettings.payment) {
        payment = {
          upi_id: generalSettings.payment.upi_id || payment.upi_id,
          payee_name: generalSettings.payment.payee_name || payment.payee_name,
          currency_code: generalSettings.payment.currency_code || payment.currency_code,
        };
      }
    }

    return {
      success: true,
      data: {
        customerName: customer.name,
        phone: customer.phone,
        areaName,
        balance,
        payment,
      },
    };
  } catch (error) {
    console.error("Public bill retrieval failed:", error);
    return { error: "Failed to connect to the database. Please try again later." };
  }
}
