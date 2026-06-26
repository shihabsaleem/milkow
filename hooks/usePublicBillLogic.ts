import { useState, useEffect } from "react";
import config from "@/config.json";
import { getPublicBill, FullLedgerResponse } from "@/app/bill/actions";
import * as T from "@/types/database";

export function usePublicBillLogic(initialPhone?: string) {
  const [phone, setPhone] = useState(initialPhone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [billData, setBillData] = useState<FullLedgerResponse | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Auto-fetch if initialPhone is provided
  useEffect(() => {
    if (initialPhone && initialPhone.length >= 10) {
      const fetchInitial = async () => {
        setIsLoading(true);
        setError("");
        try {
          const res = await getPublicBill(initialPhone);
          if (res.error) {
            setError(res.error);
            setBillData(null);
          } else if (res.success && res.data) {
            setBillData(res.data);
          }
        } catch (err) {
          setError("Failed to fetch bill details. Please check your connection.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitial();
    }
  }, [initialPhone]);

  // View options
  const [viewDate, setViewDate] = useState(new Date());

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 10) {
      setPhone(val);
      setError("");
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await getPublicBill(phone);
      if (res.error) {
        setError(res.error);
        setBillData(null);
      } else if (res.success && res.data) {
        setBillData(res.data);
      }
    } catch (err) {
      setError("Failed to fetch bill details. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setBillData(null);
    setPhone("");
    setError("");
  };

  const copyUpiId = () => {
    if (!billData || !billData.settings?.payment) return;
    navigator.clipboard.writeText(billData.settings.payment.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareBillLink = async () => {
    if (!billData) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/bill/${billData.customer.phone}` : "";
    const balance = billData.financials.current_balance;
    const text = `Hi, view your latest milk bill outstanding balance of ₹${balance.toFixed(2)} on Milkow.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Milkow Public Bill",
          text,
          url,
        });
      } else {
        await navigator.clipboard.writeText(`${text} Link: ${url}`);
        alert("Bill details copied to clipboard!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getUpiLink = () => {
    if (!billData || !billData.settings?.payment) return "";
    const payment = billData.settings.payment;
    const balance = billData.financials.current_balance;
    return `upi://pay?pa=${payment.upi_id}&pn=${encodeURIComponent(payment.payee_name)}`/*&am=${balance.toFixed(2)}&cu=${payment.currency_code}&aid=${config.aid}*/;
  };

  // Helper functions for Ledger View
  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const calculateDeliveryTotal = (d: T.Delivery & { total_cost?: number }) => {
    if (d.total_cost != null && d.total_cost > 0) return Number(d.total_cost);

    if (!billData) return 0;

    // We recreate the price map from the fetched products
    const prices: Record<string, number> = {};
    billData.products.forEach(p => prices[p.name] = Number(p.price));
    const milkPrice = prices[Object.keys(prices).find(n => n.toLowerCase().includes('milk')) || ''] || 50;

    const product = billData.products.find(p => p.id === d.product_id);
    const basePrice = product ? Number(product.price) : milkPrice;

    let total = (Number(d.milk_qty) || 0) * basePrice;
    const extras = (d.misc_items as any[]) || [];
    extras.forEach((item: any) => {
      const itemPrice = prices[item.name] || 0;
      total += (item.qty || 0) * itemPrice;
    });
    return total;
  };

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const yearName = viewDate.getFullYear();

  // Month filtering logic
  const filteredDeliveries = billData?.deliveries?.filter(d => {
    const dDate = new Date(d.delivery_date);
    return dDate.getMonth() === viewDate.getMonth() && dDate.getFullYear() === viewDate.getFullYear();
  }) || [];

  return {
    phone,
    isLoading,
    error,
    billData,
    copied,
    viewDate,
    monthName,
    yearName,
    filteredDeliveries,
    handlePhoneChange,
    handleSearch,
    handleReset,
    copyUpiId,
    shareBillLink,
    getUpiLink,
    changeMonth,
    calculateDeliveryTotal
  };
}
