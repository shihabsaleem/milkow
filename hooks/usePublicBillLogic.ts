import { useState } from "react";
import { getPublicBill } from "@/app/bill/actions";

export interface BillData {
  customer_name: string;
  phone: string;
  area_name: string;
  current_balance: number;
  upi_id: string;
  payee_name: string;
  currency_code: string;
}

export function usePublicBillLogic() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [billData, setBillData] = useState<BillData | null>(null);
  const [copied, setCopied] = useState(false);

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
        setBillData(res.data as BillData);
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
    if (!billData) return;
    navigator.clipboard.writeText(billData.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareBillLink = async () => {
    if (!billData) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `Hi, view your latest milk bill outstanding balance of ₹${billData.current_balance.toFixed(2)} on Milkow.`;

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
    if (!billData) return "";
    const { upi_id, payee_name, currency_code } = billData;
    return `upi://pay?pa=${upi_id}&pn=${encodeURIComponent(payee_name)}&am=${billData.current_balance.toFixed(2)}&cu=${currency_code}`;
  };

  return {
    phone,
    isLoading,
    error,
    billData,
    copied,
    handlePhoneChange,
    handleSearch,
    handleReset,
    copyUpiId,
    shareBillLink,
    getUpiLink
  };
}
