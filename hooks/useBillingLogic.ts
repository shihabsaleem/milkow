import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";
import { recordPayment, settleAllDues } from "@/lib/financials";

export function useBillingLogic(qrRef: React.RefObject<HTMLDivElement | null>) {
   const [bills, setBills] = useState<(T.Bill & { customer: T.Customer })[]>([]);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [routesList, setRoutesList] = useState<T.Area[]>([]);
   const [paymentSettings, setPaymentSettings] = useState<T.PaymentSetup | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [showToast, setShowToast] = useState(false);
   const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: (dontShowAgain?: boolean) => void;
      type: 'danger' | 'info' | 'success';
      confirmText?: string;
      showDontShowAgain?: boolean;
   }>({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => { },
      type: 'info'
   });

   const isSubmitting = useRef(false);

   const fetchData = async (silent = false) => {
      if (!silent) setIsLoading(true);
      const [
         { data: routeSets },
         { data: financialsData },
         { data: productList },
         { data: unbilledData },
         { data: settingsData },
         { data: customersData }
      ] = await Promise.all([
         supabase.from('areas').select('*').order('name', { ascending: true }),
         supabase.from('customer_financials').select('*'),
         supabase.from('products').select('*'),
         supabase.from('deliveries').select('*, customers(*)').eq('delivered', true).eq('billed', false),
         supabase.from('system_settings').select('value').eq('key', 'general').single(),
         supabase.from('customers').select('id, phone')
      ]);

      if (routeSets) setRoutesList(routeSets as T.Area[]);

      const prods = (productList || []) as T.Product[];
      setProducts(prods);
      
      const customersMap = new Map((customersData || []).map((c: any) => [c.id, c]));

      const combinedBills: (T.Bill & { customer: T.Customer })[] = [];
      (financialsData || []).forEach((fin: any) => {
         const grandTotal = fin.current_balance;
         const cDetail = customersMap.get(fin.id) as any;

         if (grandTotal > 0) {
            combinedBills.push({
               id: `TOTAL-${fin.id.slice(0, 8)}`,
               customer_id: fin.id,
               amount: grandTotal,
               type: 'Ledger' as any,
               status: 'Pending',
               created_at: new Date().toISOString(),
               customer: {
                  id: fin.id,
                  name: fin.name,
                  phone: cDetail?.phone || null,
                  area_id: fin.area_id || null
               } as any
            });
         }
      });

      setBills(combinedBills);

      if (settingsData) {
         const general = settingsData.value as { payment?: T.PaymentSetup };
         if (general?.payment) setPaymentSettings(general.payment);
      }
      if (!silent) setIsLoading(false);
   };

   useEffect(() => {
      fetchData();

      const sub = supabase.channel('bills_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => fetchData(true))
         .on('postgres_changes', { event: '*', table: 'payments' }, () => fetchData(true))
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, []);

   const runMarkAsPaid = async (id: string, setSelectedInvoice: (val: null) => void) => {
      if (isLoading || isSubmitting.current) return;
      isSubmitting.current = true;
      try {
         setIsLoading(true);
         const entry = bills.find(b => b.id === id);
         if (!entry) {
            isSubmitting.current = false;
            setIsLoading(false);
            return;
         }

         await settleAllDues(entry.customer_id, 'Cash', 'Full Settlement from Billing');

         setShowToast(true);
         setTimeout(() => setShowToast(false), 3000);
         await fetchData(true);
      } catch (err) {
         console.error("Failed to mark as paid:", err);
      } finally {
         isSubmitting.current = false;
         setIsLoading(false);
      }
      setSelectedInvoice(null);
   };

   const handleMarkAsPaid = (id: string, setSelectedInvoice: (val: null) => void) => {
      const skip = localStorage.getItem('skip_billing_confirm') === 'true';
      if (skip) {
         runMarkAsPaid(id, setSelectedInvoice);
         return;
      }

      const entry = bills.find(b => b.id === id);
      if (!entry) return;

      setModalConfig({
         isOpen: true,
         title: "Confirm Payment",
         message: `Mark the full balance of ₹${Number(entry.amount).toFixed(2)} for ${entry.customer?.name} as paid in cash?`,
         type: 'success',
         confirmText: "Yes, Mark Paid",
         showDontShowAgain: true,
         onConfirm: (dontShow) => {
            if (dontShow) localStorage.setItem('skip_billing_confirm', 'true');
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            runMarkAsPaid(id, setSelectedInvoice);
         }
      });
   };

   const getPaymentCardFile = async (invoice: T.Bill & { customer: T.Customer }) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, "#050044");
      bgGradient.addColorStop(1, "#020024");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(width * 0.9, height * 0.1, 500, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(width * 0.1, height * 0.9, 400, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1.0;

      const cardX = 80;
      const cardY = 120;
      const cardW = width - 160;
      const cardH = 1600;
      const radius = 80;

      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 30;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fill();
      ctx.shadowColor = "transparent";

      const logo = new Image();
      logo.src = "/assets/logo.svg";
      await new Promise((resolve) => { logo.onload = resolve; logo.onerror = resolve; });
      if (logo.complete && logo.naturalWidth > 0) {
         const logoWidth = 260;
         const logoHeight = logo.naturalHeight * (logoWidth / logo.naturalWidth);
         ctx.drawImage(logo, (width / 2) - (logoWidth / 2), cardY + 80, logoWidth, logoHeight);
      }

      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 36px Geist, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TOTAL PAYABLE", width / 2, cardY + 300);

      ctx.fillStyle = "#050044";
      ctx.font = "900 120px Geist, Inter, sans-serif";
      const formattedAmount = `₹${Number(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      ctx.fillText(formattedAmount, width / 2, cardY + 440);

      ctx.strokeStyle = "#F1F5F9";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cardX + 100, cardY + 540);
      ctx.lineTo(cardX + cardW - 100, cardY + 540);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 30px Geist, Inter, sans-serif";
      ctx.fillText("BILL TO", cardX + 100, cardY + 620);

      ctx.fillStyle = "#1E293B";
      ctx.font = "900 50px Geist, Inter, sans-serif";
      ctx.fillText(invoice.customer?.name || "Customer", cardX + 100, cardY + 695);

      const phone = invoice.customer?.phone || "";
      const routeId = invoice.customer?.area_id;
      const routeName = routesList.find(r => r.id === routeId)?.name || "";

      let detailsText = "";
      if (phone && routeName) {
         detailsText = `${phone}   ·   ${routeName}`;
      } else {
         detailsText = phone || routeName || "";
      }

      if (detailsText) {
         ctx.fillStyle = "#64748B";
         ctx.font = "600 32px Geist, Inter, sans-serif";
         ctx.fillText(detailsText, cardX + 100, cardY + 760);
      }

      const qrSize = 540;
      const qrX = (width / 2) - (qrSize / 2);
      const qrY = cardY + 840;

      ctx.fillStyle = "#F8FAFC";
      ctx.beginPath();
      ctx.roundRect(qrX - 40, qrY - 40, qrSize + 80, qrSize + 80, 60);
      ctx.fill();

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 2;
      ctx.stroke();

      const uiQrCanvas = qrRef.current?.querySelector("canvas");
      if (uiQrCanvas) {
         ctx.drawImage(uiQrCanvas, qrX, qrY, qrSize, qrSize);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#050044";
      ctx.font = "bold 38px Geist, Inter, sans-serif";
      ctx.fillText("Scan with any UPI App", width / 2, cardY + 1475);

      if (paymentSettings?.upi_id) {
         ctx.fillStyle = "#64748B";
         ctx.font = "600 30px Geist, Inter, sans-serif";
         ctx.fillText(`UPI ID: ${paymentSettings.upi_id}`, width / 2, cardY + 1535);
      }

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "bold 32px Geist, Inter, sans-serif";
      ctx.fillText("Fresh Milk, Delivered with Love.", width / 2, 1860);

      const dataUrl = canvas.toDataURL("image/png", 0.95);
      const blob = await (await fetch(dataUrl)).blob();
      return new File([blob], `Milkow_Bill_${invoice.customer?.name}.png`, { type: "image/png" });
   };

   const handleShareCard = async (selectedInvoice: (T.Bill & { customer: T.Customer }) | null) => {
      if (!selectedInvoice) return;
      try {
         const file = await getPaymentCardFile(selectedInvoice);
         if (!file) return;
         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Payment Card for ${selectedInvoice.customer?.name}`, text: `Hi ${selectedInvoice.customer?.name}, your payment card is ready.` });
         } else {
            const dataUrl = URL.createObjectURL(file);
            const link = document.createElement("a"); link.href = dataUrl; link.download = `Milkow_Card_${selectedInvoice.customer?.name}.png`; link.click();
         }
      } catch (e) { console.error(e); }
   };

   const handleWhatsAppShare = async (invoice: (T.Bill & { customer: T.Customer })) => {
      if (!paymentSettings) return;
      const amount = Number(invoice.amount).toFixed(2);
      const upiLink = `upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(paymentSettings.payee_name)}&am=${invoice.amount}&cu=${paymentSettings.currency_code}`;
      const message = `Hi ${invoice.customer?.name}, your bill for ${invoice.type} is ₹${amount}. You can pay using the attached QR or this link: ${upiLink}`;

      const url = `https://wa.me/+91${invoice.customer?.phone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
   };

   return {
      bills,
      routesList,
      paymentSettings,
      isLoading,
      showToast,
      modalConfig,
      setModalConfig,
      setIsLoading,
      fetchData,
      handleMarkAsPaid,
      handleShareCard,
      handleWhatsAppShare
   };
}
